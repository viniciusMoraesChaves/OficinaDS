const { pool } = require('../config/database');

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT
       d.id_diagnostico AS id,
       d.id_ordem AS ordemId,
       d.id_funcionario AS funcionarioId,
       d.descricao,
       d.data_hora AS dataHora,
       os.status AS ordemStatus,
       os.descricao_problema AS problemaRelatado,
       c.nome AS cliente,
       v.placa,
       v.marca,
       v.modelo,
       f.nome AS funcionario
     FROM diagnostico d
     INNER JOIN ordem_servico os ON os.id_ordem = d.id_ordem
     INNER JOIN cliente c ON c.id_cliente = os.id_cliente
     INNER JOIN veiculo v ON v.id_veiculo = os.id_veiculo
     INNER JOIN funcionario f ON f.id_funcionario = d.id_funcionario
     ORDER BY d.data_hora DESC, d.id_diagnostico DESC`
  );

  return rows;
}

async function findOptions() {
  const [ordens] = await pool.execute(
    `SELECT
       os.id_ordem AS id,
       os.status,
       os.descricao_problema AS problemaRelatado,
       c.nome AS cliente,
       v.placa,
       v.marca,
       v.modelo
     FROM ordem_servico os
     INNER JOIN cliente c ON c.id_cliente = os.id_cliente
     INNER JOIN veiculo v ON v.id_veiculo = os.id_veiculo
     LEFT JOIN atendimento a ON a.id_atendimento = os.id_atendimento
     WHERE os.data_fechamento IS NULL
       AND (os.id_atendimento IS NULL OR a.status IN ('aberto', 'concluido'))
     ORDER BY os.id_ordem DESC`
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

  return { ordens, funcionarios };
}

async function findOrderById(id) {
  const [rows] = await pool.execute(
    `SELECT id_ordem AS id
     FROM ordem_servico
     WHERE id_ordem = ?`,
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

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT
       id_diagnostico AS id,
       id_ordem AS ordemId,
       id_funcionario AS funcionarioId,
       descricao,
       data_hora AS dataHora
     FROM diagnostico
     WHERE id_diagnostico = ?`,
    [id]
  );

  return rows[0] || null;
}

async function create({ ordemId, funcionarioId, descricao }) {
  const [result] = await pool.execute(
    `INSERT INTO diagnostico
       (id_ordem, id_funcionario, descricao, data_hora)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [ordemId, funcionarioId, descricao]
  );

  return findById(result.insertId);
}

async function update(id, { ordemId, funcionarioId, descricao }) {
  const [result] = await pool.execute(
    `UPDATE diagnostico
     SET id_ordem = ?,
         id_funcionario = ?,
         descricao = ?
     WHERE id_diagnostico = ?`,
    [ordemId, funcionarioId, descricao, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute(
    `DELETE FROM diagnostico
     WHERE id_diagnostico = ?`,
    [id]
  );

  return result.affectedRows;
}

module.exports = {
  findAll,
  findOptions,
  findOrderById,
  findEmployeeById,
  findById,
  create,
  update,
  remove
};
