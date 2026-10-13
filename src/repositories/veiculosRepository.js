const { pool } = require('../config/database');

async function findAll({ limite, offset }) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM veiculo'
  );

  const [rows] = await pool.execute(
    `SELECT
       v.id_veiculo AS id,
       v.placa,
       v.marca,
       v.modelo,
       v.ano,
       v.cor,
       v.chassi,
       v.id_cliente AS idCliente,
       c.nome AS nomeCliente
     FROM veiculo v
     LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
     ORDER BY v.id_veiculo DESC
     LIMIT ? OFFSET ?`,
    [limite, offset]
  );

  return {
    rows,
    total: countRows[0].total
  };
}

module.exports = { findAll };