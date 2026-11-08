const test = require('node:test');
const assert = require('node:assert/strict');
const { exigirCpf, exigirEmail, exigirSenha, exigirTexto } = require('../src/utils/validacoes');

test('exigirCpf remove pontuação e exige 11 dígitos', () => {
  assert.equal(exigirCpf('123.456.789-01'), '12345678901');
  assert.throws(() => exigirCpf('123'), { statusCode: 400 });
});

test('exigirEmail normaliza e valida', () => {
  assert.equal(exigirEmail('  Maria@Oficina.Test '), 'maria@oficina.test');
  assert.throws(() => exigirEmail('sem-arroba'), { statusCode: 400 });
});

test('exigirSenha e exigirTexto rejeitam valores inválidos', () => {
  assert.throws(() => exigirSenha('123'), { statusCode: 400 });
  assert.throws(() => exigirTexto('   ', 'Informe o nome.'), { statusCode: 400 });
  assert.equal(exigirTexto(' Ana ', 'x'), 'Ana');
});
