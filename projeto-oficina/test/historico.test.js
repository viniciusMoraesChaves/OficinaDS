// Rode com:  node --test test/historico.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { criarHistoricoController } = require('../src/controllers/historicoController');

function fakeRes() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

function repoFalso(sobrescrever = {}) {
  return {
    veiculoExiste: async () => true,
    buscarAtendimentos: async () => [],
    buscarServicos: async () => [],
    buscarPecas: async () => [],
    ...sobrescrever,
  };
}

async function chamar(repo, params = { id: '1' }, query = {}) {
  const res = fakeRes();
  await criarHistoricoController(repo).consultar({ params, query }, res);
  return res;
}

test('id inválido -> 400', async () => {
  const res = await chamar(repoFalso(), { id: 'abc' });
  assert.equal(res.statusCode, 400);
});

test('veículo inexistente -> 404', async () => {
  const res = await chamar(repoFalso({ veiculoExiste: async () => false }));
  assert.equal(res.statusCode, 404);
});

test('veículo sem atendimentos -> 200 com lista vazia', async () => {
  const res = await chamar(repoFalso());
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, []);
});

test('inicio maior que fim -> 400', async () => {
  const res = await chamar(repoFalso(), { id: '1' }, { inicio: '2026-10-01', fim: '2026-09-01' });
  assert.equal(res.statusCode, 400);
});

test('data em formato inválido ou inexistente -> 400', async () => {
  assert.equal((await chamar(repoFalso(), { id: '1' }, { inicio: '01/10/2026' })).statusCode, 400);
  assert.equal((await chamar(repoFalso(), { id: '1' }, { fim: '2026-02-31' })).statusCode, 400);
});

test('repassa o período ao repositório', async () => {
  let recebido;
  const repo = repoFalso({ buscarAtendimentos: async (_id, periodo) => { recebido = periodo; return []; } });
  await chamar(repo, { id: '1' }, { inicio: '2026-01-01', fim: '2026-10-12' });
  assert.deepEqual(recebido, { inicio: '2026-01-01', fim: '2026-10-12' });
});

test('mantém a ordem, agrupa serviços/peças e converte valores', async () => {
  const repo = repoFalso({
    buscarAtendimentos: async () => [
      { id_atendimento: 2, data_atendimento: '2026-09-30', status: 'Concluído', problema_relatado: 'Barulho', diagnostico: 'Pastilhas', mecanico: 'Paulo Lima' },
      { id_atendimento: 1, data_atendimento: '2026-05-10', status: 'Concluído', problema_relatado: 'Revisão', diagnostico: null, mecanico: null },
    ],
    buscarServicos: async () => [{ id_atendimento: 2, descricao: 'Troca de pastilhas', valor: '180.00' }],
    buscarPecas: async () => [{ id_atendimento: 2, nome_peca: 'Pastilha', quantidade: 1, valor_unitario: '140.00' }],
  });
  const res = await chamar(repo);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.map((a) => a.idAtendimento), [2, 1]);
  assert.deepEqual(res.body[0].servicos, [{ descricao: 'Troca de pastilhas', valor: 180 }]);
  assert.deepEqual(res.body[0].pecas, [{ nome: 'Pastilha', quantidade: 1, valorUnitario: 140 }]);
  assert.deepEqual(res.body[1].servicos, []); // atendimento sem serviços
  assert.deepEqual(res.body[1].pecas, []);    // atendimento sem peças
});

test('erro inesperado -> 500', async () => {
  const res = await chamar(repoFalso({ veiculoExiste: async () => { throw new Error('falha'); } }));
  assert.equal(res.statusCode, 500);
});