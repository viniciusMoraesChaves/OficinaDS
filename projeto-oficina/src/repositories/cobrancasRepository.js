const { pool } = require('../config/database');
const { FAIXAS_ATRASO } = require('../utils/inadimplencias');

// Inadimplente = cobrança ainda pendente cujo vencimento já passou.
// Quem vence hoje ainda está em dia. O atraso é calculado na consulta, então
// nada precisa ser atualizado quando o tempo passa.
const VENCIDA_SQL = `c.status = 'pendente' AND c.data_vencimento < CURDATE()`;
const ATRASO_SQL = 'DATEDIFF(CURDATE(), c.data_vencimento)';

const ORDEM_COBRANCAS = {
  maior_atraso: 'c.data_vencimento ASC',
  menor_atraso: 'c.data_vencimento DESC',
  maior_valor: 'c.valor DESC',
  menor_valor: 'c.valor ASC',
  cliente: 'cl.nome ASC'
};

const ORDEM_CLIENTES = {
  maior_valor: 'valorEmAberto DESC',
  maior_atraso: 'maiorAtrasoDias DESC',
  mais_cobrancas: 'quantidadeCobrancas DESC',
  cliente: 'cl.nome ASC'
};

// Busca por nome ou CPF (com ou sem pontuação) e, na lista de cobranças, também por placa.
function condicoesDeBusca(busca, { incluirPlaca }) {
  if (!busca) {
    return { condicao: null, parametros: [] };
  }

  const partes = ['cl.nome LIKE ?'];
  const parametros = [`%${busca}%`];

  // Só procura CPF quando o texto parece um CPF (dígitos, ponto e traço). Assim a
  // placa "ABC-1D23" não traz clientes cujo CPF contém "123".
  const digitos = busca.replace(/\D/g, '');
  if (digitos && /^[\d.\-\s]+$/.test(busca)) {
    partes.push('cl.cpf LIKE ?');
    parametros.push(`%${digitos}%`);
  }

  const alfanumerico = busca.replace(/[^0-9a-z]/gi, '');
  if (incluirPlaca && alfanumerico) {
    partes.push(`REPLACE(v.placa, '-', '') LIKE ?`);
    parametros.push(`%${alfanumerico}%`);
  }

  return { condicao: `(${partes.join(' OR ')})`, parametros };
}

function montarFiltro({
  busca = '',
  faixaAtraso = 'todas',
  valorMin = null,
  valorMax = null,
  vencimentoDe = '',
  vencimentoAte = ''
} = {}) {
  const condicoes = [VENCIDA_SQL];
  const parametros = [];

  const textual = condicoesDeBusca(busca, { incluirPlaca: true });
  if (textual.condicao) {
    condicoes.push(textual.condicao);
    parametros.push(...textual.parametros);
  }

  const faixa = FAIXAS_ATRASO[faixaAtraso];
  if (faixa) {
    condicoes.push(`${ATRASO_SQL} >= ?`);
    parametros.push(faixa.min);

    if (faixa.max !== null) {
      condicoes.push(`${ATRASO_SQL} <= ?`);
      parametros.push(faixa.max);
    }
  }

  if (valorMin !== null) {
    condicoes.push('c.valor >= ?');
    parametros.push(valorMin);
  }

  if (valorMax !== null) {
    condicoes.push('c.valor <= ?');
    parametros.push(valorMax);
  }

  if (vencimentoDe) {
    condicoes.push('c.data_vencimento >= ?');
    parametros.push(vencimentoDe);
  }

  if (vencimentoAte) {
    condicoes.push('c.data_vencimento <= ?');
    parametros.push(vencimentoAte);
  }

  return { where: `WHERE ${condicoes.join(' AND ')}`, parametros };
}

const DE_COBRANCAS = `
  FROM cobranca c
  INNER JOIN cliente cl ON cl.id_cliente = c.id_cliente
  LEFT JOIN veiculo v ON v.id_veiculo = c.id_veiculo`;

// Cobranças vencidas e não pagas, com os filtros e a ordenação escolhidos.
async function findInadimplentes({ limite, offset, ordenacao = 'maior_atraso', ...filtros }) {
  const { where, parametros } = montarFiltro(filtros);
  const ordem = ORDEM_COBRANCAS[ordenacao] || ORDEM_COBRANCAS.maior_atraso;

  const [totais] = await pool.execute(
    `SELECT COUNT(*) AS total, COALESCE(SUM(c.valor), 0) AS valorTotal
     ${DE_COBRANCAS}
     ${where}`,
    parametros
  );

  const [rows] = await pool.execute(
    `SELECT
       c.id_cobranca AS id,
       c.descricao,
       c.valor,
       DATE_FORMAT(c.data_vencimento, '%Y-%m-%d') AS dataVencimento,
       ${ATRASO_SQL} AS diasAtraso,
       c.id_orcamento AS idOrcamento,
       cl.id_cliente AS idCliente,
       cl.nome AS clienteNome,
       cl.cpf AS clienteCpf,
       cl.telefone AS clienteTelefone,
       v.id_veiculo AS idVeiculo,
       v.placa,
       v.marca,
       v.modelo
     ${DE_COBRANCAS}
     ${where}
     ORDER BY ${ordem}, c.id_cobranca ASC
     LIMIT ? OFFSET ?`,
    [...parametros, limite, offset]
  );

  return {
    rows: rows.map((row) => ({
      ...row,
      valor: Number(row.valor),
      diasAtraso: Number(row.diasAtraso)
    })),
    total: Number(totais[0].total),
    valorTotal: Number(totais[0].valorTotal)
  };
}

