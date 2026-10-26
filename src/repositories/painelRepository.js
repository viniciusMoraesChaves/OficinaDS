const { pool } = require('../config/database');

const LIMITE_LISTA = 5;

// Cada indicador é consultado separadamente. Se a tabela de um módulo ainda não
// existe neste banco (script não executado), aquele indicador volta `null` e some
// da tela, em vez de derrubar o painel inteiro.
async function tentar(consulta) {
  try {
    return await consulta();
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      console.warn(`Painel: indicador indisponível (${error.code}): ${error.message}`);
      return null;
    }

    throw error;
  }
}

async function contar(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return Number(rows[0].total);
}

async function listar(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

const SEM_DIAGNOSTICO = `
  FROM ordem_servico os
  INNER JOIN atendimento a ON a.id_atendimento = os.id_atendimento
  WHERE a.status IN ('aberto', 'concluido')
    AND os.data_fechamento IS NULL
    AND NOT EXISTS (SELECT 1 FROM diagnostico d WHERE d.id_ordem = os.id_ordem)`;

async function contagensEquipe({ administrador = false } = {}) {
  const [
    atendimentosAbertos,
    orcamentosAguardando,
    semDiagnostico,
    estoqueAtencao,
    estoqueIndisponivel,
    funcionariosAtivos
  ] = await Promise.all([
    tentar(() => contar(`SELECT COUNT(*) AS total FROM atendimento WHERE status = 'aberto'`)),
    tentar(() => contar(`SELECT COUNT(*) AS total FROM orcamento WHERE status = 'enviado'`)),
    tentar(() => contar(`SELECT COUNT(*) AS total ${SEM_DIAGNOSTICO}`)),
    tentar(() => contar(
      `SELECT COUNT(*) AS total FROM peca WHERE ativo = 1 AND quantidade_disponivel <= quantidade_minima`
    )),
    tentar(() => contar(
      `SELECT COUNT(*) AS total FROM peca WHERE ativo = 1 AND quantidade_disponivel = 0`
    )),
    administrador
      ? tentar(() => contar('SELECT COUNT(*) AS total FROM funcionario WHERE ativo = 1'))
      : Promise.resolve(null)
  ]);

  return {
    atendimentosAbertos,
    orcamentosAguardando,
    semDiagnostico,
    estoqueAtencao,
    estoqueIndisponivel,
    funcionariosAtivos
  };
}

async function listasEquipe() {
  const [orcamentos, semDiagnostico, estoque] = await Promise.all([
    tentar(() => listar(
      `SELECT
         o.id_orcamento AS id,
         c.nome AS cliente,
         v.placa, v.marca, v.modelo,
         o.valor_total AS valorTotal,
         o.enviado_em AS enviadoEm
       FROM orcamento o
       INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
       INNER JOIN cliente c ON c.id_cliente = a.id_cliente
       INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
       WHERE o.status = 'enviado'
       ORDER BY o.enviado_em ASC, o.id_orcamento ASC
       LIMIT ${LIMITE_LISTA}`
    )),
    tentar(() => listar(
      `SELECT
         a.id_atendimento AS id,
         c.nome AS cliente,
         v.placa, v.marca, v.modelo,
         a.criado_em AS criadoEm
       FROM ordem_servico os
       INNER JOIN atendimento a ON a.id_atendimento = os.id_atendimento
       INNER JOIN cliente c ON c.id_cliente = a.id_cliente
       INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
       WHERE a.status IN ('aberto', 'concluido')
         AND os.data_fechamento IS NULL
         AND NOT EXISTS (SELECT 1 FROM diagnostico d WHERE d.id_ordem = os.id_ordem)
       ORDER BY a.criado_em ASC, a.id_atendimento ASC
       LIMIT ${LIMITE_LISTA}`
    )),
    tentar(() => listar(
      `SELECT
         id_peca AS id,
         codigo,
         nome,
         quantidade_disponivel AS quantidade,
         quantidade_minima AS quantidadeMinima,
         localizacao
       FROM peca
       WHERE ativo = 1 AND quantidade_disponivel <= quantidade_minima
       ORDER BY quantidade_disponivel ASC, nome ASC
       LIMIT ${LIMITE_LISTA}`
    ))
  ]);

  return { orcamentos, semDiagnostico, estoque };
}

async function contagensCliente(idCliente) {
  const [orcamentosAguardando, atendimentosAbertos] = await Promise.all([
    tentar(() => contar(
      `SELECT COUNT(*) AS total
       FROM orcamento o
       INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
       WHERE a.id_cliente = ? AND o.status = 'enviado'`,
      [idCliente]
    )),
    tentar(() => contar(
      `SELECT COUNT(*) AS total FROM atendimento WHERE id_cliente = ? AND status = 'aberto'`,
      [idCliente]
    ))
  ]);

  return { orcamentosAguardando, atendimentosAbertos };
}

async function listasCliente(idCliente) {
  const orcamentos = await tentar(() => listar(
    `SELECT
       o.id_orcamento AS id,
       v.placa, v.marca, v.modelo,
       o.valor_total AS valorTotal,
       o.enviado_em AS enviadoEm
     FROM orcamento o
     INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
     INNER JOIN veiculo v ON v.id_veiculo = a.id_veiculo
     WHERE a.id_cliente = ? AND o.status = 'enviado'
     ORDER BY o.enviado_em ASC, o.id_orcamento ASC
     LIMIT ${LIMITE_LISTA}`,
    [idCliente]
  ));

  return { orcamentos };
}

module.exports = {
  contagensEquipe,
  listasEquipe,
  contagensCliente,
  listasCliente
};
