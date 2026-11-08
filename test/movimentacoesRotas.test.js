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

const gravados = [];

simular('../src/repositories/usuariosRepository', {
  async buscarComPerfilPorId(id) {
    return perfisPorUsuario[id] || null;
  }
});

simular('../src/repositories/movimentacoesRepository', {
  async listar(filtros, paginacao) {
    return {
      rows: [{ id: 'M1', origem: 'manual', tipo: 'entrada', valor: 100, data: '2026-11-09' }],
      total: 1,
      recebido: { filtros, paginacao }
    };
  },
  async resumo() {
    return { entradas: 100, saidas: 0, resultado: 100, quantidade: 1 };
  },
  async criar(dados) {
    gravados.push(dados);
    return 5;
  }
});

const env = require('../src/config/env');
const { errorHandler } = require('../src/middlewares/errorHandler');
const movimentacoesRoutes = require('../src/routes/movimentacoesRoutes');
const financeiroController = require('../src/controllers/financeiroController');
const { protegerRota } = require('../src/middlewares/permissoes');

function criarApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/financeiro/movimentacoes', movimentacoesRoutes);
  app.get('/api/financeiro/resumo', protegerRota('Administrador'), financeiroController.resumo);
  app.use(errorHandler);
  return app;
}

async function iniciar(t) {
  const server = criarApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function tokenDe(idUsuario) {
  return jwt.sign({ id_usuario: idUsuario }, env.jwtSecret, { expiresIn: '1h' });
}

function chamar(base, caminho, { usuario, metodo = 'GET', corpo } = {}) {
  return fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(usuario ? { Authorization: `Bearer ${tokenDe(usuario)}` } : {})
    },
    body: corpo && metodo !== 'GET' ? JSON.stringify(corpo) : undefined
  });
}

const lancamento = {
  tipo: 'saida',
  categoria: 'Aluguel',
  descricao: 'Aluguel do galpão',
  valor: '2.300,00',
  data: '2026-01-05'
};

test('sem login, todas as rotas financeiras respondem 401', async (t) => {
  const base = await iniciar(t);

  for (const [metodo, caminho] of [
    ['GET', '/api/financeiro/movimentacoes'],
    ['POST', '/api/financeiro/movimentacoes'],
    ['GET', '/api/financeiro/movimentacoes/categorias'],
    ['GET', '/api/financeiro/resumo']
  ]) {
    const resposta = await chamar(base, caminho, { metodo });
    assert.equal(resposta.status, 401, `${metodo} ${caminho}`);
  }
});

test('Funcionario e Cliente recebem 403 em todas as rotas financeiras', async (t) => {
  const base = await iniciar(t);

  for (const usuario of [2, 3]) {
    for (const [metodo, caminho] of [
      ['GET', '/api/financeiro/movimentacoes'],
      ['POST', '/api/financeiro/movimentacoes'],
      ['GET', '/api/financeiro/movimentacoes/categorias'],
      ['GET', '/api/financeiro/resumo']
    ]) {
      const resposta = await chamar(base, caminho, { usuario, metodo, corpo: lancamento });
      assert.equal(resposta.status, 403, `usuário ${usuario}: ${metodo} ${caminho}`);
    }
  }

  assert.equal(gravados.length, 0, 'nenhum lançamento pode ser gravado por perfil sem acesso');
});

test('Administrador lista as movimentações com resumo e paginação', async (t) => {
  const base = await iniciar(t);

  const resposta = await chamar(
    base,
    '/api/financeiro/movimentacoes?pagina=1&limite=8&tipo=entrada&inicio=2026-11-01',
    { usuario: 1 }
  );
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.equal(corpo.dados.length, 1);
  assert.deepEqual(corpo.resumo, { entradas: 100, saidas: 0, resultado: 100, quantidade: 1 });
  assert.equal(corpo.filtros.tipo, 'entrada');
  assert.equal(corpo.filtros.inicio, '2026-11-01');
  assert.equal(corpo.paginacao.total, 1);
});

test('Administrador com filtro inválido recebe 400', async (t) => {
  const base = await iniciar(t);

  const resposta = await chamar(base, '/api/financeiro/movimentacoes?tipo=outro', { usuario: 1 });

  assert.equal(resposta.status, 400);
});

test('Administrador registra um lançamento e o usuário fica gravado', async (t) => {
  const base = await iniciar(t);
  gravados.length = 0;

  const resposta = await chamar(base, '/api/financeiro/movimentacoes', {
    usuario: 1,
    metodo: 'POST',
    corpo: lancamento
  });
  const corpo = await resposta.json();

  assert.equal(resposta.status, 201);
  assert.equal(corpo.dados.id, 'M5');
  assert.equal(corpo.dados.valor, 2300);
  assert.equal(gravados.length, 1);
  assert.equal(gravados[0].idUsuario, 1);
  assert.equal(gravados[0].formaPagamento, null);
});

test('lançamento inválido responde 400 e não grava nada', async (t) => {
  const base = await iniciar(t);
  gravados.length = 0;

  const resposta = await chamar(base, '/api/financeiro/movimentacoes', {
    usuario: 1,
    metodo: 'POST',
    corpo: { ...lancamento, valor: '-10' }
  });

  assert.equal(resposta.status, 400);
  assert.equal(gravados.length, 0);
});

test('Administrador consulta as categorias e o resumo consolidado', async (t) => {
  const base = await iniciar(t);

  const categorias = await (
    await chamar(base, '/api/financeiro/movimentacoes/categorias', { usuario: 1 })
  ).json();
  const resumo = await (
    await chamar(base, '/api/financeiro/resumo?inicio=2026-11-01&fim=2026-11-30', { usuario: 1 })
  ).json();

  assert.ok(categorias.dados.categorias.entrada.includes('Serviços'));
  assert.ok(categorias.dados.categorias.saida.includes('Aluguel'));
  assert.ok(categorias.dados.formasPagamento.includes('pix'));
  assert.equal(resumo.dados.resultado, 100);
  assert.deepEqual(resumo.dados.periodo, { inicio: '2026-11-01', fim: '2026-11-30' });
});
