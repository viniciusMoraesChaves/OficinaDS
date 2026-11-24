const test = require('node:test');
const assert = require('node:assert/strict');
const {
  lerNota,
  atendimentoConcluido,
  resumirAvaliacoes,
  calcularMedia
} = require('../src/utils/avaliacoes');

test('lerNota aceita inteiros de 1 a 5, como número ou texto', () => {
  for (const nota of [1, 2, 3, 4, 5]) {
    assert.equal(lerNota(nota), nota);
    assert.equal(lerNota(String(nota)), nota);
  }
  assert.equal(lerNota(' 4 '), 4);
});

test('lerNota rejeita notas fora de 1 a 5', () => {
  for (const valor of [0, 6, -1, 10, 100, '0', '6', '-3']) {
    assert.throws(() => lerNota(valor), { statusCode: 400, message: /1 a 5 estrelas/ }, String(valor));
  }
});

test('lerNota rejeita valores que não são números inteiros', () => {
  const invalidos = [4.5, '4.5', '4,5', '', '  ', null, undefined, true, false, [], {}, [4], 'abc', 'NaN', NaN, Infinity, '1e1'];

  for (const valor of invalidos) {
    assert.throws(() => lerNota(valor), { statusCode: 400 }, String(valor));
  }
});

test('atendimentoConcluido: concluído pela oficina ou etapa "Concluída"', () => {
  assert.equal(atendimentoConcluido({ status: 'concluido', etapaAtual: null }), true);
  assert.equal(atendimentoConcluido({ status: 'concluido', etapaAtual: 'Em serviço' }), true);
  assert.equal(atendimentoConcluido({ status: 'aberto', etapaAtual: 'Concluída' }), true);
});

test('atendimentoConcluido: em andamento ou cancelado não pode ser avaliado', () => {
  assert.equal(atendimentoConcluido({ status: 'aberto', etapaAtual: 'Em serviço' }), false);
  assert.equal(atendimentoConcluido({ status: 'aberto', etapaAtual: 'Em testes' }), false);
  assert.equal(atendimentoConcluido({ status: 'aberto', etapaAtual: null }), false);
  assert.equal(atendimentoConcluido({ status: 'cancelado', etapaAtual: 'Concluída' }), false);
});

test('resumirAvaliacoes calcula a média com uma casa decimal', () => {
  assert.deepEqual(resumirAvaliacoes(13, 3), { media: 4.3, total: 3 });
  assert.deepEqual(resumirAvaliacoes(10, 2), { media: 5, total: 2 });
  assert.deepEqual(resumirAvaliacoes(7, 2), { media: 3.5, total: 2 });
  assert.deepEqual(resumirAvaliacoes('9', '2'), { media: 4.5, total: 2 });
});

test('resumirAvaliacoes arredonda metade para cima, sem erro de ponto flutuante', () => {
  assert.equal(resumirAvaliacoes(85, 20).media, 4.3); // 4,25
  assert.equal(resumirAvaliacoes(87, 20).media, 4.4); // 4,35
  assert.equal(resumirAvaliacoes(1, 3).media, 0.3);
});

test('resumirAvaliacoes sem avaliações devolve média nula', () => {
  assert.deepEqual(resumirAvaliacoes(0, 0), { media: null, total: 0 });
  assert.deepEqual(resumirAvaliacoes(null, null), { media: null, total: 0 });
  assert.deepEqual(resumirAvaliacoes(undefined, undefined), { media: null, total: 0 });
});

test('calcularMedia usa a lista de notas', () => {
  assert.deepEqual(calcularMedia([5, 4, 4]), { media: 4.3, total: 3 });
  assert.deepEqual(calcularMedia([1]), { media: 1, total: 1 });
  assert.deepEqual(calcularMedia([5, 5, 5, 5]), { media: 5, total: 4 });
  assert.deepEqual(calcularMedia([]), { media: null, total: 0 });
});