// Clientes com ao menos uma cobrança vencida, somando o que cada um deve.
async function findClientesInadimplentes({ limite, offset, busca = '', ordenacao = 'maior_valor' }) {
  const condicoes = [VENCIDA_SQL];
  const parametros = [];

  const textual = condicoesDeBusca(busca, { incluirPlaca: false });
  if (textual.condicao) {
    condicoes.push(textual.condicao);
    parametros.push(...textual.parametros);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;
  const ordem = ORDEM_CLIENTES[ordenacao] || ORDEM_CLIENTES.maior_valor;
  const de = `FROM cobranca c INNER JOIN cliente cl ON cl.id_cliente = c.id_cliente`;

  const [totais] = await pool.execute(
    `SELECT COUNT(DISTINCT c.id_cliente) AS total ${de} ${where}`,
    parametros
  );

  const [rows] = await pool.execute(
    `SELECT
       cl.id_cliente AS id,
       cl.nome,
       cl.cpf,
       cl.telefone,
       cl.email,
       COUNT(*) AS quantidadeCobrancas,
       SUM(c.valor) AS valorEmAberto,
       DATE_FORMAT(MIN(c.data_vencimento), '%Y-%m-%d') AS vencimentoMaisAntigo,
       MAX(${ATRASO_SQL}) AS maiorAtrasoDias
     ${de}
     ${where}
     GROUP BY cl.id_cliente, cl.nome, cl.cpf, cl.telefone, cl.email
     ORDER BY ${ordem}, cl.nome ASC
     LIMIT ? OFFSET ?`,
    [...parametros, limite, offset]
  );

  return {
    rows: rows.map((row) => ({
      ...row,
      quantidadeCobrancas: Number(row.quantidadeCobrancas),
      valorEmAberto: Number(row.valorEmAberto),
      maiorAtrasoDias: Number(row.maiorAtrasoDias)
    })),
    total: Number(totais[0].total)
  };
}

// Números dos cartões da tela, sem considerar os filtros.
async function resumoFinanceiro() {
  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN c.data_vencimento < CURDATE() THEN c.valor END), 0) AS valorVencido,
       COUNT(CASE WHEN c.data_vencimento < CURDATE() THEN 1 END) AS cobrancasVencidas,
       COUNT(DISTINCT CASE WHEN c.data_vencimento < CURDATE() THEN c.id_cliente END) AS clientesInadimplentes,
       COALESCE(MAX(CASE WHEN c.data_vencimento < CURDATE() THEN ${ATRASO_SQL} END), 0) AS maiorAtrasoDias,
       COALESCE(SUM(CASE WHEN c.data_vencimento >= CURDATE() THEN c.valor END), 0) AS valorAVencer
     FROM cobranca c
     WHERE c.status = 'pendente'`
  );

  const linha = rows[0];

  return {
    valorVencido: Number(linha.valorVencido),
    cobrancasVencidas: Number(linha.cobrancasVencidas),
    clientesInadimplentes: Number(linha.clientesInadimplentes),
    maiorAtrasoDias: Number(linha.maiorAtrasoDias),
    valorAVencer: Number(linha.valorAVencer)
  };
}

// Chamado quando o cliente aceita o orçamento: o valor total vira uma cobrança
// com vencimento daqui a `prazoDias`. Se já existir cobrança do orçamento, não duplica.
async function criarParaOrcamentoAceito(idOrcamento, prazoDias) {
  if (!Number.isInteger(prazoDias) || prazoDias < 0 || prazoDias > 365) {
    throw new RangeError('prazoDias deve ser um inteiro entre 0 e 365.');
  }

  const [resultado] = await pool.execute(
    `INSERT INTO cobranca
       (id_cliente, id_veiculo, id_orcamento, descricao, valor, data_vencimento)
     SELECT
       a.id_cliente,
       a.id_veiculo,
       o.id_orcamento,
       CONCAT('Orçamento #', o.id_orcamento, ' (atendimento #', a.id_atendimento, ')'),
       o.valor_total,
       DATE_ADD(CURDATE(), INTERVAL ${prazoDias} DAY)
     FROM orcamento o
     INNER JOIN atendimento a ON a.id_atendimento = o.id_atendimento
     WHERE o.id_orcamento = ?
       AND o.status = 'aceito'
       AND o.valor_total > 0
       AND NOT EXISTS (SELECT 1 FROM cobranca x WHERE x.id_orcamento = o.id_orcamento)`,
    [idOrcamento]
  );

  return resultado.affectedRows > 0;
}

// Resumo usado pelo painel inicial do Administrador.
async function contagemVencidas() {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS quantidade, COALESCE(SUM(c.valor), 0) AS valor
     FROM cobranca c
     WHERE ${VENCIDA_SQL}`
  );

  return { quantidade: Number(rows[0].quantidade), valor: Number(rows[0].valor) };
}

module.exports = {
  montarFiltro,
  findInadimplentes,
  findClientesInadimplentes,
  resumoFinanceiro,
  criarParaOrcamentoAceito,
  contagemVencidas
};
