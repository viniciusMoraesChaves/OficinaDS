const { pool } = require('../config/database');

async function encontrarPorEmail(email) {
  const [linhas] = await pool.query(
    `SELECT u.id_usuario, u.email, u.senha_hash, u.ativo, p.nome AS perfil
     FROM usuario u
     LEFT JOIN perfil p ON p.id_perfil = u.id_perfil
     WHERE u.email = ?
     LIMIT 1`,
    [email]
  );
  return linhas[0] || null;
}

async function criarUsuario(email, senhaHash, idPerfil) {
  const [resultado] = await pool.query(
    'INSERT INTO usuario (email, senha_hash, id_perfil, ativo) VALUES (?, ?, ?, TRUE)',
    [email, senhaHash, idPerfil]
  );
  return { id_usuario: resultado.insertId, email };
}

module.exports = { encontrarPorEmail, criarUsuario };