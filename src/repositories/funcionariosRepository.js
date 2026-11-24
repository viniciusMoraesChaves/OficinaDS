const { pool } = require('../config/database');
const { resumirAvaliacoes } = require('../utils/avaliacoes');

// Notas que os clientes deram ao funcionário (script 30). Sem nenhuma avaliação, os
// totais vêm zerados e a média fica null.
const AVALIACOES_SELECT = `
       COALESCE(av.totalAvaliacoes, 0) AS totalAvaliacoes,
       COALESCE(av.somaNotas, 0) AS somaNotas`;

const AVALIACOES_JOIN = `
     LEFT JOIN (
       SELECT id_funcionario, COUNT(*) AS totalAvaliacoes, SUM(nota) AS somaNotas
       FROM avaliacao_funcionario
       GROUP BY id_funcionario
     ) av ON av.id_funcionario = f.id_funcionario`;

// Troca a soma das notas pela média (calculada em utils/avaliacoes.js).
function comAvaliacao({ somaNotas, totalAvaliacoes, ...funcionario }) {
  const resumo = resumirAvaliacoes(somaNotas, totalAvaliacoes);

  return { ...funcionario, avaliacaoMedia: resumo.media, totalAvaliacoes: resumo.total };
}

function buildWhere({ busca, status }) {
  const conditions = [];
  const params = [];

  if (busca) {
    const like = `%${busca}%`;
    const cpfDigits = busca.replace(/\D/g, '');
    const cpfLike = cpfDigits ? `%${cpfDigits}%` : like;
    conditions.push(`(
      f.nome LIKE ?
      OR f.cpf LIKE ?
      OR f.email LIKE ?
      OR ca.nome LIKE ?
    )`);
    params.push(like, cpfLike, like, like);
  }

  if (status === 'ativos') {
    conditions.push('f.ativo = 1');
  } else if (status === 'inativos') {
    conditions.push('f.ativo = 0');
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

async function search({ busca, status, limite, offset }) {
  const where = buildWhere({ busca, status });

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
     ${where.clause}`,
    where.params
  );

  const [rows] = await pool.execute(
    `SELECT
       f.id_funcionario AS id,
       f.nome,
       f.cpf,
       f.email,
       f.telefone,
       f.data_admissao AS dataAdmissao,
       f.ativo,
       ca.id_cargo AS cargoId,
       ca.nome AS cargo,${AVALIACOES_SELECT}
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo${AVALIACOES_JOIN}
     ${where.clause}
     ORDER BY f.nome ASC, f.id_funcionario ASC
     LIMIT ? OFFSET ?`,
    [...where.params, limite, offset]
  );

  return { rows: rows.map(comAvaliacao), total: countRows[0].total };
}

// Posição (1, 2, 3...) do funcionário na listagem sem filtros. O front usa
// para abrir a página em que o funcionário recém-criado aparece.
async function posicaoNaLista(idFuncionario) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS posicao
     FROM funcionario f
     INNER JOIN funcionario alvo ON alvo.id_funcionario = ?
     WHERE f.nome < alvo.nome
        OR (f.nome = alvo.nome AND f.id_funcionario <= alvo.id_funcionario)`,
    [idFuncionario]
  );

  return Number(rows[0].posicao);
}

async function updateCargoEPerfil(idFuncionario, idCargo, idPerfil) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [funcionarios] = await connection.execute(
      `SELECT id_usuario
       FROM funcionario
       WHERE id_funcionario = ?`,
      [idFuncionario]
    );

    if (funcionarios.length === 0) {
      await connection.rollback();
      return 0;
    }

    const idUsuario = funcionarios[0].id_usuario;

    await connection.execute(
      `UPDATE funcionario
       SET id_cargo = ?
       WHERE id_funcionario = ?`,
      [idCargo, idFuncionario]
    );

    if (idUsuario !== null) {
      await connection.execute(
        `UPDATE usuario
         SET id_perfil = ?
         WHERE id_usuario = ?`,
        [idPerfil, idUsuario]
      );
    }

    await connection.commit();

    return 1;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findByUsuarioId(idUsuario) {
  const [rows] = await pool.execute(
    'SELECT id_funcionario AS id, nome FROM funcionario WHERE id_usuario = ?',
    [idUsuario]
  );
  return rows[0] || null;
}

async function findAtivoById(idFuncionario) {
  const [rows] = await pool.execute(
    `SELECT id_funcionario AS id, nome
     FROM funcionario
     WHERE id_funcionario = ? AND ativo = 1`,
    [idFuncionario]
  );
  return rows[0] || null;
}

async function listarAtivos() {
  const [rows] = await pool.execute(
    `SELECT
       f.id_funcionario AS id,
       f.nome,
       ca.nome AS cargo
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
     WHERE f.ativo = 1
     ORDER BY f.nome ASC`
  );
  return rows;
}

async function findById(idFuncionario) {
  const [rows] = await pool.execute(
    `SELECT
       f.id_funcionario AS id,
       f.nome,
       f.cpf,
       f.email,
       f.telefone,
       DATE_FORMAT(f.data_admissao, '%Y-%m-%d') AS dataAdmissao,
       f.ativo,
       ca.id_cargo AS cargoId,
       ca.nome AS cargo,${AVALIACOES_SELECT}
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo${AVALIACOES_JOIN}
     WHERE f.id_funcionario = ?`,
    [idFuncionario]
  );

  return rows[0] ? comAvaliacao(rows[0]) : null;
}

// Reúne serviços agendados e atendimentos da oficina sem perder o histórico.
// O status em cada item deixa claro o que ainda está atribuído e o que já acabou.
async function listarServicosAtribuidos(idFuncionario) {
  const [rows] = await pool.execute(
    `SELECT * FROM (
       SELECT
         CONCAT('AG-', ag.id_agendamento) AS referencia,
         'Agendamento' AS tipo,
         ag.servico,
         DATE_FORMAT(ag.data_hora, '%Y-%m-%dT%H:%i:%s') AS dataHora,
         ag.status,
         CONCAT(v.marca, ' ', v.modelo, ' • ', v.placa) AS veiculo
       FROM agendamento ag
       INNER JOIN veiculo v ON v.id_veiculo = ag.id_veiculo
       WHERE ag.id_funcionario = ?

       UNION ALL

       SELECT
         CONCAT('AT-', a.id_atendimento) AS referencia,
         'Atendimento' AS tipo,
         COALESCE(NULLIF(os.descricao_problema, ''), CONCAT('Atendimento #', a.id_atendimento)) AS servico,
         DATE_FORMAT(a.criado_em, '%Y-%m-%dT%H:%i:%s') AS dataHora,
         CASE a.status
           WHEN 'aberto' THEN 'Em atendimento'
           WHEN 'concluido' THEN 'Concluído'
           ELSE 'Cancelado'
         END AS status,
         CONCAT(v.marca, ' ', v.modelo, ' • ', v.placa) AS veiculo
       FROM atendimento a
       INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
       LEFT JOIN ordem_servico os ON os.id_atendimento = a.id_atendimento
       WHERE a.id_funcionario = ?
     ) servicos
     ORDER BY
       (status IN ('Agendado', 'Confirmado', 'Em atendimento')) DESC,
       dataHora DESC
     LIMIT 30`,
    [idFuncionario, idFuncionario]
  );

  return rows;
}

async function atualizar({
  idFuncionario,
  nome,
  cpf,
  email,
  telefone,
  dataAdmissao,
  idCargo,
  idPerfil,
  ativo
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [funcionarios] = await connection.execute(
      `SELECT id_usuario AS idUsuario
       FROM funcionario
       WHERE id_funcionario = ?
       FOR UPDATE`,
      [idFuncionario]
    );

    if (funcionarios.length === 0) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `UPDATE funcionario
       SET nome = ?, cpf = ?, email = ?, telefone = ?,
           data_admissao = ?, id_cargo = ?, ativo = ?
       WHERE id_funcionario = ?`,
      [nome, cpf, email, telefone, dataAdmissao, idCargo, ativo, idFuncionario]
    );

    const { idUsuario } = funcionarios[0];
    if (idUsuario !== null) {
      await connection.execute(
        `UPDATE usuario
         SET email = ?, id_perfil = ?, ativo = ?
         WHERE id_usuario = ?`,
        [email, idPerfil, ativo, idUsuario]
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
async function buscarDesempenhoPorDia(data, idFuncionario = null) {
  const params = [data];
  let filtroFuncionario = '';

  if (idFuncionario) {
    filtroFuncionario = ' AND f.id_funcionario = ?';
    params.push(idFuncionario);
  }

  const [rows] = await pool.execute(
    `SELECT
       f.id_funcionario AS idFuncionario,
       f.nome AS funcionarioNome,
       ca.nome AS cargo,
       a.id_atendimento AS idAtendimento,
       COALESCE(NULLIF(os.descricao_problema, ''), CONCAT('Atendimento #', a.id_atendimento)) AS servico,
       DATE_FORMAT(COALESCE(d.data_hora, os.data_fechamento), '%Y-%m-%dT%H:%i:%s') AS criadoEm,
       DATE_FORMAT(COALESCE(os.data_fechamento, d.data_hora), '%Y-%m-%dT%H:%i:%s') AS finalizadoEm,
       CASE
         WHEN d.data_hora IS NOT NULL AND os.data_fechamento IS NOT NULL
           THEN GREATEST(TIMESTAMPDIFF(MINUTE, d.data_hora, os.data_fechamento), 1)
         ELSE 60
       END AS tempoExecucaoMinutos,
       CASE
         WHEN LOWER(COALESCE(d.descricao, '')) REGEXP 'alta|complex|motor|cambio|câmbio|retifica|retífica|eletrica|elétrica'
           THEN 'alta'
         WHEN LOWER(COALESCE(d.descricao, '')) REGEXP 'baixa|simples|oleo|óleo|filtro|alinhamento|balanceamento|lampada|lâmpada'
           THEN 'baixa'
         ELSE 'media'
       END AS dificuldadeDiagnostico
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
     LEFT JOIN atendimento a
       ON a.id_funcionario = f.id_funcionario
       AND a.status = 'concluido'
     LEFT JOIN ordem_servico os
       ON os.id_atendimento = a.id_atendimento
     LEFT JOIN diagnostico d
       ON d.id_ordem = os.id_ordem
     WHERE f.ativo = 1
       AND (
         a.id_atendimento IS NULL
         OR DATE(COALESCE(os.data_fechamento, d.data_hora)) = ?
       )
       ${filtroFuncionario}
     ORDER BY f.nome ASC, a.id_atendimento ASC`,
    params
  );

  return rows;
}

// DM-60 & DM-66: Série histórica dos últimos 7 dias para os gráficos
async function buscarHistoricoSemanalDesempenho(dataReferencia, idFuncionario = null) {
  const params = [dataReferencia, dataReferencia];
  let filtroFuncionario = '';

  if (idFuncionario) {
    filtroFuncionario = ' AND a.id_funcionario = ?';
    params.push(idFuncionario);
  }

  const [rows] = await pool.execute(
    `SELECT
       DATE_FORMAT(DATE(COALESCE(os.data_fechamento, d.data_hora)), '%Y-%m-%d') AS dia,
       COUNT(DISTINCT a.id_atendimento) AS totalServicos,
       COALESCE(
         ROUND(AVG(
           CASE
             WHEN d.data_hora IS NOT NULL AND os.data_fechamento IS NOT NULL
               THEN GREATEST(TIMESTAMPDIFF(MINUTE, d.data_hora, os.data_fechamento), 1)
             ELSE 60
           END
         )),
         0
       ) AS tempoMedioMinutos
     FROM atendimento a
     INNER JOIN ordem_servico os ON os.id_atendimento = a.id_atendimento
     LEFT JOIN diagnostico d ON d.id_ordem = os.id_ordem
     WHERE a.status = 'concluido'
       AND COALESCE(os.data_fechamento, d.data_hora) IS NOT NULL
       AND DATE(COALESCE(os.data_fechamento, d.data_hora))
           BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?
       ${filtroFuncionario}
     GROUP BY dia
     ORDER BY dia ASC`,
    params
  );

  return rows;
}

async function criar({ nome, cpf, email, telefone, dataAdmissao, idCargo, idUsuario }) {
  const [resultado] = await pool.execute(
    `INSERT INTO funcionario (id_usuario, id_cargo, nome, cpf, email, telefone, data_admissao, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [idUsuario, idCargo, nome, cpf, email, telefone, dataAdmissao]
  );
  return { id: resultado.insertId, nome, cpf, email, telefone, dataAdmissao, idCargo };
}

module.exports = {
  search,
  updateCargoEPerfil,
  findByUsuarioId,
  findAtivoById,
  findById,
  listarAtivos,
  listarServicosAtribuidos,
  atualizar,
  criar,
  posicaoNaLista,
  buscarDesempenhoPorDia,
  buscarHistoricoSemanalDesempenho
};
