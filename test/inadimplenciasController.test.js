const test = require('node:test');
const assert = require('node:assert/strict');

function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

const chamadas = [];
let pagamento = { registrado: true, status: 'pago' };
let quitadasDoCliente = 2;

simular('../src/repositories/cobrancasRepository', {
  async findInadimplentes(opcoes) {
    chamadas.push(['findInadimplentes', opcoes]);
    return { rows: [{ id: 1, valor: 480 }], total: 21, valorTotal: 9800 };
  },
  async findClientesInadimplentes(opcoes) {
    chamadas.push(['findClientesInadimplentes', opcoes]);
    return { rows: [{ id: 4, nome: 'Patrícia Nunes' }], total: 0 };
  },
  async resumoFinanceiro() {
    return { valorVencido: 9800, cobrancasVencidas: 21, clientesInadimplentes: 6, maiorAtrasoDias: 100, valorAVencer: 90 };
  },
  async registrarPagamento(id) {
    chamadas.push(['registrarPagamento', id]);
    return pagamento;
  },
  async registrarPagamentoDoCliente(id) {
    chamadas.push(['registrarPagamentoDoCliente', id]);
    return quitadasDoCliente;
  },
  async criarParaOrcamentoAceito(idOrcamento, prazo) {
    chamadas.push(['criarParaOrcamentoAceito', idOrcamento, prazo]);
    if (idOrcamento === 99) throw new Error('falha simulada');
    return true;
  }
});

simular('../src/repositories/orcamentosRepository', {
  async buscarPorId(id) {
    return { id, idCliente: 5, status: 'enviado', valorTotal: 300 };
  },
  async registrarDecisao() {
    return true;
  }
});

simular('../src/repositories/clientesRepository', {
  async findByUsuarioId() {
    return { id: 5 };
  }
});

simular('../src/repositories/funcionariosRepository', {});

const env = require('../src/config/env');
const inadimplencias = require('../src/controllers/inadimplenciasController');
const { decidirOrcamento } = require('../src/controllers/orcamentosController');

function resposta() {
  const res = { statusCode: 200 };
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (corpo) => {
    res.corpo = corpo;
    return res;
  };
  return res;
}

test('listar aplica paginação e filtros e devolve o valor filtrado', async () => {
  chamadas.length = 0;
  const res = resposta();

  await inadimplencias.listar(
    { query: { pagina: '2', limite: '10', busca: ' Ricardo ', faixaAtraso: 'acima90', ordenacao: 'maior_valor' } },
    res
  );

  const [, opcoes] = chamadas[0];
  assert.equal(opcoes.offset, 10);
  assert.equal(opcoes.limite, 10);
  assert.equal(opcoes.busca, 'Ricardo');
  assert.equal(opcoes.faixaAtraso, 'acima90');
  assert.equal(opcoes.ordenacao, 'maior_valor');
  assert.equal(res.corpo.valorFiltrado, 9800);
  assert.deepEqual(res.corpo.paginacao, { pagina: 2, limite: 10, total: 21, totalPaginas: 3 });
});

test('listar rejeita filtro inválido com erro 400 antes de consultar o banco', async () => {
  chamadas.length = 0;

  await assert.rejects(
    () => inadimplencias.listar({ query: { faixaAtraso: 'x' } }, resposta()),
    { statusCode: 400 }
  );
  assert.equal(chamadas.length, 0);
});

test('listarClientes devolve a lista paginada', async () => {
  const res = resposta();

  await inadimplencias.listarClientes({ query: { ordenacao: 'cliente' } }, res);

  assert.equal(res.corpo.dados[0].nome, 'Patrícia Nunes');
  assert.equal(res.corpo.paginacao.totalPaginas, 0);
});

test('resumo devolve os totais financeiros', async () => {
  const res = resposta();

  await inadimplencias.resumo({}, res);

  assert.equal(res.corpo.dados.valorVencido, 9800);
  assert.equal(res.corpo.dados.clientesInadimplentes, 6);
});

