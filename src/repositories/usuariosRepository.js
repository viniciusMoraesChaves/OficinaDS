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

async function buscarDadosMeuPerfil(idUsuario) {
  const [rows] = await pool.execute(
    `SELECT
       u.id_usuario AS id,
       u.email,
       p.nome AS perfil,
       COALESCE(c.nome, f.nome) AS nome,
       COALESCE(c.cpf, f.cpf) AS cpf,
       COALESCE(c.telefone, f.telefone) AS telefone,
       c.endereco,
       CASE
        WHEN c.id_cliente IS NOT NULL
          OR f.id_funcionario IS NOT NULL
        THEN 1
        ELSE 0
       END AS possuiCadastroPessoal
     FROM usuario u
     INNER JOIN perfil p ON p.id_perfil = u.id_perfil
     LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
     LEFT JOIN funcionario f ON f.id_usuario = u.id_usuario
     WHERE u.id_usuario = ?`,
    [idUsuario]
  );

  return rows[0] || null;
}

async function atualizarEmailMeuPerfil(idUsuario, email) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [usuarios] = await connection.execute(
      `SELECT id_usuario
       FROM usuario
       WHERE id_usuario = ?
       FOR UPDATE`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `UPDATE usuario
       SET email = ?
       WHERE id_usuario = ?`,
      [email, idUsuario]
    );

    await connection.execute(
      `UPDATE cliente
       SET email = ?
       WHERE id_usuario = ?`,
      [email, idUsuario]
    );

    await connection.execute(
      `UPDATE funcionario
       SET email = ?
       WHERE id_usuario = ?`,
      [email, idUsuario]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function emailPertenceAOutroUsuario(email, idUsuario) {
  const [rows] = await pool.execute(
    `SELECT id_usuario
     FROM usuario
     WHERE email = ?
       AND id_usuario <> ?
     LIMIT 1`,
    [email, idUsuario]
  );

  return rows.length > 0;
}

async function buscarVinculoMeuPerfil(idUsuario) {
  const [rows] = await pool.execute(
    `SELECT
       c.id_cliente AS clienteId,
       f.id_funcionario AS funcionarioId
     FROM usuario u
     LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
     LEFT JOIN funcionario f ON f.id_usuario = u.id_usuario
     WHERE u.id_usuario = ?`,
    [idUsuario]
  );

  return rows[0] || null;
}

async function atualizarDadosPessoaisMeuPerfil(idUsuario, dados) {
  const vinculo = await buscarVinculoMeuPerfil(idUsuario);

  if (!vinculo) {
    return { atualizado: false, motivo: 'USUARIO_NAO_ENCONTRADO' };
  }

  const nome = dados.nome.trim();
  const telefone = dados.telefone.trim();


  if (vinculo.clienteId !== null) {
    const alterarEndereco = dados.endereco !== undefined;

    if (alterarEndereco) {
      await pool.execute(
        `UPDATE cliente
         SET nome = ?, telefone = ?, endereco = ?
         WHERE id_usuario = ?`,
        [nome, telefone || null, dados.endereco || null, idUsuario]
      );
    } else {
      await pool.execute(
        `UPDATE cliente
         SET nome = ?, telefone = ?
         WHERE id_usuario = ?`,
        [nome, telefone || null, idUsuario]
      );
    }


    return { atualizado: true };
  }

  if (vinculo.funcionarioId !== null) {
    await pool.execute(
      `UPDATE funcionario
       SET nome = ?, telefone = ?
       WHERE id_usuario = ?`,
      [nome, telefone || null, idUsuario]
    );

    return { atualizado: true };
  }

  return { atualizado: false, motivo: 'SEM_CADASTRO_VINCULADO' };
}


async function buscarSenhaHashMeuPerfil(idUsuario) {
  const [rows] = await pool.execute(
    `SELECT senha_hash
     FROM usuario
     WHERE id_usuario = ?`,
    [idUsuario]
  );

  return rows[0]?.senha_hash ?? null;
}

async function atualizarSenhaMeuPerfil(idUsuario, hashAtual, novoHash) {
  const [resultado] = await pool.execute(
    `UPDATE usuario
     SET senha_hash = ?
     WHERE id_usuario = ?
       AND senha_hash = ?`,
    [novoHash, idUsuario, hashAtual]
  );

  return resultado.affectedRows === 1;
}

module.exports = {
  listarTodos,
  buscarComPerfilPorId,
  buscarDadosMeuPerfil,
  atualizarEmailMeuPerfil,
  emailPertenceAOutroUsuario,
  buscarVinculoMeuPerfil,
  atualizarDadosPessoaisMeuPerfil,
  buscarSenhaHashMeuPerfil,
  atualizarSenhaMeuPerfil
};