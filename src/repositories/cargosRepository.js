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

async function findById(idCargo) {
  const [rows] = await pool.execute(
    `SELECT
       id_cargo AS id,
       nome,
       descricao
     FROM cargo
     WHERE id_cargo = ?`,
    [idCargo]
  );

  return rows[0] || null;
}

async function create(nome, descricao) {
  const [result] = await pool.execute(
    `INSERT INTO cargo (nome, descricao)
     VALUES (?, ?)`,
    [nome, descricao]
  );

  return {
    id: result.insertId,
    nome,
    descricao
  };
}

module.exports = { findAll, findById, create };