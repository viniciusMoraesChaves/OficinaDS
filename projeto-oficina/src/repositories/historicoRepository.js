// Histórico do veículo, montado a partir das tabelas do sistema:
//   atendimento      -> data, status e responsável
//   orcamento        -> problema relatado (situação do veículo)
//   orcamento_item   -> serviços realizados (orçamentos aceitos)
//   diagnostico      -> diagnóstico (via ordem_servico ligada ao atendimento)
//   peca_utilizada   -> peças
// As colunas devolvidas têm os mesmos nomes que o front-end já espera.
const { pool } = require('../config/database');

async function veiculoExiste(idVeiculo) {
  const [rows] = await pool.query('SELECT 1 FROM veiculo WHERE id_veiculo = ? LIMIT 1', [idVeiculo]);
  return rows.length > 0;
}

async function buscarAtendimentos(idVeiculo, { inicio, fim } = {}) {
  const [rows] = await pool.query(
    `SELECT
       a.id_atendimento,
       a.criado_em AS data_atendimento,
       CASE a.status
         WHEN 'concluido' THEN 'Concluído'
         WHEN 'cancelado' THEN 'Cancelado'
         ELSE CASE
           WHEN EXISTS (
             SELECT 1 FROM orcamento oa
             WHERE oa.id_atendimento = a.id_atendimento AND oa.status = 'aceito'
           ) THEN 'Em andamento'
           ELSE 'Aberto'
         END
       END AS status,
       COALESCE(
         (SELECT o.situacao_veiculo FROM orcamento o
          WHERE o.id_atendimento = a.id_atendimento
          ORDER BY o.id_orcamento DESC LIMIT 1),
         CONCAT('Atendimento #', a.id_atendimento)
       ) AS problema_relatado,
       (SELECT d.descricao
        FROM diagnostico d
        INNER JOIN ordem_servico os ON os.id_ordem = d.id_ordem
        WHERE os.id_atendimento = a.id_atendimento
        ORDER BY d.data_hora DESC, d.id_diagnostico DESC LIMIT 1) AS diagnostico,
       f.nome AS mecanico
     FROM atendimento a
     LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario
     WHERE a.id_veiculo = ?
       AND (? IS NULL OR a.criado_em >= ?)
       AND (? IS NULL OR a.criado_em < DATE_ADD(?, INTERVAL 1 DAY))
     ORDER BY a.criado_em DESC, a.id_atendimento DESC`,
    [idVeiculo, inicio || null, inicio || null, fim || null, fim || null]
  );
  return rows;
}

// Serviços realizados = itens dos orçamentos aceitos (uma única consulta, sem N+1).
async function buscarServicos(idsAtendimento) {
  if (!idsAtendimento.length) return [];
  const [rows] = await pool.query(
    `SELECT o.id_atendimento, i.descricao, i.valor
     FROM orcamento_item i
     INNER JOIN orcamento o ON o.id_orcamento = i.id_orcamento
     WHERE o.id_atendimento IN (?) AND o.status = 'aceito'
     ORDER BY i.id_orcamento_item`,
    [idsAtendimento]
  );
  return rows;
}

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
