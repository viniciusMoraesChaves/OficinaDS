const { pool } = require('../config/database');
const { ConflitoError } = require('../utils/erros');

function erroNaoEncontrado(mensagem) {
  const error = new Error(mensagem);
  error.statusCode = 404;
  error.codigo = 'NAO_ENCONTRADO';
  return error;
}

async function listar(idAtendimento) {
  const [rows] = await pool.execute(
    `SELECT
       pu.id_peca_utilizada AS id,
       pu.id_peca AS idPeca,
       p.codigo,
       pu.nome_peca AS nome,
       pu.quantidade,
       pu.valor_unitario AS valorUnitario,
       p.quantidade_disponivel AS estoqueDisponivel
     FROM peca_utilizada pu
     LEFT JOIN peca p ON p.id_peca = pu.id_peca
     WHERE pu.id_atendimento = ?
     ORDER BY pu.id_peca_utilizada ASC`,
    [idAtendimento]
  );

  return rows.map((row) => ({
    ...row,
    valorUnitario: Number(row.valorUnitario),
    estoqueDisponivel: row.estoqueDisponivel === null
      ? null
      : Number(row.estoqueDisponivel)
  }));
}

async function buscarAtendimentoAberto(connection, idAtendimento) {
  const [rows] = await connection.execute(
    `SELECT a.status, os.id_ordem AS idOrdem
     FROM atendimento a
     INNER JOIN ordem_servico os ON os.id_atendimento = a.id_atendimento
     WHERE a.id_atendimento = ?
     FOR UPDATE`,
    [idAtendimento]
  );

  if (rows.length === 0) {
    throw erroNaoEncontrado('Atendimento ou ordem de serviço não encontrado.');
  }

  if (rows[0].status !== 'aberto') {
    throw new ConflitoError('Somente atendimentos abertos podem ter peças alteradas.');
  }

  return rows[0];
}

async function buscarPecaParaAtualizacao(connection, idPeca, exigirAtiva = false) {
  const [rows] = await connection.execute(
    `SELECT id_peca AS id, codigo, nome, preco,
            quantidade_disponivel AS quantidadeDisponivel, ativo
     FROM peca
     WHERE id_peca = ?${exigirAtiva ? ' AND ativo = 1' : ''}
     FOR UPDATE`,
    [idPeca]
  );

  if (rows.length === 0) {
    throw erroNaoEncontrado('Peça não encontrada ou inativa.');
  }

  return rows[0];
}

async function adicionar({ idAtendimento, idPeca, quantidade }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const atendimento = await buscarAtendimentoAberto(connection, idAtendimento);
    const peca = await buscarPecaParaAtualizacao(connection, idPeca, true);

    if (quantidade > peca.quantidadeDisponivel) {
      throw new ConflitoError(
        `Estoque insuficiente. Existem ${peca.quantidadeDisponivel} unidade(s) disponível(is).`
      );
    }

    const novaQuantidade = peca.quantidadeDisponivel - quantidade;
    await connection.execute(
      'UPDATE peca SET quantidade_disponivel = ? WHERE id_peca = ?',
      [novaQuantidade, idPeca]
    );

    const [resultado] = await connection.execute(
      `INSERT INTO peca_utilizada
         (id_atendimento, id_ordem, id_peca, nome_peca, quantidade, valor_unitario)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        idAtendimento,
        atendimento.idOrdem,
        idPeca,
        peca.nome,
        quantidade,
        peca.preco
      ]
    );

    await connection.commit();

    return {
      id: resultado.insertId,
      idPeca,
      codigo: peca.codigo,
      nome: peca.nome,
      quantidade,
      valorUnitario: Number(peca.preco),
      estoqueDisponivel: novaQuantidade
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function editar({ idAtendimento, idPecaUtilizada, quantidade }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await buscarAtendimentoAberto(connection, idAtendimento);

    const [usos] = await connection.execute(
      `SELECT id_peca, quantidade
       FROM peca_utilizada
       WHERE id_peca_utilizada = ? AND id_atendimento = ?
       FOR UPDATE`,
      [idPecaUtilizada, idAtendimento]
    );

    if (usos.length === 0) {
      throw erroNaoEncontrado('Peça utilizada não encontrada neste atendimento.');
    }

    const uso = usos[0];
    const peca = await buscarPecaParaAtualizacao(connection, uso.id_peca);
    const diferenca = quantidade - uso.quantidade;

    if (diferenca > peca.quantidadeDisponivel) {
      throw new ConflitoError(
        `Estoque insuficiente. É possível acrescentar no máximo ${peca.quantidadeDisponivel} unidade(s).`
      );
    }

    const novoEstoque = peca.quantidadeDisponivel - diferenca;
    await connection.execute(
      'UPDATE peca SET quantidade_disponivel = ? WHERE id_peca = ?',
      [novoEstoque, uso.id_peca]
    );
    await connection.execute(
      `UPDATE peca_utilizada
       SET quantidade = ?, atualizado_em = NOW()
       WHERE id_peca_utilizada = ?`,
      [quantidade, idPecaUtilizada]
    );

    await connection.commit();
    return { id: idPecaUtilizada, quantidade, estoqueDisponivel: novoEstoque };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remover({ idAtendimento, idPecaUtilizada }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await buscarAtendimentoAberto(connection, idAtendimento);

    const [usos] = await connection.execute(
      `SELECT id_peca, quantidade
       FROM peca_utilizada
       WHERE id_peca_utilizada = ? AND id_atendimento = ?
       FOR UPDATE`,
      [idPecaUtilizada, idAtendimento]
    );

    if (usos.length === 0) {
      throw erroNaoEncontrado('Peça utilizada não encontrada neste atendimento.');
    }

    const uso = usos[0];
    const peca = await buscarPecaParaAtualizacao(connection, uso.id_peca);
    const novoEstoque = peca.quantidadeDisponivel + uso.quantidade;

    await connection.execute(
      'UPDATE peca SET quantidade_disponivel = ? WHERE id_peca = ?',
      [novoEstoque, uso.id_peca]
    );
    await connection.execute(
      'DELETE FROM peca_utilizada WHERE id_peca_utilizada = ?',
      [idPecaUtilizada]
    );

    await connection.commit();
    return { id: idPecaUtilizada, estoqueDisponivel: novoEstoque };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listar, adicionar, editar, remover };
