const test = require('node:test');
const assert = require('node:assert/strict');
const cancelamento = require('../src/utils/cancelamentoAgendamento');

const agora = new Date(2026, 10, 20, 10, 0, 0);

test('permite cancelar agendamento futuro com status permitido', () => {
  assert.deepEqual(
    cancelamento.avaliarCancelamento(
      { status: 'Agendado', dataHora: '2026-11-21T09:00:00' },
      agora
    ),
    { permitido: true, motivo: null }
  );
});

test('impede cancelamento de concluído, cancelado ou serviço já iniciado', () => {
  assert.equal(
    cancelamento.avaliarCancelamento(
      { status: 'Concluído', dataHora: '2026-11-21T09:00:00' },
      agora
    ).permitido,
    false
  );
  assert.equal(
    cancelamento.avaliarCancelamento(
      { status: 'Agendado', dataHora: '2026-11-20T09:00:00' },
      agora
    ).permitido,
    false
  );
});

test('motivo é obrigatório, limpo e limitado', () => {
  assert.equal(cancelamento.parseMotivo('  Cliente não poderá comparecer.  '), 'Cliente não poderá comparecer.');
  assert.throws(() => cancelamento.parseMotivo('não'), /pelo menos 5/);
  assert.throws(() => cancelamento.parseMotivo('x'.repeat(501)), /máximo 500/);
});
