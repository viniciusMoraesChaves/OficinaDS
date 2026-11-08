const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];
let existeCobranca = true;

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        calls.push({ sql, params });

        if (sql.includes('information_schema.tables')) return [existeCobranca ? [{ 1: 1 }] : []];
        if (sql.includes('COUNT(*) AS total')) return [[{ total: 2 }]];
        if (sql.includes('AS entradas')) {
          return [[{ entradas: '1500.30', saidas: '500.10', quantidade: 6 }]];
        }
        if (sql.startsWith('INSERT')) return [{ insertId: 77 }];

        return [[
          { id: 'M1', origem: 'manual', tipo: 'saida', valor: '120.50', data: '2026-11-09' },
          { id: 'C3', origem: 'cobranca', tipo: 'entrada', valor: '480.00', data: '2026-11-08' }
        ]];
      }
    }
  }
};

const movimentacoesRepository = require('../src/repositories/movimentacoesRepository');

test('listar une lançamentos manuais e cobranças pagas, ordenados do mais recente', async () => {
  calls.length = 0;

  const resultado = await movimentacoesRepository.listar({}, { limite: 8, offset: 0 });

  const consulta = calls.find((c) => c.sql.includes('ORDER BY'));

  assert.match(consulta.sql, /FROM movimentacao_financeira m/);
  assert.match(consulta.sql, /UNION ALL/);
  assert.match(consulta.sql, /FROM cobranca c\s+WHERE c\.status = 'pago'/);
  assert.match(consulta.sql, /ORDER BY mov\.data DESC/);
  assert.deepEqual(consulta.params, [8, 0]);
  assert.equal(resultado.total, 2);
  assert.equal(resultado.rows[0].valor, 120.5);
});

test('listar combina todos os filtros em parâmetros, na mesma ordem nas duas consultas', async () => {
  calls.length = 0;

  await movimentacoesRepository.listar(
    { inicio: '2026-11-01', fim: '2026-11-30', tipo: 'saida', categoria: 'Aluguel', busca: 'galpão' },
    { limite: 8, offset: 16 }
  );

  const contagem = calls.find((c) => c.sql.includes('COUNT(*) AS total'));
  const consulta = calls.find((c) => c.sql.includes('ORDER BY'));
  const filtros = ['2026-11-01', '2026-11-30', 'saida', 'Aluguel', '%galpão%'];

  assert.match(consulta.sql, /mov\.data >= \?/);
  assert.match(consulta.sql, /mov\.data <= \?/);
  assert.match(consulta.sql, /mov\.tipo = \?/);
  assert.match(consulta.sql, /mov\.categoria = \?/);
  assert.match(consulta.sql, /mov\.descricao LIKE \?/);
  assert.deepEqual(contagem.params, filtros);
  assert.deepEqual(consulta.params, [...filtros, 8, 16]);
});

test('sem a tabela de cobranças, só os lançamentos manuais entram na consulta', async () => {
  // O módulo guarda a resposta quando a tabela existe; por isso este teste usa um módulo novo.
  const caminho = require.resolve('../src/repositories/movimentacoesRepository');
  delete require.cache[caminho];
  existeCobranca = false;

  const repositorioNovo = require('../src/repositories/movimentacoesRepository');
  calls.length = 0;

  await repositorioNovo.listar({}, { limite: 8, offset: 0 });

  const consulta = calls.find((c) => c.sql.includes('ORDER BY'));

  assert.doesNotMatch(consulta.sql, /UNION ALL/);
  assert.doesNotMatch(consulta.sql, /FROM cobranca/);

  existeCobranca = true;
});

test('resumo soma entradas e saídas e calcula o resultado', async () => {
  const caminho = require.resolve('../src/repositories/movimentacoesRepository');
  delete require.cache[caminho];
  const repositorioNovo = require('../src/repositories/movimentacoesRepository');

  const resumo = await repositorioNovo.resumo({ inicio: '2026-11-01' });

  assert.deepEqual(resumo, { entradas: 1500.3, saidas: 500.1, resultado: 1000.2, quantidade: 6 });
});

test('criar grava o lançamento com o usuário que registrou', async () => {
  calls.length = 0;

  const id = await movimentacoesRepository.criar({
    tipo: 'saida',
    categoria: 'Aluguel',
    descricao: 'Aluguel do galpão',
    valor: 2300,
    data: '2026-11-05',
    formaPagamento: 'transferencia',
    idUsuario: 1
  });

  assert.equal(id, 77);
  assert.match(calls[0].sql, /INSERT INTO movimentacao_financeira/);
  assert.deepEqual(calls[0].params, [
    'saida',
    'Aluguel',
    'Aluguel do galpão',
    2300,
    '2026-11-05',
    'transferencia',
    1
  ]);
});
