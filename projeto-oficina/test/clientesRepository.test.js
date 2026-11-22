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

        if (sql.includes('COUNT(*)')) {
          return [[{ total: 1 }]];
        }

        return [[{ id: 1, nome: 'Cliente de teste' }]];
      }
    }
  }
};

const clientesRepository = require('../src/repositories/clientesRepository');

test('findAll pesquisa clientes por texto e pelos dígitos de CPF ou telefone', async () => {
  calls.length = 0;

  await clientesRepository.findAll({
    busca: '(11) 99999-8888',
    limite: 8,
    offset: 0
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /c\.nome LIKE \?/);
  assert.match(calls[0].sql, /c\.cpf LIKE \?/);
  assert.match(calls[0].sql, /c\.email LIKE \?/);
  assert.match(calls[0].sql, /c\.telefone LIKE \?/);
  assert.match(calls[0].sql, /REPLACE\(REPLACE\(c\.cpf/);
  assert.deepEqual(calls[0].params, [
    '%(11) 99999-8888%',
    '%(11) 99999-8888%',
    '%(11) 99999-8888%',
    '%(11) 99999-8888%',
    '%11999998888%',
    '%11999998888%'
  ]);
  assert.deepEqual(calls[1].params.slice(-2), [8, 0]);
});

test('findAll mantém a listagem completa quando a busca está vazia', async () => {
  calls.length = 0;

  await clientesRepository.findAll({ busca: '', limite: 8, offset: 0 });

  assert.equal(calls.length, 2);
  assert.doesNotMatch(calls[0].sql, /WHERE/);
  assert.deepEqual(calls[0].params, []);
  assert.deepEqual(calls[1].params, [8, 0]);
});
