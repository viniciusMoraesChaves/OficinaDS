const test = require('node:test');
const assert = require('node:assert/strict');

const { parsePayload } = require('../src/controllers/diagnosticosController');

test('parsePayload valida e limpa os dados do diagnóstico', () => {
  assert.deepEqual(
    parsePayload({
      ordemId: '2',
      funcionarioId: '3',
      descricao: '  Pastilhas de freio desgastadas.  '
    }),
    {
      ordemId: 2,
      funcionarioId: 3,
      descricao: 'Pastilhas de freio desgastadas.'
    }
  );
});

test('parsePayload rejeita diagnóstico muito curto', () => {
  assert.throws(
    () => parsePayload({ ordemId: 1, funcionarioId: 2, descricao: 'Ruído' }),
    /pelo menos 10 caracteres/
  );
});

test('parsePayload rejeita ordem ou funcionário inválido', () => {
  assert.throws(
    () => parsePayload({ ordemId: 0, funcionarioId: 2, descricao: 'Descrição válida' }),
    /inteiro positivo/
  );
  assert.throws(
    () => parsePayload({ ordemId: 1, funcionarioId: 'abc', descricao: 'Descrição válida' }),
    /inteiro positivo/
  );
});
