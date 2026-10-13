// Espera um pool do mysql2/promise (pool.query retorna [rows]).
   const { pool } = require('../config/database');

async function veiculoExiste(idVeiculo) {
  const [rows] = await pool.query('SELECT 1 FROM veiculo WHERE id_veiculo = ? LIMIT 1', [idVeiculo]);
  return rows.length > 0;
}

async function buscarAtendimentos(idVeiculo, { inicio, fim } = {}) {
  const [rows] = await pool.query(
    `SELECT a.id_atendimento, a.data_atendimento, a.status, a.problema_relatado, a.diagnostico,
            f.nome AS mecanico
       FROM atendimento a
       LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario
      WHERE a.id_veiculo = ?
        AND (? IS NULL OR a.data_atendimento >= ?)
        AND (? IS NULL OR a.data_atendimento < DATE_ADD(?, INTERVAL 1 DAY))
      ORDER BY a.data_atendimento DESC, a.id_atendimento DESC`,
    [idVeiculo, inicio || null, inicio || null, fim || null, fim || null]
  );
  return rows;
}

//serviços de todos os atendimentos em uma única query (evita N+1)
async function buscarServicos(idsAtendimento) {
  if (!idsAtendimento.length) return [];
  const [rows] = await pool.query(
    `SELECT id_atendimento, descricao, valor
       FROM servico_realizado
      WHERE id_atendimento IN (?)
      ORDER BY id_servico_realizado`,
    [idsAtendimento]
  );
  return rows;
}

// peças utilizadas
async function buscarPecas(idsAtendimento) {
  if (!idsAtendimento.length) return [];
  const [rows] = await pool.query(
    `SELECT id_atendimento, nome_peca, quantidade, valor_unitario
       FROM peca_utilizada
      WHERE id_atendimento IN (?)
      ORDER BY id_peca_utilizada`,
    [idsAtendimento]
  );
  return rows;
}

module.exports = { veiculoExiste, buscarAtendimentos, buscarServicos, buscarPecas };