test('aceitar um orçamento gera a cobrança com o prazo configurado', async () => {
  chamadas.length = 0;
  const res = resposta();

  await decidirOrcamento(
    { params: { id: '7' }, body: { decisao: 'aceito' }, usuarioLogado: { id: 30 } },
    res
  );

  assert.deepEqual(chamadas, [['criarParaOrcamentoAceito', 7, env.prazoPagamentoDias]]);
  assert.equal(res.corpo.mensagem, 'Orçamento aceito.');
});

test('recusar um orçamento não gera cobrança', async () => {
  chamadas.length = 0;
  const res = resposta();

  await decidirOrcamento(
    { params: { id: '7' }, body: { decisao: 'recusado' }, usuarioLogado: { id: 30 } },
    res
  );

  assert.equal(chamadas.length, 0);
  assert.equal(res.corpo.mensagem, 'Orçamento recusado.');
});

test('falha ao gerar a cobrança não desfaz o aceite do cliente', async (t) => {
  t.mock.method(console, 'error', () => {});
  const res = resposta();

  await decidirOrcamento(
    { params: { id: '99' }, body: { decisao: 'aceito' }, usuarioLogado: { id: 30 } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.corpo.mensagem, 'Orçamento aceito.');
});

test('registrarPagamento registra e responde 200', async () => {
  chamadas.length = 0;
  pagamento = { registrado: true, status: 'pago' };
  const res = resposta();

  await inadimplencias.registrarPagamento({ params: { id: '12' } }, res);

  assert.deepEqual(chamadas, [['registrarPagamento', 12]]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.corpo.mensagem, 'Pagamento registrado.');
});

test('registrarPagamento responde 404 quando a cobrança não existe', async () => {
  pagamento = { registrado: false, status: null };
  const res = resposta();

  await inadimplencias.registrarPagamento({ params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.corpo.erro, 'COBRANCA_NAO_ENCONTRADA');
});

test('registrarPagamento responde 409 para cobrança já paga ou cancelada', async () => {
  pagamento = { registrado: false, status: 'pago' };
  await assert.rejects(
    () => inadimplencias.registrarPagamento({ params: { id: '12' } }, resposta()),
    { statusCode: 409, message: 'Esta cobrança já está paga.' }
  );

  pagamento = { registrado: false, status: 'cancelado' };
  await assert.rejects(
    () => inadimplencias.registrarPagamento({ params: { id: '12' } }, resposta()),
    { statusCode: 409, message: /cancelada/ }
  );
});

test('registrarPagamento rejeita id inválido com 400, sem tocar no banco', async () => {
  chamadas.length = 0;

  for (const id of ['abc', '0', '-1', '1.5']) {
    await assert.rejects(
      () => inadimplencias.registrarPagamento({ params: { id } }, resposta()),
      { statusCode: 400 },
      id
    );
  }
  assert.equal(chamadas.length, 0);
});

test('registrarPagamentoCliente informa quantas cobranças foram quitadas', async () => {
  chamadas.length = 0;
  const res = resposta();

  quitadasDoCliente = 2;
  await inadimplencias.registrarPagamentoCliente({ params: { id: '4' } }, res);
  assert.deepEqual(chamadas, [['registrarPagamentoDoCliente', 4]]);
  assert.equal(res.corpo.quantidade, 2);
  assert.equal(res.corpo.mensagem, 'Pagamento de 2 cobranças registrado.');

  quitadasDoCliente = 1;
  const um = resposta();
  await inadimplencias.registrarPagamentoCliente({ params: { id: '4' } }, um);
  assert.equal(um.corpo.mensagem, 'Pagamento de 1 cobrança registrado.');
});

test('registrarPagamentoCliente responde 409 quando o cliente não deve nada vencido', async () => {
  quitadasDoCliente = 0;

  await assert.rejects(
    () => inadimplencias.registrarPagamentoCliente({ params: { id: '4' } }, resposta()),
    { statusCode: 409 }
  );
});
