const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarUrgencia,
  normalizarFiltroUrgencia,
  validarOrdenacaoUrgencia
} = require('../src/utils/urgencia');

test('urgência aceita os três níveis permitidos', () => {
  assert.equal(validarUrgencia('BAIXA'), 'baixa');
  assert.equal(validarUrgencia('media'), 'media');
  assert.equal(validarUrgencia(' alta '), 'alta');
});

test('urgência ausente recebe média ao criar atendimento', () => {
  assert.equal(validarUrgencia(undefined), 'media');
});

test('urgência rejeita valor fora da classificação', () => {
  assert.throws(() => validarUrgencia('critica'), /Urgência inválida/);
});

test('filtro todas não restringe a consulta', () => {
  assert.equal(normalizarFiltroUrgencia('todas'), '');
  assert.equal(normalizarFiltroUrgencia('alta'), 'alta');
});

test('ordenação aceita prioridade e recentes', () => {
  assert.equal(validarOrdenacaoUrgencia(), 'prioridade');
  assert.equal(validarOrdenacaoUrgencia('recentes'), 'recentes');
  assert.throws(() => validarOrdenacaoUrgencia('nome'), /Ordenação inválida/);
});
