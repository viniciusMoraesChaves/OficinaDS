const { pool } = require('../config/database');
const { STATUS } = require('../utils/pedidosPecas');

// Datas saem do MySQL como texto 'AAAA-MM-DDTHH:mm:ss' (horário local da oficina).
const FORMATO_DATA_HORA = '%Y-%m-%dT%H:%i:%s';

const SELECT_PEDIDO = `
  SELECT
    p.id_pedido AS id,
    p.status,
    p.observacao,
    p.motivo_decisao AS motivoDecisao,
    p.id_funcionario AS funcionarioId,
    f.nome AS solicitante,
    p.id_atendimento AS atendimentoId,
    c.nome AS cliente,
    v.placa,
    v.marca,
    v.modelo,
    DATE_FORMAT(p.criado_em, '${FORMATO_DATA_HORA}') AS criadoEm,
    DATE_FORMAT(p.enviado_em, '${FORMATO_DATA_HORA}') AS enviadoEm,
    DATE_FORMAT(p.decidido_em, '${FORMATO_DATA_HORA}') AS decididoEm,
    COALESCE(df.nome, du.email) AS decididoPor,
    (SELECT COUNT(*) FROM pedido_peca_item i WHERE i.id_pedido = p.id_pedido) AS totalItens,
    (SELECT COALESCE(SUM(i.quantidade), 0) FROM pedido_peca_item i
      WHERE i.id_pedido = p.id_pedido) AS totalUnidades
  FROM pedido_peca p
  INNER JOIN funcionario f ON f.id_funcionario = p.id_funcionario
  LEFT JOIN atendimento a ON a.id_atendimento = p.id_atendimento
  LEFT JOIN cliente c ON c.id_cliente = a.id_cliente
  LEFT JOIN veiculo v ON v.id_veiculo = a.id_veiculo
  LEFT JOIN usuario du ON du.id_usuario = p.decidido_por
  LEFT JOIN funcionario df ON df.id_usuario = p.decidido_por`;

function normalizar(linha) {
  return {
    ...linha,
    totalItens: Number(linha.totalItens),
    totalUnidades: Number(linha.totalUnidades)
  };
}

// funcionarioId = null: sem restrição (Administrador). Com número: só pedidos dele.
function montarFiltro({ status = 'todos', funcionarioId = null }) {
  const condicoes = [];
  const parametros = [];

  if (status && status !== 'todos') {
    condicoes.push('p.status = ?');
    parametros.push(status);
  }

  if (funcionarioId !== null) {
    condicoes.push('p.id_funcionario = ?');
    parametros.push(funcionarioId);
  }

  return {
    where: condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '',
    parametros
  };
}

async function findAll({ limite, offset, ...filtros }) {
  const { where, parametros } = montarFiltro(filtros);

  const [contagem] = await pool.execute(
    `SELECT COUNT(*) AS total FROM pedido_peca p ${where}`,
    parametros
  );

  // Pedidos aguardando decisão primeiro, depois os mais recentes.
  const [rows] = await pool.execute(
    `${SELECT_PEDIDO}
     ${where}
     ORDER BY (p.status = 'enviado') DESC, p.criado_em DESC, p.id_pedido DESC
     LIMIT ? OFFSET ?`,
    [...parametros, limite, offset]
  );

  return { rows: rows.map(normalizar), total: contagem[0].total };
}

// Totais por status, sem considerar o filtro de status (cartões de resumo da tela).
async function resumoPorStatus({ funcionarioId = null } = {}) {
  const { where, parametros } = montarFiltro({ funcionarioId });

  const [rows] = await pool.execute(
    `SELECT p.status, COUNT(*) AS total FROM pedido_peca p ${where} GROUP BY p.status`,
    parametros
  );

  const resumo = { total: 0, rascunho: 0, enviado: 0, aprovado: 0, rejeitado: 0 };

  for (const linha of rows) {
    resumo[linha.status] = Number(linha.total);
    resumo.total += Number(linha.total);
  }

  return resumo;
}

async function findById(id) {
  const [rows] = await pool.execute(`${SELECT_PEDIDO} WHERE p.id_pedido = ?`, [id]);
  return rows[0] ? normalizar(rows[0]) : null;
}

