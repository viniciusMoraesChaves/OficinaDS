const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseValor,
  parseMovimentacao,
  parseFiltrosMovimentacoes,
  montarResumo,
  hojeIso
} = require('../src/utils/financeiro');

const HOJE = new Date(2026, 10, 10, 15, 0, 0); // 10/11/2026

const valido = {
  tipo: 'entrada',
  categoria: 'Serviços',
  descricao: 'Revisão completa',
  valor: '480,50',
  data: '2026-11-09',
  formaPagamento: 'pix'
};

test('parseValor aceita número, ponto, vírgula e milhar', () => {
  assert.equal(parseValor(150), 150);
  assert.equal(parseValor('150.5'), 150.5);
  assert.equal(parseValor('150,50'), 150.5);
  assert.equal(parseValor('1.234,56'), 1234.56);
});

test('parseValor recusa zero, negativo, texto, 3 casas e valor enorme', () => {
  for (const ruim of [0, '0', '-5', 'abc', '', '10,123', '10000000', null]) {
    assert.throws(() => parseValor(ruim), { statusCode: 400 }, String(ruim));
  }
});

test('parseMovimentacao valida e normaliza um lançamento', () => {
  const lancamento = parseMovimentacao(valido, HOJE);

  assert.deepEqual(lancamento, {
    tipo: 'entrada',
    categoria: 'Serviços',
    descricao: 'Revisão completa',
    valor: 480.5,
    data: '2026-11-09',
    formaPagamento: 'pix'
  });
});

test('parseMovimentacao aceita a data de hoje e forma de pagamento vazia', () => {
  const lancamento = parseMovimentacao(
    { ...valido, data: hojeIso(HOJE), formaPagamento: '' },
    HOJE
  );

  assert.equal(lancamento.data, '2026-11-10');
  assert.equal(lancamento.formaPagamento, null);
});

test('parseMovimentacao recusa data futura, inexistente e mal formatada', () => {
  for (const data of ['2026-11-11', '2026-02-30', '10/11/2026', '']) {
    assert.throws(() => parseMovimentacao({ ...valido, data }, HOJE), { statusCode: 400 }, data);
  }
});

test('parseMovimentacao recusa tipo, categoria e forma inválidos', () => {
  assert.throws(() => parseMovimentacao({ ...valido, tipo: 'transferir' }, HOJE), { statusCode: 400 });
  // categoria de saída em um lançamento de entrada
  assert.throws(() => parseMovimentacao({ ...valido, categoria: 'Aluguel' }, HOJE), { statusCode: 400 });
  assert.throws(() => parseMovimentacao({ ...valido, formaPagamento: 'fiado' }, HOJE), { statusCode: 400 });
});

test('parseMovimentacao recusa descrição curta ou longa demais', () => {
  assert.throws(() => parseMovimentacao({ ...valido, descricao: 'ab' }, HOJE), { statusCode: 400 });
  assert.throws(
    () => parseMovimentacao({ ...valido, descricao: 'a'.repeat(151) }, HOJE),
    { statusCode: 400 }
  );
});

test('parseFiltrosMovimentacoes usa padrões e limpa os textos', () => {
  assert.deepEqual(parseFiltrosMovimentacoes({}), {
    inicio: '',
    fim: '',
    tipo: '',
    categoria: '',
    busca: ''
  });

  const filtros = parseFiltrosMovimentacoes({
    inicio: '2026-11-01',
    fim: '2026-11-30',
    tipo: 'SAIDA',
    categoria: ' Aluguel ',
    busca: '  luz '
  });

  assert.equal(filtros.tipo, 'saida');
  assert.equal(filtros.categoria, 'Aluguel');
  assert.equal(filtros.busca, 'luz');
});

test('parseFiltrosMovimentacoes recusa período e tipo inválidos', () => {
  assert.throws(() => parseFiltrosMovimentacoes({ inicio: '2026-13-01' }), { statusCode: 400 });
  assert.throws(
    () => parseFiltrosMovimentacoes({ inicio: '2026-12-01', fim: '2026-11-01' }),
    { statusCode: 400 }
  );
  assert.throws(() => parseFiltrosMovimentacoes({ tipo: 'outro' }), { statusCode: 400 });
});

test('montarResumo calcula o resultado sem erro de ponto flutuante', () => {
  assert.deepEqual(montarResumo({ entradas: 0.3, saidas: 0.1, quantidade: 4 }), {
    entradas: 0.3,
    saidas: 0.1,
    resultado: 0.2,
    quantidade: 4
  });
});

test('montarResumo mostra prejuízo como resultado negativo', () => {
  const resumo = montarResumo({ entradas: 1000, saidas: 1500.75, quantidade: 2 });

  assert.equal(resumo.resultado, -500.75);
});

test('montarResumo sem dados devolve zeros', () => {
  assert.deepEqual(montarResumo(), { entradas: 0, saidas: 0, resultado: 0, quantidade: 0 });
});
