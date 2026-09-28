const { pool } = require('../config/database');

function buildWhere({ busca, status }) {
  const conditions = [];
  const params = [];

  if (busca) {
    const like = `%${busca}%`;
    const cpfDigits = busca.replace(/\D/g, '');
    const cpfLike = cpfDigits ? `%${cpfDigits}%` : like;
    conditions.push(`(
      f.nome LIKE ?
      OR f.cpf LIKE ?
      OR f.email LIKE ?
      OR ca.nome LIKE ?
    )`);
    params.push(like, cpfLike, like, like);
  }

  if (status === 'ativos') {
    conditions.push('f.ativo = 1');
  } else if (status === 'inativos') {
    conditions.push('f.ativo = 0');
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

async function search({ busca, status, limite, offset }) {
  const where = buildWhere({ busca, status });

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
     ${where.clause}`,
    where.params
  );

  const [rows] = await pool.execute(
    `SELECT
       f.id_funcionario AS id,
       f.nome,
       f.cpf,
       f.email,
       f.telefone,
       f.data_admissao AS dataAdmissao,
       f.ativo,
       ca.id_cargo AS cargoId,
       ca.nome AS cargo
     FROM funcionario f
     INNER JOIN cargo ca ON ca.id_cargo = f.id_cargo
     ${where.clause}
     ORDER BY f.nome ASC
     LIMIT ? OFFSET ?`,
    [...where.params, limite, offset]
  );

  return { rows, total: countRows[0].total };
}

async function updateCargoEPerfil(idFuncionario, idCargo, idPerfil) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [funcionarios] = await connection.execute(
      `SELECT id_usuario
       FROM funcionario
       WHERE id_funcionario = ?`,
      [idFuncionario]
    );

    if (funcionarios.length === 0) {
      await connection.rollback();
      return 0;
    }

    const idUsuario = funcionarios[0].id_usuario;

    await connection.execute(
      `UPDATE funcionario
       SET id_cargo = ?
       WHERE id_funcionario = ?`,
      [idCargo, idFuncionario]
    );

    if (idUsuario !== null) {
      await connection.execute(
        `UPDATE usuario
         SET id_perfil = ?
         WHERE id_usuario = ?`,
        [idPerfil, idUsuario]
      );
    }

    await connection.commit();

    return 1;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { search, updateCargoEPerfil };
