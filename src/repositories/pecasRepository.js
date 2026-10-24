const { pool } = require('../config/database');

// Situação de disponibilidade calculada a partir das quantidades.
const SITUACAO_SQL = `CASE
  WHEN p.quantidade_disponivel = 0 THEN 'indisponivel'
  WHEN p.quantidade_disponivel <= p.quantidade_minima THEN 'baixo'
  ELSE 'disponivel'
END`;

function montarFiltro({ busca = '', categoria = '', situacao = 'todas' }) {
  const condicoes = ['p.ativo = 1'];
  const parametros = [];

  if (busca) {
    condicoes.push('(p.codigo LIKE ? OR p.nome LIKE ? OR p.localizacao LIKE ?)');
    parametros.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  if (categoria) {
    condicoes.push('p.categoria = ?');
    parametros.push(categoria);
  }

  if (situacao && situacao !== 'todas') {
    condicoes.push(`${SITUACAO_SQL} = ?`);
    parametros.push(situacao);
  }

  return { where: `WHERE ${condicoes.join(' AND ')}`, parametros };
}

async function findAll({ limite, offset, ...filtros }) {
  const { where, parametros } = montarFiltro(filtros);

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM peca p ${where}`,
    parametros
  );

  const [rows] = await pool.execute(
    `SELECT
       p.id_peca AS id,
       p.codigo,
       p.nome,
       p.categoria,
       p.quantidade_disponivel AS quantidade,
       p.quantidade_minima AS quantidadeMinima,
       p.localizacao,
       p.preco,
       ${SITUACAO_SQL} AS situacao
     FROM peca p
     ${where}
     ORDER BY p.nome ASC, p.id_peca ASC
     LIMIT ? OFFSET ?`,
    [...parametros, limite, offset]
  );

  return {
    rows: rows.map((row) => ({ ...row, preco: Number(row.preco) })),
    total: countRows[0].total
  };
}

// Totais por situação, sem considerar os filtros (cartões de resumo da tela).
async function resumoPorSituacao() {
  const [rows] = await pool.execute(
    `SELECT ${SITUACAO_SQL} AS situacao, COUNT(*) AS total
     FROM peca p
     WHERE p.ativo = 1
     GROUP BY situacao`
  );

  const resumo = { total: 0, disponivel: 0, baixo: 0, indisponivel: 0 };

  for (const row of rows) {
    resumo[row.situacao] = Number(row.total);
    resumo.total += Number(row.total);
  }

  return resumo;
}

async function listarCategorias() {
  const [rows] = await pool.execute(
    'SELECT DISTINCT categoria FROM peca WHERE ativo = 1 ORDER BY categoria ASC'
  );

  return rows.map((row) => row.categoria);
}

module.exports = { findAll, resumoPorSituacao, listarCategorias, montarFiltro };