async function findItens(pedidoId) {
  const [rows] = await pool.execute(
    `SELECT
       i.id_item AS id,
       i.id_peca AS pecaId,
       pc.codigo,
       pc.nome,
       pc.categoria,
       i.quantidade,
       pc.quantidade_disponivel AS estoque
     FROM pedido_peca_item i
     INNER JOIN peca pc ON pc.id_peca = i.id_peca
     WHERE i.id_pedido = ?
     ORDER BY pc.nome ASC, i.id_item ASC`,
    [pedidoId]
  );

  return rows;
}

// Peças e atendimentos que o formulário de novo pedido pode oferecer.
async function findOptions() {
  const [pecas] = await pool.execute(
    `SELECT
       id_peca AS id,
       codigo,
       nome,
       categoria,
       quantidade_disponivel AS quantidade,
       localizacao
     FROM peca
     WHERE ativo = 1
     ORDER BY nome ASC, id_peca ASC`
  );

  const [atendimentos] = await pool.execute(
    `SELECT
       a.id_atendimento AS id,
       c.nome AS cliente,
       v.placa,
       v.marca,
       v.modelo
     FROM atendimento a
     INNER JOIN cliente c ON c.id_cliente = a.id_cliente
     INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
     WHERE a.status = 'aberto'
     ORDER BY a.criado_em DESC, a.id_atendimento DESC`
  );

  return { pecas, atendimentos };
}

async function findPecasAtivas(ids) {
  const marcadores = ids.map(() => '?').join(', ');

  const [rows] = await pool.execute(
    `SELECT id_peca AS id FROM peca WHERE ativo = 1 AND id_peca IN (${marcadores})`,
    ids
  );

  return rows.map((linha) => linha.id);
}

async function atendimentoAberto(id) {
  const [rows] = await pool.execute(
    `SELECT id_atendimento AS id FROM atendimento WHERE id_atendimento = ? AND status = 'aberto'`,
    [id]
  );

  return rows[0] || null;
}

async function comTransacao(trabalho) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();
    const resultado = await trabalho(conexao);
    await conexao.commit();
    return resultado;
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}

// Cria o pedido e os itens na mesma transação: ou grava tudo ou nada.
async function criar({ funcionarioId, atendimentoId, observacao, itens, enviar }) {
  const id = await comTransacao(async (conexao) => {
    const [resultado] = await conexao.execute(
      `INSERT INTO pedido_peca
         (id_funcionario, id_atendimento, observacao, status, enviado_em)
       VALUES (?, ?, ?, ?, ${enviar ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [funcionarioId, atendimentoId, observacao, enviar ? STATUS.ENVIADO : STATUS.RASCUNHO]
    );

    for (const item of itens) {
      await conexao.execute(
        `INSERT INTO pedido_peca_item (id_pedido, id_peca, quantidade) VALUES (?, ?, ?)`,
        [resultado.insertId, item.pecaId, item.quantidade]
      );
    }

    return resultado.insertId;
  });

  return findById(id);
}

// Muda rascunho -> enviado. A condição no WHERE garante que só funciona uma vez
// e só para o dono; devolve false se o pedido já não estava mais em rascunho.
async function enviar(id, funcionarioId) {
  const [resultado] = await pool.execute(
    `UPDATE pedido_peca
     SET status = ?, enviado_em = CURRENT_TIMESTAMP
     WHERE id_pedido = ? AND id_funcionario = ? AND status = ?`,
    [STATUS.ENVIADO, id, funcionarioId, STATUS.RASCUNHO]
  );

  return resultado.affectedRows > 0;
}

// Muda enviado -> aprovado ou rejeitado. Se outro administrador decidir antes,
// o WHERE não encontra mais o pedido "enviado" e devolve false.
async function decidir(id, { status, motivo, usuarioId }) {
  const [resultado] = await pool.execute(
    `UPDATE pedido_peca
     SET status = ?, motivo_decisao = ?, decidido_por = ?, decidido_em = CURRENT_TIMESTAMP
     WHERE id_pedido = ? AND status = ?`,
    [status, motivo, usuarioId, id, STATUS.ENVIADO]
  );

  return resultado.affectedRows > 0;
}

module.exports = {
  findAll,
  resumoPorStatus,
  findById,
  findItens,
  findOptions,
  findPecasAtivas,
  atendimentoAberto,
  criar,
  enviar,
  decidir
};
