const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parsePagination,
  parseId,
  parseEmployeeFilters,
  buildPagination
} = require('../src/utils/queryParams');

test('parsePagination usa os valores padrão', () => {
  assert.deepEqual(parsePagination({}), {
    pagina: 1,
    limite: 8,
    offset: 0
  });
});

test('parsePagination calcula o offset', () => {
  assert.deepEqual(parsePagination({ pagina: '3', limite: '10' }), {
    pagina: 3,
    limite: 10,
    offset: 20
  });
});

test('parsePagination rejeita valores inválidos', () => {
  assert.throws(() => parsePagination({ pagina: 'zero' }), /número inteiro/);
  assert.throws(() => parsePagination({ limite: '100' }), /entre 1 e 50/);
});

test('parseId aceita apenas inteiro positivo', () => {
  assert.equal(parseId('12'), 12);
  assert.throws(() => parseId('-1'), /inteiro positivo/);
  assert.throws(() => parseId('abc'), /inteiro positivo/);
});

test('parseEmployeeFilters limpa e valida filtros', () => {
  assert.deepEqual(
    parseEmployeeFilters({ busca: '  mecânico  ', status: 'ATIVOS' }),
    { busca: 'mecânico', status: 'ativos' }
  );
  assert.throws(
    () => parseEmployeeFilters({ status: 'demitidos' }),
    /todos, ativos ou inativos/
  );
});

test('buildPagination calcula a quantidade de páginas', () => {
  assert.deepEqual(buildPagination(2, 8, 17), {
    pagina: 2,
    limite: 8,
    total: 17,
    totalPaginas: 3
  });
  assert.equal(buildPagination(1, 8, 0).totalPaginas, 0);
});
