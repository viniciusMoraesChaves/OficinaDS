const { pool } = require('../config/database');

async function veiculoPertenceAoCliente(idVeiculo, idCliente) {
  const [rows] = await pool.execute(
    'SELECT id_veiculo FROM veiculo WHERE id_veiculo = ? AND id_cliente = ?',
    [idVeiculo, idCliente]
  );
  return rows.length > 0;
}

async function criarAtendimento({ idCliente, idVeiculo, idFuncionario }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [resultado] = await connection.execute(
      `INSERT INTO atendimento (id_cliente, id_veiculo, id_funcionario, status)
       VALUES (?, ?, ?, 'aberto')`,
      [idCliente, idVeiculo, idFuncionario]
    );

    // Todo atendimento gera a ordem de serviço usada pelos diagnósticos.
    await connection.execute(
      `INSERT INTO ordem_servico
         (id_cliente, id_veiculo, id_funcionario, id_atendimento, status, descricao_problema)
       VALUES (?, ?, ?, ?, 'Aberta', ?)`,
      [idCliente, idVeiculo, idFuncionario, resultado.insertId, `Atendimento #${resultado.insertId}`]
    );

    await connection.commit();
    return { id: resultado.insertId, idCliente, idVeiculo, idFuncionario, status: 'aberto' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listarAtendimentosAbertos() {
  const [rows] = await pool.execute(
    `SELECT
       a.id_atendimento AS id,
       a.status,
       a.criado_em AS criadoEm,
       c.id_cliente AS idCliente,
       c.nome AS clienteNome,
       v.id_veiculo AS idVeiculo,
       v.placa,
       v.marca,
       v.modelo,
       f.id_funcionario AS idFuncionario,
       COALESCE(f.nome, 'Equipe') AS funcionarioNome
     FROM atendimento a
     INNER JOIN cliente c ON c.id_cliente = a.id_cliente
     INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
     LEFT JOIN funcionario f ON f.id_funcionario = a.id_funcionario
     WHERE a.status = 'aberto'
     ORDER BY a.criado_em DESC`
  );
  return rows;
}

async function buscarAtendimentoPorId(idAtendimento) {
  const [rows] = await pool.execute(
    'SELECT id_atendimento AS id, id_cliente AS idCliente, id_veiculo AS idVeiculo, id_funcionario AS idFuncionario, status FROM atendimento WHERE id_atendimento = ?',
    [idAtendimento]
  );
  return rows[0] || null;
}

// "Remover" um atendimento o encerra: se o cliente aceitou um orçamento, o
// serviço foi realizado (concluído); caso contrário, o atendimento é cancelado.
async function cancelarAtendimento(idAtendimento) {
  const [aceitos] = await pool.execute(
    `SELECT 1 FROM orcamento WHERE id_atendimento = ? AND status = 'aceito' LIMIT 1`,
    [idAtendimento]
  );
  const realizado = aceitos.length > 0;

  const [resultado] = await pool.execute(
    `UPDATE atendimento SET status = ? WHERE id_atendimento = ? AND status = 'aberto'`,
    [realizado ? 'concluido' : 'cancelado', idAtendimento]
  );

  if (resultado.affectedRows > 0 && !realizado) {
    // Só o atendimento cancelado deixa de aceitar diagnósticos; o realizado
    // continua disponível para registrar o diagnóstico.
    await pool.execute(
      `UPDATE ordem_servico
       SET status = 'Encerrada', data_fechamento = NOW()
       WHERE id_atendimento = ? AND data_fechamento IS NULL`,
      [idAtendimento]
    );
  }

  return resultado.affectedRows > 0;
}

async function criarOrcamento({ idAtendimento, situacaoVeiculo, itens }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const valorTotal = itens.reduce((soma, item) => soma + item.valor, 0);

    const [resultadoOrcamento] = await connection.execute(
      `INSERT INTO orcamento (id_atendimento, situacao_veiculo, valor_total, status)
       VALUES (?, ?, ?, 'rascunho')`,
      [idAtendimento, situacaoVeiculo, valorTotal]
    );

    const idOrcamento = resultadoOrcamento.insertId;

    for (const item of itens) {
      await connection.execute(
        'INSERT INTO orcamento_item (id_orcamento, descricao, valor) VALUES (?, ?, ?)',
        [idOrcamento, item.descricao, item.valor]
      );
    }

    await connection.commit();

    return { id: idOrcamento, idAtendimento, situacaoVeiculo, valorTotal, status: 'rascunho', itens };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function buscarPorId(idOrcamento) {
  const [orcamentoRows] = await pool.execute(
    `SELECT
       o.id_orcamento AS id,
       o.id_atendimento AS idAtendimento,
       o.situacao_veiculo AS situacaoVeiculo,
       o.valor_total AS valorTotal,
       o.status,
       o.enviado_em AS enviadoEm,
       o.decidido_em AS decididoEm,
       o.criado_em AS criadoEm,
       a.id_cliente AS idCliente,
       a.id_veiculo AS idVeiculo,
       a.id_funcionario AS idFuncionario
     FROM orcamento o
     INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
     WHERE o.id_orcamento = ?`,
    [idOrcamento]
  );

  if (orcamentoRows.length === 0) {
    return null;
  }

  const [itensRows] = await pool.execute(
    'SELECT id_orcamento_item AS id, descricao, valor FROM orcamento_item WHERE id_orcamento = ?',
    [idOrcamento]
  );

  return { ...orcamentoRows[0], itens: itensRows };
}

async function marcarComoEnviado(idOrcamento) {
  const [resultado] = await pool.execute(
    `UPDATE orcamento SET status = 'enviado', enviado_em = NOW() WHERE id_orcamento = ? AND status = 'rascunho'`,
    [idOrcamento]
  );
  return resultado.affectedRows > 0;
}

async function registrarDecisao(idOrcamento, decisao) {
  const [resultado] = await pool.execute(
    `UPDATE orcamento SET status = ?, decidido_em = NOW() WHERE id_orcamento = ? AND status = 'enviado'`,
    [decisao, idOrcamento]
  );
  return resultado.affectedRows > 0;
}

async function listarPorCliente(idCliente) {
  const [rows] = await pool.execute(
    `SELECT
       o.id_orcamento AS id,
       o.valor_total AS valorTotal,
       o.status,
       o.enviado_em AS enviadoEm,
       o.decidido_em AS decididoEm,
       v.placa,
       v.marca,
       v.modelo
     FROM orcamento o
     INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
     INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
     WHERE a.id_cliente = ? AND o.status <> 'rascunho'
     ORDER BY o.criado_em DESC`,
    [idCliente]
  );
  return rows;
}

// Orçamentos já enviados (e suas decisões) para a equipe acompanhar.
async function listarParaEquipe() {
  const [rows] = await pool.execute(
    `SELECT
       o.id_orcamento AS id,
       o.valor_total AS valorTotal,
       o.status,
       o.enviado_em AS enviadoEm,
       o.decidido_em AS decididoEm,
       c.nome AS clienteNome,
       v.placa,
       v.marca,
       v.modelo
     FROM orcamento o
     INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
     INNER JOIN cliente c ON c.id_cliente = a.id_cliente
     INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
     WHERE o.status <> 'rascunho'
     ORDER BY COALESCE(o.decidido_em, o.enviado_em, o.criado_em) DESC, o.id_orcamento DESC
     LIMIT 100`
  );
  return rows;
}

module.exports = {
  listarParaEquipe,
  veiculoPertenceAoCliente,
  criarAtendimento,
  listarAtendimentosAbertos,
  buscarAtendimentoPorId,
  cancelarAtendimento,
  criarOrcamento,
  buscarPorId,
  marcarComoEnviado,
  registrarDecisao,
  listarPorCliente
};
