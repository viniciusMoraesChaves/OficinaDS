const test = require('node:test');
const assert = require('node:assert/strict');
const { STATUS_ORCAMENTO, validarDecisao } = require('../src/utils/statusOrcamento');

test('validarDecisao aceita decisão válida quando o orçamento está enviado', () => {
  const orcamento = { status: STATUS_ORCAMENTO.ENVIADO };
  assert.equal(validarDecisao(orcamento, STATUS_ORCAMENTO.ACEITO), true);
  assert.equal(validarDecisao(orcamento, STATUS_ORCAMENTO.RECUSADO), true);
});

test('validarDecisao rejeita orçamento inexistente', () => {
  assert.throws(() => validarDecisao(null, STATUS_ORCAMENTO.ACEITO), /não encontrado/);
});

test('validarDecisao rejeita decisão que não seja aceito/recusado', () => {
  const orcamento = { status: STATUS_ORCAMENTO.ENVIADO };
  assert.throws(() => validarDecisao(orcamento, 'talvez'), /inválida/);
});

test('validarDecisao rejeita orçamento ainda em rascunho (não enviado)', () => {
  const orcamento = { status: STATUS_ORCAMENTO.RASCUNHO };
  assert.throws(() => validarDecisao(orcamento, STATUS_ORCAMENTO.ACEITO), /ainda não foi enviado/);
});

test('validarDecisao rejeita decisão duplicada (orçamento já aceito)', () => {
  const orcamento = { status: STATUS_ORCAMENTO.ACEITO };
  assert.throws(() => validarDecisao(orcamento, STATUS_ORCAMENTO.RECUSADO), /já teve uma decisão/);
});

test('validarDecisao rejeita decisão duplicada (orçamento já recusado)', () => {
  const orcamento = { status: STATUS_ORCAMENTO.RECUSADO };
  assert.throws(() => validarDecisao(orcamento, STATUS_ORCAMENTO.ACEITO), /já teve uma decisão/);
});