const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];

const connection = {
  async beginTransaction() { calls.push('begin'); },
  async commit() { calls.push('commit'); },
  async rollback() { calls.push('rollback'); },
  release() { calls.push('release'); },
  async execute(sql, params = []) {
    calls.push({ sql, params });
    return [{ insertId: 42, affectedRows: 1 }];
  }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async getConnection() { return connection; },
      async execute(sql, params = []) {
        calls.push({ sql, params });
        return [{ affectedRows: 1 }];
      }
    }
  }
};

const orcamentosRepository = require('../src/repositories/orcamentosRepository');

test('criarAtendimento também cria a ordem de serviço, na mesma transação', async () => {
  calls.length = 0;

  const atendimento = await orcamentosRepository.criarAtendimento({
    idCliente: 1,
    idVeiculo: 2,
    idFuncionario: null
  });

  assert.equal(atendimento.id, 42);
  assert.equal(calls[0], 'begin');
  assert.match(calls[1].sql, /INSERT INTO atendimento/);
  assert.match(calls[2].sql, /INSERT INTO ordem_servico/);
  assert.deepEqual(calls[2].params, [1, 2, null, 42, 'Atendimento #42']);
  assert.equal(calls[3], 'commit');
  assert.equal(calls[4], 'release');
});

test('cancelarAtendimento encerra a ordem de serviço ligada a ele', async () => {
  calls.length = 0;

  const cancelado = await orcamentosRepository.cancelarAtendimento(42);

  assert.equal(cancelado, true);
  assert.match(calls[0].sql, /UPDATE atendimento SET status = 'cancelado'/);
  assert.match(calls[1].sql, /UPDATE ordem_servico/);
  assert.deepEqual(calls[1].params, [42]);
});
