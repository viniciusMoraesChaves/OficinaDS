const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBaixaPeca } = require('../src/utils/baixaPeca');

test('baixa aceita quantidade inteira e limpa o motivo', () => {
  assert.deepEqual(
    parseBaixaPeca({ quantidade: '3', motivo: '  Peça trincada  ' }),
    { quantidade: 3, motivo: 'Peça trincada' }
  );
});

test('baixa rejeita quantidade zero, negativa ou fracionada', () => {
  assert.throws(() => parseBaixaPeca({ quantidade: 0, motivo: 'Danificada' }), /quantidade inteira/);
  assert.throws(() => parseBaixaPeca({ quantidade: -1, motivo: 'Danificada' }), /quantidade inteira/);
  assert.throws(() => parseBaixaPeca({ quantidade: 1.5, motivo: 'Danificada' }), /quantidade inteira/);
});

test('baixa exige motivo válido', () => {
  assert.throws(() => parseBaixaPeca({ quantidade: 1, motivo: 'ruim' }), /motivo/);
  assert.throws(() => parseBaixaPeca({ quantidade: 1, motivo: 'a'.repeat(256) }), /motivo/);
});
