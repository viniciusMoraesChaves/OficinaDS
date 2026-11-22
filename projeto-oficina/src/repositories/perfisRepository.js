const { pool } = require('../config/database');

async function listarTodos() {
  const [rows] = await pool.execute(
    'SELECT id_perfil AS id, nome, descricao FROM perfil ORDER BY nome ASC'
  );

  return rows;
}

async function buscarPorNome(nome) {
  const [rows] = await pool.execute(
    'SELECT id_perfil AS id, nome, descricao FROM perfil WHERE nome = ?',
    [nome]
  );

  return rows[0] || null;
}

module.exports = { listarTodos, buscarPorNome };