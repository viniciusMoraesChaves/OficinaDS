const { pool } = require('../config/database');

// Lista veículos com o nome do cliente e a data do último atendimento.
// "busca" filtra por placa, marca, modelo ou nome do cliente.
async function findAll({ limite, offset, busca = '' }) {
  const termo = String(busca).trim();
  const filtro = termo
    ? `WHERE v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR c.nome LIKE ?`
    : '';
  const parametrosFiltro = termo ? Array(4).fill(`%${termo}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM veiculo v
     LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
     ${filtro}`,
    parametrosFiltro
  );

  const [rows] = await pool.execute(
    `SELECT
       v.id_veiculo AS id,
       v.placa,
       v.marca,
       v.modelo,
       v.ano,
       v.cor,
       v.chassi,
       v.id_cliente AS idCliente,
       c.nome AS cliente,
       c.nome AS nomeCliente,
       (SELECT MAX(a.criado_em)
          FROM atendimento a
          WHERE a.id_veiculo = v.id_veiculo
            AND a.status <> 'cancelado') AS ultimoServico
     FROM veiculo v
     LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
     ${filtro}
     ORDER BY v.id_veiculo DESC
     LIMIT ? OFFSET ?`,
    [...parametrosFiltro, limite, offset]
  );

  return {
    rows,
    total: countRows[0].total
  };
}

module.exports = { findAll };

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT
       v.id_veiculo AS id,
       v.placa,
       v.marca,
       v.modelo,
       v.ano,
       v.cor,
       c.nome AS cliente
     FROM veiculo v
     LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
     WHERE v.id_veiculo = ?`,
    [id]
  );

  return rows[0] || null;
}

module.exports.findById = findById;
