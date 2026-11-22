const test = require('node:test');
const assert = require('node:assert/strict');
const {
  lerPrazoPagamento,
  parseInadimplenciaFilters,
  parseClientesInadimplentesFilters
} = require('../src/utils/inadimplencias');

test('prazo de pagamento: fora de produção a cobrança já nasce vencida (-1)', () => {
  assert.equal(lerPrazoPagamento(undefined, false), -1);
  assert.equal(lerPrazoPagamento('', false), -1);
});

test('prazo de pagamento: em produção o padrão é de 15 dias', () => {
  assert.equal(lerPrazoPagamento(undefined, true), 15);
});

test('prazo de pagamento: o valor do .env vale em qualquer ambiente', () => {
  assert.equal(lerPrazoPagamento('15', false), 15);
  assert.equal(lerPrazoPagamento(' 30 ', true), 30);
  assert.equal(lerPrazoPagamento('0', true), 0);
  assert.equal(lerPrazoPagamento('-5', true), -5);
});

test('prazo de pagamento: valor inválido impede a aplicação de subir', () => {
  for (const valor of ['abc', '1.5', '999', '-366', '1e2']) {
    assert.throws(() => lerPrazoPagamento(valor, false), /PRAZO_PAGAMENTO_DIAS/, valor);
  }
});

test('parseInadimplenciaFilters usa os valores padrão', () => {
  assert.deepEqual(parseInadimplenciaFilters({}), {
    busca: '',
    faixaAtraso: 'todas',
    valorMin: null,
    valorMax: null,
    vencimentoDe: '',
    vencimentoAte: '',
    ordenacao: 'maior_atraso'
  });
});

test('parseInadimplenciaFilters limpa a busca e converte os valores', () => {
  const filtros = parseInadimplenciaFilters({
    busca: `  ${'a'.repeat(150)}  `,
    faixaAtraso: 'de31a60',
    valorMin: '100,50',
    valorMax: '1500',
    vencimentoDe: '2026-01-10',
    vencimentoAte: '2026-03-01',
    ordenacao: 'MAIOR_VALOR'
  });

  assert.equal(filtros.busca.length, 100);
  assert.equal(filtros.faixaAtraso, 'de31a60');
  assert.equal(filtros.valorMin, 100.5);
  assert.equal(filtros.valorMax, 1500);
  assert.equal(filtros.vencimentoDe, '2026-01-10');
  assert.equal(filtros.vencimentoAte, '2026-03-01');
  assert.equal(filtros.ordenacao, 'maior_valor');
});

test('parseInadimplenciaFilters rejeita faixa e ordenação inválidas', () => {
  assert.throws(() => parseInadimplenciaFilters({ faixaAtraso: 'qualquer' }), { statusCode: 400 });
  assert.throws(() => parseInadimplenciaFilters({ faixaAtraso: 'toString' }), { statusCode: 400 });
  assert.throws(() => parseInadimplenciaFilters({ ordenacao: 'preco' }), { statusCode: 400 });
});

test('parseInadimplenciaFilters rejeita valores inválidos', () => {
  for (const valor of ['abc', '-5', '10.999', '1e3', '999999999']) {
    assert.throws(() => parseInadimplenciaFilters({ valorMin: valor }), { statusCode: 400 }, valor);
  }
});

test('parseInadimplenciaFilters rejeita valor mínimo maior que o máximo', () => {
  assert.throws(
    () => parseInadimplenciaFilters({ valorMin: '500', valorMax: '100' }),
    { statusCode: 400 }
  );
});

test('parseInadimplenciaFilters rejeita datas inexistentes ou fora do formato', () => {
  assert.throws(() => parseInadimplenciaFilters({ vencimentoDe: '10/01/2026' }), { statusCode: 400 });
  assert.throws(() => parseInadimplenciaFilters({ vencimentoDe: '2026-02-31' }), { statusCode: 400 });
  assert.throws(
    () => parseInadimplenciaFilters({ vencimentoDe: '2026-05-01', vencimentoAte: '2026-04-01' }),
    { statusCode: 400 }
  );
});

test('parseClientesInadimplentesFilters usa o padrão e valida a ordenação', () => {
  assert.deepEqual(parseClientesInadimplentesFilters({}), { busca: '', ordenacao: 'maior_valor' });
  assert.equal(parseClientesInadimplentesFilters({ ordenacao: 'cliente' }).ordenacao, 'cliente');
  assert.throws(() => parseClientesInadimplentesFilters({ ordenacao: 'valor' }), { statusCode: 400 });
});
