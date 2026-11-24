const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RESULTADOS,
  parseResultado,
  exigirPodeRegistrar,
  avaliarPresenca
} = require('../src/utils/presencaAgendamento');

const agora = new Date(2026, 10, 24, 10, 0, 0);
const ag = (status, dataHora) => ({ status, dataHora });

test('parseResultado aceita só compareceu e nao_compareceu', () => {
  assert.equal(parseResultado('compareceu'), 'compareceu');
  assert.equal(parseResultado(' nao_compareceu '), 'nao_compareceu');
  assert.throws(() => parseResultado('talvez'), /compareceu/);
  assert.throws(() => parseResultado(undefined), /compareceu/);
  assert.throws(() => parseResultado('toString'), /compareceu/);
});

test('cada resultado leva ao status certo', () => {
  assert.equal(RESULTADOS.compareceu, 'Em atendimento');
  assert.equal(RESULTADOS.nao_compareceu, 'Não compareceu');
});

test('permite registrar em Agendado e Confirmado já no horário ou depois', () => {
  for (const status of ['Agendado', 'Confirmado']) {
    assert.equal(avaliarPresenca(ag(status, '2026-11-24T10:00:00'), agora).permitido, true);
    assert.equal(avaliarPresenca(ag(status, '2026-11-23T08:00:00'), agora).permitido, true);
  }
});

test('bloqueia antes do horário do agendamento', () => {
  const r = avaliarPresenca(ag('Agendado', '2026-11-24T10:01:00'), agora);
  assert.equal(r.permitido, false);
  assert.throws(
    () => exigirPodeRegistrar(ag('Agendado', '2026-11-24T10:01:00'), agora),
    (e) => e.codigo === 'ANTES_DO_HORARIO' && e.statusCode === 422
  );
});

test('bloqueia status que já foram tratados', () => {
  for (const status of ['Em atendimento', 'Concluído', 'Cancelado', 'Não compareceu']) {
    assert.throws(
      () => exigirPodeRegistrar(ag(status, '2026-11-20T10:00:00'), agora),
      (e) => e.codigo === 'STATUS_NAO_PERMITIDO' && e.statusCode === 422
    );
  }
});
