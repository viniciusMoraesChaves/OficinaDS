const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

const perfisPorUsuario = {
  1: { id: 1, ativo: 1, perfil: 'Administrador', email: 'admin@teste.com' },
  2: { id: 2, ativo: 1, perfil: 'Funcionario', email: 'func@teste.com' },
  3: { id: 3, ativo: 1, perfil: 'Cliente', email: 'cliente@teste.com' }
};

const chamadas = [];

simular('../src/repositories/usuariosRepository', {
  async buscarComPerfilPorId(id) {
    return perfisPorUsuario[id] || null;
  }
});

simular('../src/repositories/movimentacoesRepository', {
  async listar() {
    return { rows: [], total: 0 };
  },
  async resumo() {
    return { entradas: 0, saidas: 0, resultado: 0, quantidade: 0 };
  },
  async criar() {
    return 1;
  },
  async serie(filtros, granularidade) {
    chamadas.push({ filtros, granularidade });
    return granularidade === 'dia'
      ? [{ periodo: '2026-11-02', entradas: 500, saidas: 120.5 }]
      : [{ periodo: '2026-10', entradas: 900, saidas: 300 }];
  }
});

const env = require('../src/config/env');
const { errorHandler } = require('../src/middlewares/errorHandler');
const movimentacoesRoutes = require('../src/routes/movimentacoesRoutes');

async function iniciar(t) {
  const app = express();
  app.use(express.json());
  app.use('/api/financeiro/movimentacoes', movimentacoesRoutes);
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function chamar(base, caminho, usuario) {
  return fetch(`${base}${caminho}`, {
    headers: usuario
      ? { Authorization: `Bearer ${jwt.sign({ id_usuario: usuario }, env.jwtSecret, { expiresIn: '1h' })}` }
      : {}
  });
}

test('o gráfico exige login e é exclusivo do Administrador', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  assert.equal((await chamar(base, '/api/financeiro/movimentacoes/grafico')).status, 401);
  assert.equal((await chamar(base, '/api/financeiro/movimentacoes/grafico', 2)).status, 403);
  assert.equal((await chamar(base, '/api/financeiro/movimentacoes/grafico', 3)).status, 403);
  assert.equal(chamadas.length, 0, 'perfis sem acesso não podem chegar ao banco');
});

test('período curto devolve a série por dia, sem buracos', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  const resposta = await chamar(
    base,
    '/api/financeiro/movimentacoes/grafico?inicio=2026-11-01&fim=2026-11-04',
    1
  );
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.equal(corpo.dados.granularidade, 'dia');
  assert.deepEqual(
    corpo.dados.serie.map((p) => p.periodo),
    ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
  );
  assert.deepEqual(corpo.dados.serie[1], { periodo: '2026-11-02', entradas: 500, saidas: 120.5 });
  assert.equal(corpo.dados.serie[0].entradas, 0);
  assert.equal(chamadas[0].granularidade, 'dia');
});

test('sem período a série é mensal e os filtros chegam ao repositório', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  const resposta = await chamar(
    base,
    '/api/financeiro/movimentacoes/grafico?tipo=saida&categoria=Aluguel&busca=galp%C3%A3o',
    1
  );
  const corpo = await resposta.json();

  assert.equal(corpo.dados.granularidade, 'mes');
  assert.equal(corpo.dados.serie[0].periodo, '2026-10');
  assert.equal(chamadas[0].filtros.tipo, 'saida');
  assert.equal(chamadas[0].filtros.categoria, 'Aluguel');
  assert.equal(chamadas[0].filtros.busca, 'galpão');
});

test('filtros inválidos no gráfico respondem 400', async (t) => {
  const base = await iniciar(t);

  const resposta = await chamar(
    base,
    '/api/financeiro/movimentacoes/grafico?inicio=2026-12-01&fim=2026-11-01',
    1
  );

  assert.equal(resposta.status, 400);
});
