const { pool } = require('../config/database');
const { ConflitoError } = require('../utils/erros');

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

async function darBaixa({ idPeca, quantidade, motivo, idUsuario }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pecas] = await connection.execute(
      `SELECT id_peca, nome, quantidade_disponivel
       FROM peca
       WHERE id_peca = ? AND ativo = 1
       FOR UPDATE`,
      [idPeca]
    );

    if (pecas.length === 0) {
      await connection.rollback();
      return null;
    }

    const peca = pecas[0];
    if (quantidade > peca.quantidade_disponivel) {
      throw new ConflitoError(
        `Quantidade indisponível. Existem ${peca.quantidade_disponivel} unidade(s) em estoque.`
      );
    }

    const novaQuantidade = peca.quantidade_disponivel - quantidade;
    await connection.execute(
      'UPDATE peca SET quantidade_disponivel = ? WHERE id_peca = ?',
      [novaQuantidade, idPeca]
    );

    const [resultado] = await connection.execute(
      `INSERT INTO baixa_peca (id_peca, quantidade, motivo, id_usuario)
       VALUES (?, ?, ?, ?)`,
      [idPeca, quantidade, motivo, idUsuario]
    );

    await connection.commit();
    return {
      id: resultado.insertId,
      idPeca,
      pecaNome: peca.nome,
      quantidade,
      motivo,
      quantidadeDisponivel: novaQuantidade
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listarBaixasRecentes(limite = 20) {
  const [rows] = await pool.execute(
    `SELECT
       b.id_baixa AS id,
       b.quantidade,
       b.motivo,
       b.criada_em AS criadaEm,
       p.id_peca AS idPeca,
       p.codigo AS pecaCodigo,
       p.nome AS pecaNome,
       COALESCE(f.nome, c.nome, u.email) AS usuarioNome
     FROM baixa_peca b
     INNER JOIN peca p ON p.id_peca = b.id_peca
     INNER JOIN usuario u ON u.id_usuario = b.id_usuario
     LEFT JOIN funcionario f ON f.id_usuario = u.id_usuario
     LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
     ORDER BY b.criada_em DESC, b.id_baixa DESC
     LIMIT ?`,
    [limite]
  );
  return rows;
}

module.exports = {
  findAll,
  resumoPorSituacao,
  listarCategorias,
  montarFiltro,
  darBaixa,
  listarBaixasRecentes
};
