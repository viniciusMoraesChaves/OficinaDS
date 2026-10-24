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

        if (sql.includes('COUNT(*) AS total FROM peca')) return [[{ total: 2 }]];
        if (sql.includes('GROUP BY situacao')) {
          return [[
            { situacao: 'disponivel', total: 5 },
            { situacao: 'baixo', total: 2 },
            { situacao: 'indisponivel', total: 1 }
          ]];
        }
        if (sql.includes('DISTINCT categoria')) {
          return [[{ categoria: 'Filtros' }, { categoria: 'Freios' }]];
        }

        return [[{ id: 1, codigo: 'FLT-1', nome: 'Filtro', preco: '35.00', situacao: 'disponivel' }]];
      }
    }
  }
};

const pecasRepository = require('../src/repositories/pecasRepository');

test('findAll sem filtros lista somente peças ativas, paginadas e ordenadas por nome', async () => {
  calls.length = 0;

  const resultado = await pecasRepository.findAll({ limite: 8, offset: 0 });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /WHERE p\.ativo = 1/);
  assert.match(calls[1].sql, /ORDER BY p\.nome ASC/);
  assert.deepEqual(calls[1].params, [8, 0]);
  assert.equal(resultado.total, 2);
  assert.equal(resultado.rows[0].preco, 35);
});

test('findAll combina busca, categoria e situação nos parâmetros', async () => {
  calls.length = 0;

  await pecasRepository.findAll({
    busca: 'freio',
    categoria: 'Freios',
    situacao: 'baixo',
    limite: 8,
    offset: 8
  });

  assert.match(calls[0].sql, /p\.codigo LIKE \? OR p\.nome LIKE \? OR p\.localizacao LIKE \?/);
  assert.match(calls[0].sql, /p\.categoria = \?/);
  assert.deepEqual(calls[0].params, ['%freio%', '%freio%', '%freio%', 'Freios', 'baixo']);
  assert.deepEqual(calls[1].params, ['%freio%', '%freio%', '%freio%', 'Freios', 'baixo', 8, 8]);
});

test('situacao "todas" não adiciona filtro de situação', () => {
  const { where, parametros } = pecasRepository.montarFiltro({ situacao: 'todas' });

  assert.equal(where, 'WHERE p.ativo = 1');
  assert.deepEqual(parametros, []);
});

test('resumoPorSituacao soma os totais por situação', async () => {
  const resumo = await pecasRepository.resumoPorSituacao();

  assert.deepEqual(resumo, { total: 8, disponivel: 5, baixo: 2, indisponivel: 1 });
});

test('listarCategorias devolve só os nomes', async () => {
  assert.deepEqual(await pecasRepository.listarCategorias(), ['Filtros', 'Freios']);
});
