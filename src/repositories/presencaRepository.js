const { pool } = require('../config/database');
const { ConflitoError } = require('../utils/erros');
const { hojeIso, montarPresenca, situacaoHoje } = require('../utils/presenca');

const CAMPOS_PRESENCA = `
  p.id_presenca AS id,
  f.id_funcionario AS idFuncionario,
  f.nome,
  c.nome AS cargo,
  p.data_presenca AS data,
  p.entrada_em AS entradaEm,
  p.saida_em AS saidaEm,
  TIMESTAMPDIFF(MINUTE, p.entrada_em, COALESCE(p.saida_em, NOW())) AS minutos`;

const JUNCOES = `
  FROM presenca_funcionario p
  INNER JOIN funcionario f ON f.id_funcionario = p.id_funcionario
  INNER JOIN cargo c ON c.id_cargo = f.id_cargo`;

function naoEncontrado(mensagem) {
  const erro = new Error(mensagem);
  erro.name = 'NaoEncontradoError';
  erro.statusCode = 404;
  erro.codigo = 'NAO_ENCONTRADO';
  return erro;
}

// Quem compareceu na data informada (um funcionário pode aparecer mais de uma vez no dia).
async function listarPorData(data) {
  const [rows] = await pool.execute(
    `SELECT ${CAMPOS_PRESENCA}
     ${JUNCOES}
     WHERE p.data_presenca = ?
     ORDER BY p.entrada_em ASC, p.id_presenca ASC`,
    [data]
  );

  const hoje = hojeIso();
  return rows.map((row) => montarPresenca(row, hoje));
}

// Quem está presente agora: entrou hoje e ainda não registrou a saída.
async function listarPresentes() {
  const [rows] = await pool.execute(
    `SELECT ${CAMPOS_PRESENCA}
     ${JUNCOES}
     WHERE p.data_presenca = CURDATE() AND p.saida_em IS NULL
     ORDER BY p.entrada_em ASC, p.id_presenca ASC`
  );

  const hoje = hojeIso();
  return rows.map((row) => montarPresenca(row, hoje));
}

// Funcionários ativos com a situação de hoje, para os botões de entrada e saída.
async function listarFuncionariosComSituacao() {
  const [rows] = await pool.execute(
    `SELECT
       f.id_funcionario AS id,
       f.nome,
       c.nome AS cargo,
       (SELECT p.entrada_em
          FROM presenca_funcionario p
          WHERE p.id_funcionario = f.id_funcionario
            AND p.data_presenca = CURDATE()
            AND p.saida_em IS NULL
          ORDER BY p.entrada_em DESC
          LIMIT 1) AS presenteDesde,
       (SELECT COUNT(*)
          FROM presenca_funcionario p
          WHERE p.id_funcionario = f.id_funcionario
            AND p.data_presenca = CURDATE()) AS registrosHoje
     FROM funcionario f
     INNER JOIN cargo c ON c.id_cargo = f.id_cargo
     WHERE f.ativo = 1
     ORDER BY f.nome ASC, f.id_funcionario ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    cargo: row.cargo,
    presenteDesde: row.presenteDesde || null,
    situacao: situacaoHoje(row)
  }));
}

async function comTransacao(trabalho) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const resultado = await trabalho(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Trava a linha do funcionário durante a operação: dois cliques simultâneos não
// criam dois períodos abertos.
async function travarFuncionario(connection, idFuncionario) {
  const [rows] = await connection.execute(
    'SELECT id_funcionario, ativo FROM funcionario WHERE id_funcionario = ? FOR UPDATE',
    [idFuncionario]
  );

  if (rows.length === 0) throw naoEncontrado('Funcionário não encontrado.');

  return rows[0];
}

async function registrarEntrada(idFuncionario, idUsuario) {
  return comTransacao(async (connection) => {
    const funcionario = await travarFuncionario(connection, idFuncionario);

    if (!funcionario.ativo) {
      throw new ConflitoError('Não é possível registrar presença de um funcionário inativo.');
    }

    const [abertos] = await connection.execute(
      `SELECT 1
       FROM presenca_funcionario
       WHERE id_funcionario = ? AND data_presenca = CURDATE() AND saida_em IS NULL
       LIMIT 1`,
      [idFuncionario]
    );

    if (abertos.length > 0) {
      throw new ConflitoError('Este funcionário já está presente. Registre a saída antes de uma nova entrada.');
    }

    const [resultado] = await connection.execute(
      `INSERT INTO presenca_funcionario (id_funcionario, data_presenca, entrada_em, id_usuario_entrada)
       VALUES (?, CURDATE(), NOW(), ?)`,
      [idFuncionario, idUsuario]
    );

    return resultado.insertId;
  });
}

async function registrarSaida(idFuncionario, idUsuario) {
  return comTransacao(async (connection) => {
    await travarFuncionario(connection, idFuncionario);

    const [abertos] = await connection.execute(
      `SELECT id_presenca
       FROM presenca_funcionario
       WHERE id_funcionario = ? AND data_presenca = CURDATE() AND saida_em IS NULL
       ORDER BY entrada_em DESC
       LIMIT 1
       FOR UPDATE`,
      [idFuncionario]
    );

    if (abertos.length === 0) {
      throw new ConflitoError('Este funcionário não tem entrada em aberto hoje.');
    }

    await connection.execute(
      `UPDATE presenca_funcionario
       SET saida_em = NOW(), id_usuario_saida = ?
       WHERE id_presenca = ?`,
      [idUsuario, abertos[0].id_presenca]
    );

    return abertos[0].id_presenca;
  });
}

module.exports = {
  listarPorData,
  listarPresentes,
  listarFuncionariosComSituacao,
  registrarEntrada,
  registrarSaida
};
