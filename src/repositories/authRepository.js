const { pool } = require('../config/database');

async function encontrarPorEmail(email) {
  const [linhas] = await pool.query(
    'SELECT id_usuario, email, senha_hash, ativo FROM usuario WHERE email = ? LIMIT 1',
    [email]
  );
  return linhas[0] || null;
}

async function criarUsuario(email, senhaHash) {
  const [resultado] = await pool.query(
    'INSERT INTO usuario (email, senha_hash, ativo) VALUES (?, ?, TRUE)',
    [email, senhaHash]
  );
  return { id_usuario: resultado.insertId, email };
}

module.exports = { encontrarPorEmail, criarUsuario };