const test = require('node:test');
const assert = require('node:assert/strict');
const { parseEstoqueFilters } = require('../src/utils/estoqueFilters');

test('parseEstoqueFilters usa os valores padrão', () => {
  assert.deepEqual(parseEstoqueFilters({}), { busca: '', categoria: '', situacao: 'todas' });
});

test('parseEstoqueFilters limpa e limita os textos', () => {
  const filtros = parseEstoqueFilters({
    busca: `  ${'a'.repeat(150)}  `,
    categoria: ' Freios ',
    situacao: 'BAIXO'
  });

  assert.equal(filtros.busca.length, 100);
  assert.equal(filtros.categoria, 'Freios');
  assert.equal(filtros.situacao, 'baixo');
});

test('parseEstoqueFilters rejeita situação inválida', () => {
  assert.throws(() => parseEstoqueFilters({ situacao: 'qualquer' }), { statusCode: 400 });
});
