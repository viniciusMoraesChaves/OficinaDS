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
     ORDER BY c.nome ASC
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

module.exports = { findAll, findById };
