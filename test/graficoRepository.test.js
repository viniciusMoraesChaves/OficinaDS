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

        if (sql.includes('information_schema.tables')) return [[{ 1: 1 }]];

        return [[
          { periodo: '2026-11-02', entradas: '480.50', saidas: '0.00' },
          { periodo: '2026-11-04', entradas: '0.00', saidas: '390.00' }
        ]];
      }
    }
  }
};

const movimentacoesRepository = require('../src/repositories/movimentacoesRepository');

test('serie por dia agrupa em AAAA-MM-DD, soma entradas e saídas e converte os valores', async () => {
  calls.length = 0;

  const serie = await movimentacoesRepository.serie({}, 'dia');
  const consulta = calls.find((c) => c.sql.includes('GROUP BY'));

  assert.match(consulta.sql, /DATE_FORMAT\(mov\.data, '%Y-%m-%d'\) AS periodo/);
  assert.match(consulta.sql, /GROUP BY periodo/);
  assert.match(consulta.sql, /ORDER BY periodo ASC/);
  assert.match(consulta.sql, /CASE WHEN mov\.tipo = 'entrada'/);
  assert.match(consulta.sql, /CASE WHEN mov\.tipo = 'saida'/);
  assert.deepEqual(serie, [
    { periodo: '2026-11-02', entradas: 480.5, saidas: 0 },
    { periodo: '2026-11-04', entradas: 0, saidas: 390 }
  ]);
});

test('serie por mês agrupa em AAAA-MM', async () => {
  calls.length = 0;

  await movimentacoesRepository.serie({}, 'mes');
  const consulta = calls.find((c) => c.sql.includes('GROUP BY'));

  assert.match(consulta.sql, /DATE_FORMAT\(mov\.data, '%Y-%m'\) AS periodo/);
});

test('serie usa os mesmos filtros e a mesma união com cobranças da listagem', async () => {
  calls.length = 0;

  await movimentacoesRepository.serie(
    { inicio: '2026-11-01', fim: '2026-11-30', tipo: 'entrada', categoria: 'Serviços', busca: 'freio' },
    'dia'
  );
  const consulta = calls.find((c) => c.sql.includes('GROUP BY'));

  assert.match(consulta.sql, /UNION ALL/);
  assert.match(consulta.sql, /FROM cobranca c\s+WHERE c\.status = 'pago'/);
  assert.match(consulta.sql, /mov\.data >= \?/);
  assert.match(consulta.sql, /mov\.descricao LIKE \?/);
  assert.deepEqual(consulta.params, ['2026-11-01', '2026-11-30', 'entrada', 'Serviços', '%freio%']);
});
