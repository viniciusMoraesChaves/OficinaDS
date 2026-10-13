const { pool } = require('../config/database');
const { STATUS, STATUS_QUE_OCUPAM_HORARIO, REGRAS } = require('../utils/regrasAgendamento');

// Datas saem do MySQL já como texto 'AAAA-MM-DDTHH:mm:ss' (horário local da
// oficina), para não haver conversão de fuso entre banco, API e tela.
const FORMATO_DATA_HORA = '%Y-%m-%dT%H:%i:%s';

const SELECT_AGENDAMENTO = `
  SELECT
    ag.id_agendamento AS id,
    ag.servico,
    DATE_FORMAT(ag.data_hora, '${FORMATO_DATA_HORA}') AS dataHora,
    ag.duracao_minutos AS duracaoMinutos,
    ag.status,
    ag.qtd_reagendamentos AS qtdReagendamentos,
    DATE_FORMAT(ag.reagendado_em, '${FORMATO_DATA_HORA}') AS reagendadoEm,
    ag.id_veiculo AS veiculoId,
    ag.id_funcionario AS funcionarioId,
    c.nome AS cliente,
    v.placa,
    v.marca,
    v.modelo,
    f.nome AS funcionario
  FROM agendamento ag
  INNER JOIN cliente c ON c.id_cliente = ag.id_cliente
  INNER JOIN veiculo v ON v.id_veiculo = ag.id_veiculo
  INNER JOIN funcionario f ON f.id_funcionario = ag.id_funcionario`;

const PLACEHOLDERS_STATUS_ATIVOS = STATUS_QUE_OCUPAM_HORARIO.map(() => '?').join(', ');

async function findAll() {
  // Pendentes primeiro (do mais próximo ao mais distante); concluídos e
  // cancelados ao final.
  const [rows] = await pool.execute(
    `${SELECT_AGENDAMENTO}
     ORDER BY (ag.status IN (?, ?)) ASC, ag.data_hora ASC, ag.id_agendamento ASC`,
    [STATUS.CONCLUIDO, STATUS.CANCELADO]
  );

  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `${SELECT_AGENDAMENTO}
     WHERE ag.id_agendamento = ?`,
    [id]
  );

  return rows[0] || null;
}

async function findOptions() {
  const [veiculos] = await pool.execute(
    `SELECT
       v.id_veiculo AS id,
       v.placa,
       v.marca,
       v.modelo,
       c.nome AS cliente
     FROM veiculo v
     INNER JOIN cliente c ON c.id_cliente = v.id_cliente
     WHERE c.ativo = 1
     ORDER BY c.nome ASC, v.placa ASC`
  );

  const [funcionarios] = await pool.execute(
    `SELECT
       f.id_funcionario AS id,
       f.nome,
       ca.nome AS cargo
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
     WHERE f.ativo = 1
     ORDER BY f.nome ASC`
  );

  return { veiculos, funcionarios };
}

async function findVehicleById(id) {
  const [rows] = await pool.execute(
    `SELECT v.id_veiculo AS id, v.id_cliente AS clienteId
     FROM veiculo v
     INNER JOIN cliente c ON c.id_cliente = v.id_cliente
     WHERE v.id_veiculo = ? AND c.ativo = 1`,
    [id]
  );

  return rows[0] || null;
}

async function findEmployeeById(id) {
  const [rows] = await pool.execute(
    `SELECT id_funcionario AS id
     FROM funcionario
     WHERE id_funcionario = ? AND ativo = 1`,
    [id]
  );

  return rows[0] || null;
}

// Agendamentos ativos (que ocupam horário) de um dia 'AAAA-MM-DD'.
// "db" pode ser o pool ou uma conexão de transação; com "travar" as linhas
// ficam bloqueadas até o fim da transação (evita duas pessoas pegarem o
// mesmo horário ao mesmo tempo).
async function listarOcupadosDoDia(db, dia, travar = false) {
  const inicioDoDia = `${dia} 00:00:00`;

  const [rows] = await db.execute(
    `SELECT
       id_agendamento AS id,
       id_funcionario AS funcionarioId,
       id_veiculo AS veiculoId,
       DATE_FORMAT(data_hora, '${FORMATO_DATA_HORA}') AS dataHora,
       duracao_minutos AS duracaoMinutos
     FROM agendamento
     WHERE data_hora >= ?
       AND data_hora < DATE_ADD(?, INTERVAL 1 DAY)
       AND status IN (${PLACEHOLDERS_STATUS_ATIVOS})
     ${travar ? 'FOR UPDATE' : ''}`,
    [inicioDoDia, inicioDoDia, ...STATUS_QUE_OCUPAM_HORARIO]
  );

  return rows;
}

function findOccupiedByDay(dia) {
  return listarOcupadosDoDia(pool, dia);
}

async function comTransacao(trabalho) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();
    const resultado = await trabalho(conexao);
    await conexao.commit();
    return resultado;
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}

// Cria o agendamento dentro de uma transação. "validar(ocupados)" roda com o
// dia já bloqueado e deve lançar erro se houver conflito.
async function createSeLivre(
  { clienteId, veiculoId, funcionarioId, servico, inicioSql },
  validar
) {
  const id = await comTransacao(async (conexao) => {
    const ocupados = await listarOcupadosDoDia(conexao, inicioSql.slice(0, 10), true);
    validar(ocupados);

    const [resultado] = await conexao.execute(
      `INSERT INTO agendamento
         (id_cliente, id_veiculo, id_funcionario, servico, data_hora, duracao_minutos, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        veiculoId,
        funcionarioId,
        servico,
        inicioSql,
        REGRAS.duracaoMinutos,
        STATUS.AGENDADO
      ]
    );

    return resultado.insertId;
  });

  return findById(id);
}

// Troca data/hora do agendamento dentro de uma transação. A linha é
// bloqueada e relida (o status pode ter mudado desde a consulta da tela) e
// "validar(agendamentoAtual, ocupados)" decide se pode seguir.
// Devolve null se o agendamento não existe.
async function reagendarSeLivre(id, novoInicioSql, validar) {
  const encontrado = await comTransacao(async (conexao) => {
    const [linhas] = await conexao.execute(
      `SELECT
         id_agendamento AS id,
         id_funcionario AS funcionarioId,
         id_veiculo AS veiculoId,
         status,
         DATE_FORMAT(data_hora, '${FORMATO_DATA_HORA}') AS dataHora,
         duracao_minutos AS duracaoMinutos
       FROM agendamento
       WHERE id_agendamento = ?
       FOR UPDATE`,
      [id]
    );

    const atual = linhas[0];

    if (!atual) {
      return false;
    }

    const ocupados = await listarOcupadosDoDia(conexao, novoInicioSql.slice(0, 10), true);
    validar(atual, ocupados);

    await conexao.execute(
      `UPDATE agendamento
       SET data_hora = ?,
           qtd_reagendamentos = qtd_reagendamentos + 1,
           reagendado_em = CURRENT_TIMESTAMP
       WHERE id_agendamento = ?`,
      [novoInicioSql, id]
    );

    return true;
  });

  return encontrado ? findById(id) : null;
}

module.exports = {
  findAll,
  findById,
  findOptions,
  findVehicleById,
  findEmployeeById,
  findOccupiedByDay,
  createSeLivre,
  reagendarSeLivre
};
