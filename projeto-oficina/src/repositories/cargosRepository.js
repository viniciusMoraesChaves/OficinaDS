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

// Cargo atribuído a quem se cadastra sozinho: nunca "Gerente" (que vira Administrador).
async function findPadraoCadastro() {
  const [rows] = await pool.execute(
    `SELECT id_cargo AS id, nome, descricao
     FROM cargo
     WHERE nome <> 'Gerente'
     ORDER BY (nome = 'Atendente') DESC, id_cargo ASC
     LIMIT 1`
  );

  return rows[0] || null;
}

module.exports = { findAll, findById, create, findPadraoCadastro };