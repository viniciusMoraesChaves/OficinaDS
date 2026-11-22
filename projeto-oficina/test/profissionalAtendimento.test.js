const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        calls.push({ sql, params });
        if (sql.includes('WHERE id_funcionario = ?')) {
          return [[{ id: 2, nome: 'Carlos Souza' }]];
        }
        return [[{ id: 2, nome: 'Carlos Souza', cargo: 'Mecânico' }]];
      }
    }
  }
};

const funcionariosRepository = require('../src/repositories/funcionariosRepository');

test('lista somente profissionais ativos para seleção no atendimento', async () => {
  calls.length = 0;
  const profissionais = await funcionariosRepository.listarAtivos();

  assert.equal(profissionais[0].nome, 'Carlos Souza');
  assert.match(calls[0].sql, /WHERE f\.ativo = 1/);
  assert.match(calls[0].sql, /ORDER BY f\.nome ASC/);
});

test('valida o profissional selecionado como ativo', async () => {
  calls.length = 0;
  const profissional = await funcionariosRepository.findAtivoById(2);

  assert.equal(profissional.id, 2);
  assert.deepEqual(calls[0].params, [2]);
  assert.match(calls[0].sql, /ativo = 1/);
});
