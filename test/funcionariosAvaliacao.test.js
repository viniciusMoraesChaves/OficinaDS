const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];
let linhas = [];

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        calls.push({ sql, params });

        // Só a consulta de contagem da paginação (não o COUNT(*) AS totalAvaliacoes).
        if (/SELECT COUNT\(\*\) AS total\s+FROM funcionario/.test(sql)) return [[{ total: linhas.length }]];
        return [linhas];
      }
    }
  }
};

const funcionariosRepository = require('../src/repositories/funcionariosRepository');

test('a listagem de funcionários traz a média e o total de avaliações', async () => {
  linhas = [
    { id: 1, nome: 'Carlos', totalAvaliacoes: 3, somaNotas: 13 },
    { id: 2, nome: 'Marina', totalAvaliacoes: 0, somaNotas: 0 }
  ];
  calls.length = 0;

  const { rows, total } = await funcionariosRepository.search({ busca: '', status: 'todos', limite: 8, offset: 0 });

  assert.equal(total, 2);
  assert.deepEqual(rows[0], { id: 1, nome: 'Carlos', avaliacaoMedia: 4.3, totalAvaliacoes: 3 });
  assert.deepEqual(rows[1], { id: 2, nome: 'Marina', avaliacaoMedia: null, totalAvaliacoes: 0 });
  assert.match(calls[1].sql, /FROM avaliacao_funcionario/);
});

test('quem nunca foi avaliado continua na lista (LEFT JOIN)', async () => {
  linhas = [];
  calls.length = 0;

  await funcionariosRepository.search({ busca: '', status: 'todos', limite: 8, offset: 0 });

  assert.match(calls[1].sql, /LEFT JOIN \(/);
});

test('findById traz a média do funcionário e não expõe a soma das notas', async () => {
  linhas = [{ id: 2, nome: 'Marina', totalAvaliacoes: 2, somaNotas: 9 }];

  const funcionario = await funcionariosRepository.findById(2);

  assert.equal(funcionario.avaliacaoMedia, 4.5);
  assert.equal(funcionario.totalAvaliacoes, 2);
  assert.equal('somaNotas' in funcionario, false);
});

test('findById devolve null quando o funcionário não existe', async () => {
  linhas = [];

  assert.equal(await funcionariosRepository.findById(99), null);
});
