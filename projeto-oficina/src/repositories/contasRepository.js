const { pool } = require('../config/database');
const { ConflitoError } = require('../utils/erros');

// Cria usuario + registro de domínio (funcionario / cliente / veiculo) numa
// única transação. Se qualquer passo falhar, nada fica gravado: evita
// "usuários órfãos" que existem em /usuarios mas não aparecem nas listas.

async function existe(connection, sql, params) {
  const [rows] = await connection.execute(sql, params);
  return rows.length > 0;
}

async function inserirUsuario(connection, { email, senhaHash, idPerfil }) {
  if (await existe(connection, 'SELECT 1 FROM usuario WHERE email = ? LIMIT 1', [email])) {
    throw new ConflitoError('Já existe uma conta com este e-mail.');
  }

  const [resultado] = await connection.execute(
    'INSERT INTO usuario (email, senha_hash, id_perfil, ativo) VALUES (?, ?, ?, TRUE)',
    [email, senhaHash, idPerfil]
  );

  return resultado.insertId;
}

async function comTransacao(trabalho) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const resultado = await trabalho(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function criarContaFuncionario({ email, senhaHash, idPerfil, nome, cpf, telefone, dataAdmissao, idCargo }) {
  return comTransacao(async (connection) => {
    if (await existe(connection, 'SELECT 1 FROM funcionario WHERE cpf = ? LIMIT 1', [cpf])) {
      throw new ConflitoError('Já existe um funcionário com este CPF.');
    }
    if (await existe(connection, 'SELECT 1 FROM funcionario WHERE email = ? LIMIT 1', [email])) {
      throw new ConflitoError('Já existe um funcionário com este e-mail.');
    }

    const idUsuario = await inserirUsuario(connection, { email, senhaHash, idPerfil });

    const [resultado] = await connection.execute(
      `INSERT INTO funcionario
         (id_usuario, id_cargo, nome, cpf, email, telefone, data_admissao, ativo)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), TRUE)`,
      [idUsuario, idCargo, nome, cpf, email, telefone || null, dataAdmissao || null]
    );

    return { id: resultado.insertId, idUsuario, nome, cpf, email, telefone: telefone || null, idCargo };
  });
}

function criarContaCliente({ email, senhaHash, idPerfil, nome, cpf, telefone, endereco, veiculo }) {
  return comTransacao(async (connection) => {
    if (await existe(connection, 'SELECT 1 FROM cliente WHERE cpf = ? LIMIT 1', [cpf])) {
      throw new ConflitoError('Já existe um cliente com este CPF.');
    }
    if (await existe(connection, 'SELECT 1 FROM cliente WHERE email = ? LIMIT 1', [email])) {
      throw new ConflitoError('Já existe um cliente com este e-mail.');
    }
    if (veiculo && await existe(connection, 'SELECT 1 FROM veiculo WHERE placa = ? LIMIT 1', [veiculo.placa])) {
      throw new ConflitoError('Já existe um veículo cadastrado com esta placa.');
    }

    const idUsuario = await inserirUsuario(connection, { email, senhaHash, idPerfil });

    const [resultado] = await connection.execute(
      `INSERT INTO cliente (id_usuario, nome, cpf, email, telefone, endereco, ativo)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [idUsuario, nome, cpf, email, telefone || null, endereco || null]
    );
    const idCliente = resultado.insertId;

    if (veiculo) {
      await connection.execute(
        `INSERT INTO veiculo (id_cliente, placa, marca, modelo, ano, cor)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idCliente, veiculo.placa, veiculo.marca, veiculo.modelo, veiculo.ano, veiculo.cor || null]
      );
    }

    return { id: idCliente, idUsuario, nome, cpf, email };
  });
}

module.exports = { criarContaFuncionario, criarContaCliente };
