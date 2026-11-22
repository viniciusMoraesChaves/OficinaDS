const test = require('node:test');
const assert = require('node:assert/strict');
const { validarQuantidadePeca } = require('../src/utils/pecaUtilizada');

test('quantidade de peça aceita somente inteiro positivo', () => {
  assert.equal(validarQuantidadePeca('3'), 3);
  assert.throws(() => validarQuantidadePeca(''), /quantidade inteira/);
  assert.throws(() => validarQuantidadePeca(0), /quantidade inteira/);
  assert.throws(() => validarQuantidadePeca(-1), /quantidade inteira/);
  assert.throws(() => validarQuantidadePeca(1.5), /quantidade inteira/);
});
