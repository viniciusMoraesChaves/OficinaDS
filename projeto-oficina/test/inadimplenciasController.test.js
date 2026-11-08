const test = require('node:test');
const assert = require('node:assert/strict');

function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

const chamadas = [];

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

test('aceitar um orçamento gera a cobrança com o prazo de 15 dias', async () => {
  chamadas.length = 0;
  const res = resposta();

  await decidirOrcamento(
    { params: { id: '7' }, body: { decisao: 'aceito' }, usuarioLogado: { id: 30 } },
    res
  );

  assert.deepEqual(chamadas, [['criarParaOrcamentoAceito', 7, 15]]);
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
