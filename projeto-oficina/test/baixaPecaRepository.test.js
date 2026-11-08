const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];
let estoque = 5;
let existe = true;

const connection = {
  async beginTransaction() { calls.push('begin'); },
  async commit() { calls.push('commit'); },
  async rollback() { calls.push('rollback'); },
  release() { calls.push('release'); },
  async execute(sql, params = []) {
    calls.push({ sql, params });
    if (sql.includes('FROM peca') && sql.includes('FOR UPDATE')) {
      return [existe ? [{ id_peca: 1, nome: 'Filtro', quantidade_disponivel: estoque }] : []];
    }
    if (sql.includes('INSERT INTO baixa_peca')) return [{ insertId: 9, affectedRows: 1 }];
    return [{ affectedRows: 1 }];
  }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { pool: { async getConnection() { return connection; } } }
};

const pecasRepository = require('../src/repositories/pecasRepository');

test('darBaixa atualiza estoque e registra histórico na mesma transação', async () => {
  calls.length = 0;
  estoque = 5;
  existe = true;

  const baixa = await pecasRepository.darBaixa({
    idPeca: 1,
    quantidade: 2,
    motivo: 'Peça trincada',
    idUsuario: 7
  });

  assert.equal(baixa.quantidadeDisponivel, 3);
  assert.equal(calls[0], 'begin');
  assert.match(calls[1].sql, /FOR UPDATE/);
  assert.deepEqual(calls[2].params, [3, 1]);
  assert.deepEqual(calls[3].params, [1, 2, 'Peça trincada', 7]);
  assert.equal(calls[4], 'commit');
  assert.equal(calls[5], 'release');
});

test('darBaixa impede retirar quantidade maior que o estoque', async () => {
  calls.length = 0;
  estoque = 1;
  existe = true;

  await assert.rejects(
    pecasRepository.darBaixa({ idPeca: 1, quantidade: 2, motivo: 'Danificada', idUsuario: 7 }),
    /Quantidade indisponível/
  );

  assert.equal(calls.some((call) => call.sql?.includes('UPDATE peca')), false);
  assert.equal(calls.at(-2), 'rollback');
  assert.equal(calls.at(-1), 'release');
});

test('darBaixa devolve null quando a peça não existe', async () => {
  calls.length = 0;
  existe = false;

  assert.equal(
    await pecasRepository.darBaixa({ idPeca: 99, quantidade: 1, motivo: 'Danificada', idUsuario: 7 }),
    null
  );
  assert.deepEqual(calls.slice(-2), ['rollback', 'release']);
});
