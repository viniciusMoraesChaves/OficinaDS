const { pool } = require('../config/database');

async function listarTodos() {
  const [rows] = await pool.execute(
    `SELECT
       u.id_usuario AS id,
       u.email,
       u.ativo,
       p.nome AS perfil
     FROM usuario u
     LEFT JOIN perfil p ON p.id_perfil = u.id_perfil
     ORDER BY u.email ASC`
  );

  return rows;
}

async function buscarComPerfilPorId(idUsuario) {
  const [rows] = await pool.execute(
    `SELECT
       u.id_usuario AS id,
       u.email,
       u.ativo,
       p.id_perfil AS perfilId,
       p.nome AS perfil
     FROM usuario u
     INNER JOIN perfil p ON p.id_perfil = u.id_perfil
     WHERE u.id_usuario = ?`,
    [idUsuario]
  );

  return rows[0] || null;
}

module.exports = { listarTodos, buscarComPerfilPorId };