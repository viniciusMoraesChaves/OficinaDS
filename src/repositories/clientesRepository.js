const { pool } = require('../config/database');

function buildWhere(busca) {
  if (!busca) {
    return { clause: '', params: [] };
  }

  const like = `%${busca}%`;
  const digits = busca.replace(/\D/g, '');
  const fields = [
    'c.nome LIKE ?',
    'c.cpf LIKE ?',
    'c.email LIKE ?',
    'c.telefone LIKE ?'
  ];
  const params = [like, like, like, like];

  if (digits) {
    const digitsLike = `%${digits}%`;
    fields.push(
      `REPLACE(REPLACE(c.cpf, '.', ''), '-', '') LIKE ?`,
      `REPLACE(REPLACE(REPLACE(REPLACE(c.telefone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?`
    );
    params.push(digitsLike, digitsLike);
  }

  return {
    clause: `WHERE (${fields.join(' OR ')})`,
    params
  };
}

async function findAll({ busca, limite, offset }) {
  const where = buildWhere(busca);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM cliente c
     ${where.clause}`,
    where.params
  );

  const [rows] = await pool.execute(
    `SELECT
       c.id_cliente AS id,
       c.nome,
       c.cpf,
       c.email,
       c.telefone,
       c.endereco,
       c.ativo,
       COUNT(v.id_veiculo) AS quantidadeVeiculos
     FROM cliente c
     LEFT JOIN veiculo v ON v.id_cliente = c.id_cliente
     ${where.clause}
     GROUP BY
       c.id_cliente, c.nome, c.cpf, c.email,
       c.telefone, c.endereco, c.ativo
     ORDER BY c.nome ASC, c.id_cliente ASC
     LIMIT ? OFFSET ?`,
    [...where.params, limite, offset]
  );

  return { rows, total: countRows[0].total };
}

async function findById(id) {
  const [clientRows] = await pool.execute(
    `SELECT
       id_cliente AS id,
       nome,
       cpf,
       email,
       telefone,
       endereco,
       ativo
     FROM cliente
     WHERE id_cliente = ?`,
    [id]
  );

  if (clientRows.length === 0) {
    return null;
  }

  const [vehicleRows] = await pool.execute(
    `SELECT
       id_veiculo AS id,
       placa,
       marca,
       modelo,
       ano,
       cor,
       chassi
     FROM veiculo
     WHERE id_cliente = ?
     ORDER BY marca ASC, modelo ASC`,
    [id]
  );

  return {
    ...clientRows[0],
    veiculos: vehicleRows
  };
}

async function findByUsuarioId(idUsuario) {
  const [rows] = await pool.execute(
    'SELECT id_cliente AS id, nome, email FROM cliente WHERE id_usuario = ?',
    [idUsuario]
  );

  return rows[0] || null;
}

// Clientes ativos com seus veículos, para os menus de seleção (ex.: novo atendimento).
async function listarOpcoes() {
  const [rows] = await pool.execute(
    `SELECT
       c.id_cliente AS clienteId,
       c.nome,
       c.cpf,
       v.id_veiculo AS veiculoId,
       v.placa,
       v.marca,
       v.modelo
     FROM cliente c
     LEFT JOIN veiculo v ON v.id_cliente = c.id_cliente
     WHERE c.ativo = 1
     ORDER BY c.nome ASC, c.id_cliente ASC, v.marca ASC, v.modelo ASC`
  );

  const porCliente = new Map();

  for (const row of rows) {
    if (!porCliente.has(row.clienteId)) {
      porCliente.set(row.clienteId, {
        id: row.clienteId,
        nome: row.nome,
        cpf: row.cpf,
        veiculos: []
      });
    }

    if (row.veiculoId !== null) {
      porCliente.get(row.clienteId).veiculos.push({
        id: row.veiculoId,
        placa: row.placa,
        marca: row.marca,
        modelo: row.modelo
      });
    }
  }

  return [...porCliente.values()];
}

module.exports = { findAll, findById, findByUsuarioId, listarOpcoes };