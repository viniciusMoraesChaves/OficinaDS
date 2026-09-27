const { pool } = require('../config/database');

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT
       id_cargo AS id,
       nome,
       descricao
     FROM cargo
     ORDER BY nome ASC`
  );

  return rows;
}

module.exports = { findAll };