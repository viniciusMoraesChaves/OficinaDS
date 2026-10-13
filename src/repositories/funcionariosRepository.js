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
     ORDER BY f.nome ASC, f.id_funcionario ASC
     LIMIT ? OFFSET ?`,
    [...where.params, limite, offset]
  );

  return { rows, total: countRows[0].total };
}

// Posição (1, 2, 3...) do funcionário na listagem sem filtros. O front usa
// para abrir a página em que o funcionário recém-criado aparece.
async function posicaoNaLista(idFuncionario) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS posicao
     FROM funcionario f
     INNER JOIN funcionario alvo ON alvo.id_funcionario = ?
     WHERE f.nome < alvo.nome
        OR (f.nome = alvo.nome AND f.id_funcionario <= alvo.id_funcionario)`,
    [idFuncionario]
  );

  return Number(rows[0].posicao);
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

async function findByUsuarioId(idUsuario) {
  const [rows] = await pool.execute(
    'SELECT id_funcionario AS id, nome FROM funcionario WHERE id_usuario = ?',
    [idUsuario]
  );
  return rows[0] || null;
}

async function criar({ nome, cpf, email, telefone, dataAdmissao, idCargo, idUsuario }) {
  const [resultado] = await pool.execute(
    `INSERT INTO funcionario (id_usuario, id_cargo, nome, cpf, email, telefone, data_admissao, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [idUsuario, idCargo, nome, cpf, email, telefone, dataAdmissao]
  );
  return { id: resultado.insertId, nome, cpf, email, telefone, dataAdmissao, idCargo };
}

module.exports = { search, updateCargoEPerfil, findByUsuarioId, criar, posicaoNaLista };
