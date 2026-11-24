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

simular('../src/repositories/presencaRepository', {
  async listarPorData(data) {
    chamadas.push(['listarPorData', data]);
    return [
      { id: 1, idFuncionario: 5, nome: 'Ana', cargo: 'Mecânica', situacao: 'saiu', minutos: 480 },
      { id: 2, idFuncionario: 5, nome: 'Ana', cargo: 'Mecânica', situacao: 'presente', minutos: 30 },
      { id: 3, idFuncionario: 6, nome: 'Bia', cargo: 'Gerente', situacao: 'sem_saida', minutos: null }
    ];
  },
  async listarPresentes() {
    chamadas.push(['listarPresentes']);
    return [{ id: 2, idFuncionario: 5, nome: 'Ana', situacao: 'presente' }];
  },
  async listarFuncionariosComSituacao() {
    return [{ id: 5, nome: 'Ana', cargo: 'Mecânica', presenteDesde: null, situacao: 'ausente' }];
  },
  async registrarEntrada(idFuncionario, idUsuario) {
    chamadas.push(['entrada', idFuncionario, idUsuario]);
    if (idFuncionario === 8) {
      const { ConflitoError } = require('../src/utils/erros');
      throw new ConflitoError('Este funcionário já está presente.');
    }
    return 100;
  },
  async registrarSaida(idFuncionario, idUsuario) {
    chamadas.push(['saida', idFuncionario, idUsuario]);
    return 100;
  }
});

const env = require('../src/config/env');
const { errorHandler } = require('../src/middlewares/errorHandler');
const presencaRoutes = require('../src/routes/presencaRoutes');

async function iniciar(t) {
  const app = express();
  app.use(express.json());
  app.use('/api/presencas', presencaRoutes);
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function chamar(base, caminho, { usuario, metodo = 'GET', corpo } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (usuario) {
    headers.Authorization = `Bearer ${jwt.sign({ id_usuario: usuario }, env.jwtSecret, { expiresIn: '1h' })}`;
  }

  return fetch(`${base}${caminho}`, {
    method: metodo,
    headers,
    body: corpo && metodo !== 'GET' ? JSON.stringify(corpo) : undefined
  });
}

const ROTAS = [
  ['GET', '/api/presencas'],
  ['GET', '/api/presencas/presentes'],
  ['GET', '/api/presencas/funcionarios'],
  ['POST', '/api/presencas/entrada'],
  ['POST', '/api/presencas/saida']
];

test('sem login, todas as rotas de presença respondem 401', async (t) => {
  const base = await iniciar(t);

  for (const [metodo, caminho] of ROTAS) {
    const resposta = await chamar(base, caminho, { metodo, corpo: { idFuncionario: 5 } });
    assert.equal(resposta.status, 401, `${metodo} ${caminho}`);
  }
});

test('Funcionario e Cliente recebem 403 e nada é registrado', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  for (const usuario of [2, 3]) {
    for (const [metodo, caminho] of ROTAS) {
      const resposta = await chamar(base, caminho, { usuario, metodo, corpo: { idFuncionario: 5 } });
      assert.equal(resposta.status, 403, `usuário ${usuario}: ${metodo} ${caminho}`);
    }
  }

  assert.equal(chamadas.length, 0);
});

test('Administrador consulta os comparecimentos de uma data com o resumo do dia', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  const resposta = await chamar(base, '/api/presencas?data=2026-01-05', { usuario: 1 });
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.equal(corpo.data, '2026-01-05');
  assert.equal(corpo.dados.length, 3);
  assert.deepEqual(corpo.resumo, { compareceram: 2, registros: 3, semSaida: 1 });
  assert.deepEqual(chamadas[0], ['listarPorData', '2026-01-05']);
});

test('consulta com data futura ou inválida responde 400', async (t) => {
  const base = await iniciar(t);

  assert.equal((await chamar(base, '/api/presencas?data=2999-01-01', { usuario: 1 })).status, 400);
  assert.equal((await chamar(base, '/api/presencas?data=2026-02-30', { usuario: 1 })).status, 400);
});

test('Administrador consulta quem está presente agora', async (t) => {
  const base = await iniciar(t);

  const corpo = await (await chamar(base, '/api/presencas/presentes', { usuario: 1 })).json();

  assert.equal(corpo.total, 1);
  assert.equal(corpo.dados[0].nome, 'Ana');
});

test('registrar entrada grava com o usuário que fez o registro (201)', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  const resposta = await chamar(base, '/api/presencas/entrada', {
    usuario: 1,
    metodo: 'POST',
    corpo: { idFuncionario: 5 }
  });

  assert.equal(resposta.status, 201);
  assert.deepEqual(chamadas[0], ['entrada', 5, 1]);
});

test('entrada de quem já está presente responde 409', async (t) => {
  const base = await iniciar(t);

  const resposta = await chamar(base, '/api/presencas/entrada', {
    usuario: 1,
    metodo: 'POST',
    corpo: { idFuncionario: 8 }
  });
  const corpo = await resposta.json();

  assert.equal(resposta.status, 409);
  assert.match(corpo.mensagem, /já está presente/);
});

test('registrar saída funciona (200) e funcionário inválido responde 400', async (t) => {
  const base = await iniciar(t);
  chamadas.length = 0;

  const ok = await chamar(base, '/api/presencas/saida', {
    usuario: 1,
    metodo: 'POST',
    corpo: { idFuncionario: 5 }
  });
  const invalido = await chamar(base, '/api/presencas/saida', {
    usuario: 1,
    metodo: 'POST',
    corpo: { idFuncionario: 'abc' }
  });

  assert.equal(ok.status, 200);
  assert.deepEqual(chamadas[0], ['saida', 5, 1]);
  assert.equal(invalido.status, 400);
  assert.equal(chamadas.length, 1, 'id inválido não chega ao repositório');
});
