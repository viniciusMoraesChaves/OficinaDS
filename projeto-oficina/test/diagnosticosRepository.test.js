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
        return [{ affectedRows: 1 }];
      }
    }
  }
};

const diagnosticosRepository = require('../src/repositories/diagnosticosRepository');

test('remove exclui somente o diagnóstico informado', async () => {
  calls.length = 0;

  const affectedRows = await diagnosticosRepository.remove(7);

  assert.equal(affectedRows, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /DELETE FROM diagnostico/);
  assert.deepEqual(calls[0].params, [7]);
});
