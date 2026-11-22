const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];
let estoque = 8;
let quantidadeRegistrada = 2;

const connection = {
  async beginTransaction() { calls.push('begin'); },
  async commit() { calls.push('commit'); },
  async rollback() { calls.push('rollback'); },
  release() { calls.push('release'); },
  async execute(sql, params = []) {
    calls.push({ sql, params });

    if (sql.includes('FROM atendimento a') && sql.includes('FOR UPDATE')) {
      return [[{ status: 'aberto', idOrdem: 11 }]];
    }
    if (sql.includes('FROM peca_utilizada') && sql.includes('FOR UPDATE')) {
      return [[{ id_peca: 4, quantidade: quantidadeRegistrada }]];
    }
    if (sql.includes('FROM peca') && sql.includes('FOR UPDATE')) {
      return [[{
        id: 4,
        codigo: 'FLT-001',
        nome: 'Filtro de óleo',
        preco: 35,
        quantidadeDisponivel: estoque,
        ativo: 1
      }]];
    }
    if (sql.includes('INSERT INTO peca_utilizada')) {
      return [{ insertId: 21, affectedRows: 1 }];
    }

    return [{ affectedRows: 1 }];
  }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { pool: { async getConnection() { return connection; } } }
};

const repository = require('../src/repositories/pecasAtendimentoRepository');

test('inclusão registra peça e reduz estoque na mesma transação', async () => {
  calls.length = 0;
  estoque = 8;

  const resultado = await repository.adicionar({
    idAtendimento: 3,
    idPeca: 4,
    quantidade: 3
  });

  assert.equal(resultado.estoqueDisponivel, 5);
  assert.equal(calls[0], 'begin');
  assert.match(calls[1].sql, /ordem_servico/);
  assert.match(calls[2].sql, /FROM peca/);
  assert.deepEqual(calls[3].params, [5, 4]);
  assert.deepEqual(calls[4].params, [3, 11, 4, 'Filtro de óleo', 3, 35]);
  assert.equal(calls[5], 'commit');
  assert.equal(calls[6], 'release');
});

test('inclusão impede quantidade acima do estoque', async () => {
  calls.length = 0;
  estoque = 1;

  await assert.rejects(
    repository.adicionar({ idAtendimento: 3, idPeca: 4, quantidade: 2 }),
    /Estoque insuficiente/
  );

  assert.equal(calls.some((call) => call.sql?.includes('INSERT INTO peca_utilizada')), false);
  assert.deepEqual(calls.slice(-2), ['rollback', 'release']);
});

test('edição retira apenas a diferença do estoque', async () => {
  calls.length = 0;
  estoque = 8;
  quantidadeRegistrada = 2;

  const resultado = await repository.editar({
    idAtendimento: 3,
    idPecaUtilizada: 21,
    quantidade: 5
  });

  assert.equal(resultado.estoqueDisponivel, 5);
  const atualizacaoEstoque = calls.find((call) => call.sql?.includes('UPDATE peca SET'));
  const atualizacaoUso = calls.find((call) => call.sql?.includes('UPDATE peca_utilizada'));
  assert.deepEqual(atualizacaoEstoque.params, [5, 4]);
  assert.deepEqual(atualizacaoUso.params, [5, 21]);
  assert.equal(calls.at(-2), 'commit');
});

test('remoção devolve ao estoque toda a quantidade registrada', async () => {
  calls.length = 0;
  estoque = 8;
  quantidadeRegistrada = 2;

  const resultado = await repository.remover({
    idAtendimento: 3,
    idPecaUtilizada: 21
  });

  assert.equal(resultado.estoqueDisponivel, 10);
  const atualizacaoEstoque = calls.find((call) => call.sql?.includes('UPDATE peca SET'));
  const exclusao = calls.find((call) => call.sql?.includes('DELETE FROM peca_utilizada'));
  assert.deepEqual(atualizacaoEstoque.params, [10, 4]);
  assert.deepEqual(exclusao.params, [21]);
  assert.equal(calls.at(-2), 'commit');
});
