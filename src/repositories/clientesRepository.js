const { pool } = require('../config/database');

async function findAll({ limite, offset }) {
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM cliente'
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
     GROUP BY
       c.id_cliente, c.nome, c.cpf, c.email,
       c.telefone, c.endereco, c.ativo
     ORDER BY c.nome ASC
     LIMIT ? OFFSET ?`,
    [limite, offset]
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

module.exports = { findAll, findById };
