const { pool } = require('../config/database');
const { montarResumo } = require('../utils/financeiro');

// A tabela "cobranca" pertence ao módulo de inadimplências. Se ela ainda não existe
// neste banco, o financeiro funciona só com os lançamentos manuais. Uma vez que a
// tabela existe, a resposta fica guardada; enquanto não existe, é consultada de novo.
let cobrancasDisponiveis = false;

async function temCobrancas() {
  if (cobrancasDisponiveis) return true;

  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'cobranca'
     LIMIT 1`
  );

  cobrancasDisponiveis = rows.length > 0;
  return cobrancasDisponiveis;
}

// Lançamentos manuais + entradas de cobranças pagas, no mesmo formato.
function fonteDeMovimentacoes(incluirCobrancas) {
  const manuais = `
    SELECT
      CONCAT('M', m.id_movimentacao) AS id,
      'manual' AS origem,
      m.tipo AS tipo,
      m.categoria AS categoria,
      m.descricao AS descricao,
      m.valor AS valor,
      m.data_movimentacao AS data,
      m.forma_pagamento AS formaPagamento,
      m.criado_em AS registradoEm
    FROM movimentacao_financeira m`;

  if (!incluirCobrancas) return manuais;

  return `${manuais}
    UNION ALL
    SELECT
      CONCAT('C', c.id_cobranca),
      'cobranca',
      'entrada',
      'Serviços',
      c.descricao,
      c.valor,
      DATE(c.data_pagamento),
      NULL,
      c.data_pagamento
    FROM cobranca c
    WHERE c.status = 'pago' AND c.data_pagamento IS NOT NULL`;
}

function montarFiltro({ inicio = '', fim = '', tipo = '', categoria = '', busca = '' } = {}) {
  const condicoes = [];
  const parametros = [];

  if (inicio) {
    condicoes.push('mov.data >= ?');
    parametros.push(inicio);
  }

  if (fim) {
    condicoes.push('mov.data <= ?');
    parametros.push(fim);
  }

  if (tipo) {
    condicoes.push('mov.tipo = ?');
    parametros.push(tipo);
  }

  if (categoria) {
    condicoes.push('mov.categoria = ?');
    parametros.push(categoria);
  }

  if (busca) {
    condicoes.push('mov.descricao LIKE ?');
    parametros.push(`%${busca}%`);
  }

  return {
    where: condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '',
    parametros
  };
}

async function listar(filtros, { limite, offset }) {
  const fonte = fonteDeMovimentacoes(await temCobrancas());
  const { where, parametros } = montarFiltro(filtros);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM (${fonte}) mov ${where}`,
    parametros
  );

  const [rows] = await pool.execute(
    `SELECT mov.id, mov.origem, mov.tipo, mov.categoria, mov.descricao, mov.valor,
            mov.data, mov.formaPagamento
     FROM (${fonte}) mov
     ${where}
     ORDER BY mov.data DESC, mov.registradoEm DESC, mov.id DESC
     LIMIT ? OFFSET ?`,
    [...parametros, limite, offset]
  );

  return {
    rows: rows.map((row) => ({ ...row, valor: Number(row.valor) })),
    total: Number(countRows[0].total)
  };
}

async function resumo(filtros) {
  const fonte = fonteDeMovimentacoes(await temCobrancas());
  const { where, parametros } = montarFiltro(filtros);

  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN mov.tipo = 'entrada' THEN mov.valor END), 0) AS entradas,
       COALESCE(SUM(CASE WHEN mov.tipo = 'saida' THEN mov.valor END), 0) AS saidas,
       COUNT(*) AS quantidade
     FROM (${fonte}) mov
     ${where}`,
    parametros
  );

  return montarResumo({
    entradas: Number(rows[0].entradas),
    saidas: Number(rows[0].saidas),
    quantidade: Number(rows[0].quantidade)
  });
}

async function criar({ tipo, categoria, descricao, valor, data, formaPagamento, idUsuario }) {
  const [resultado] = await pool.execute(
    `INSERT INTO movimentacao_financeira
       (tipo, categoria, descricao, valor, data_movimentacao, forma_pagamento, id_usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tipo, categoria, descricao, valor, data, formaPagamento, idUsuario]
  );

  return resultado.insertId;
}

module.exports = { listar, resumo, criar, montarFiltro, temCobrancas };
