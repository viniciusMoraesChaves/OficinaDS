const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');

// Respostas do banco, na ordem em que as consultas são feitas.
let respostas = [];
const eventos = [];
const consultas = [];

function proximaResposta(sql, params) {
  consultas.push({ sql, params });
  if (respostas.length === 0) throw new Error(`Sem resposta preparada para: ${sql.slice(0, 60)}`);
  return respostas.shift();
}

const connection = {
  async beginTransaction() { eventos.push('begin'); },
  async commit() { eventos.push('commit'); },
  async rollback() { eventos.push('rollback'); },
  release() { eventos.push('release'); },
  async execute(sql, params = []) { return proximaResposta(sql, params); }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async getConnection() { return connection; },
      async execute(sql, params = []) { return proximaResposta(sql, params); }
    }
  }
};

const presencaRepository = require('../src/repositories/presencaRepository');
const { hojeIso } = require('../src/utils/presenca');

function preparar(...lista) {
  respostas = [...lista];
  eventos.length = 0;
  consultas.length = 0;
}

test('registrarEntrada trava o funcionário, confere período aberto e grava, numa transação', async () => {
  preparar(
    [[{ id_funcionario: 3, ativo: 1 }]],
    [[]],
    [{ insertId: 41 }]
  );

  const id = await presencaRepository.registrarEntrada(3, 1);

  assert.equal(id, 41);
  assert.match(consultas[0].sql, /FROM funcionario WHERE id_funcionario = \? FOR UPDATE/);
  assert.match(consultas[1].sql, /saida_em IS NULL/);
  assert.match(consultas[2].sql, /INSERT INTO presenca_funcionario/);
  assert.deepEqual(consultas[2].params, [3, 1]);
  assert.deepEqual(eventos, ['begin', 'commit', 'release']);
});

test('registrarEntrada recusa quando o funcionário já está presente (409) e desfaz a transação', async () => {
  preparar(
    [[{ id_funcionario: 3, ativo: 1 }]],
    [[{ 1: 1 }]]
  );

  await assert.rejects(() => presencaRepository.registrarEntrada(3, 1), { statusCode: 409 });

  assert.equal(consultas.length, 2, 'não pode chegar ao INSERT');
  assert.deepEqual(eventos, ['begin', 'rollback', 'release']);
});

test('registrarEntrada recusa funcionário inativo (409) e inexistente (404)', async () => {
  preparar([[{ id_funcionario: 3, ativo: 0 }]]);
  await assert.rejects(() => presencaRepository.registrarEntrada(3, 1), { statusCode: 409 });

  preparar([[]]);
  await assert.rejects(() => presencaRepository.registrarEntrada(99, 1), { statusCode: 404 });
  assert.deepEqual(eventos, ['begin', 'rollback', 'release']);
});

test('registrarSaida fecha o período aberto de hoje e registra quem fez', async () => {
  preparar(
    [[{ id_funcionario: 3, ativo: 1 }]],
    [[{ id_presenca: 41 }]],
    [{ affectedRows: 1 }]
  );

  const id = await presencaRepository.registrarSaida(3, 1);

  assert.equal(id, 41);
  assert.match(consultas[1].sql, /data_presenca = CURDATE\(\) AND saida_em IS NULL/);
  assert.match(consultas[2].sql, /UPDATE presenca_funcionario\s+SET saida_em = NOW\(\)/);
  assert.deepEqual(consultas[2].params, [1, 41]);
  assert.deepEqual(eventos, ['begin', 'commit', 'release']);
});

test('registrarSaida sem entrada aberta responde 409 e não altera nada', async () => {
  preparar(
    [[{ id_funcionario: 3, ativo: 1 }]],
    [[]]
  );

  await assert.rejects(() => presencaRepository.registrarSaida(3, 1), { statusCode: 409 });

  assert.equal(consultas.length, 2, 'não pode chegar ao UPDATE');
  assert.deepEqual(eventos, ['begin', 'rollback', 'release']);
});

test('listarPorData consulta a data pedida e classifica cada período', async () => {
  const hoje = hojeIso();

  preparar([[
    { id: 1, idFuncionario: 2, nome: 'Ana', cargo: 'Mecânica', data: hoje, entradaEm: 'a', saidaEm: null, minutos: 90 },
    { id: 2, idFuncionario: 3, nome: 'Bia', cargo: 'Gerente', data: hoje, entradaEm: 'b', saidaEm: 'c', minutos: 480 },
    { id: 3, idFuncionario: 4, nome: 'Caio', cargo: 'Atendente', data: '2020-01-01', entradaEm: 'd', saidaEm: null, minutos: 99999 }
  ]]);

  const lista = await presencaRepository.listarPorData(hoje);

  assert.match(consultas[0].sql, /WHERE p\.data_presenca = \?/);
  assert.deepEqual(consultas[0].params, [hoje]);
  assert.deepEqual(
    lista.map((p) => [p.situacao, p.minutos]),
    [['presente', 90], ['saiu', 480], ['sem_saida', null]]
  );
});

test('listarPresentes considera só quem entrou hoje e não saiu', async () => {
  preparar([[]]);

  await presencaRepository.listarPresentes();

  assert.match(consultas[0].sql, /p\.data_presenca = CURDATE\(\) AND p\.saida_em IS NULL/);
});

test('listarFuncionariosComSituacao devolve só ativos, com a situação de hoje', async () => {
  preparar([[
    { id: 1, nome: 'Ana', cargo: 'Mecânica', presenteDesde: new Date(), registrosHoje: 1 },
    { id: 2, nome: 'Bia', cargo: 'Gerente', presenteDesde: null, registrosHoje: 2 },
    { id: 3, nome: 'Caio', cargo: 'Atendente', presenteDesde: null, registrosHoje: 0 }
  ]]);

  const lista = await presencaRepository.listarFuncionariosComSituacao();

  assert.match(consultas[0].sql, /WHERE f\.ativo = 1/);
  assert.deepEqual(lista.map((f) => f.situacao), ['presente', 'saiu', 'ausente']);
  assert.equal(lista[1].presenteDesde, null);
});
