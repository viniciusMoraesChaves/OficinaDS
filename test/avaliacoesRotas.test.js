const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// Dublês em memória: nenhum teste abaixo acessa o MySQL.
function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

simular('../src/repositories/usuariosRepository', {
  async buscarComPerfilPorId(idUsuario) {
    const usuarios = {
      1: { id: 1, email: 'admin@oficina.test', ativo: true, perfil: 'Administrador' },
      2: { id: 2, email: 'func@oficina.test', ativo: true, perfil: 'Funcionario' },
      3: { id: 3, email: 'cliente@oficina.test', ativo: true, perfil: 'Cliente' }
    };
    return usuarios[idUsuario] || null;
  }
});

simular('../src/repositories/clientesRepository', {
  async findByUsuarioId(idUsuario) {
    return idUsuario === 3 ? { id: 5 } : null;
  }
});

simular('../src/repositories/avaliacoesRepository', {
  async buscarAtendimento() {
    return { id: 3, idCliente: 5, idFuncionario: 2, status: 'concluido', etapaAtual: null, nota: null };
  },
  async registrar() {
    return 41;
  },
  async listarDoCliente() {
    return [];
  }
});

const app = require('../src/app');
const env = require('../src/config/env');

async function iniciar(t) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  return `http://127.0.0.1:${server.address().port}`;
}

function cabecalho(idUsuario) {
  const token = jwt.sign({ id_usuario: idUsuario }, env.jwtSecret, { expiresIn: '5m' });
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const corpoValido = JSON.stringify({ idAtendimento: 3, nota: 5 });

test('rotas de avaliação exigem login', async (t) => {
  const base = await iniciar(t);

  const lista = await fetch(`${base}/api/avaliacoes/meus`);
  const registro = await fetch(`${base}/api/avaliacoes`, { method: 'POST' });

  assert.equal(lista.status, 401);
  assert.equal(registro.status, 401);
});

test('Funcionario não avalia nem lista avaliações (403)', async (t) => {
  const base = await iniciar(t);

  const lista = await fetch(`${base}/api/avaliacoes/meus`, { headers: cabecalho(2) });
  const registro = await fetch(`${base}/api/avaliacoes`, { method: 'POST', headers: cabecalho(2), body: corpoValido });

  assert.equal(lista.status, 403);
  assert.equal(registro.status, 403);
});

test('Administrador passa pela permissão mas não avalia por não ser cliente (403)', async (t) => {
  const base = await iniciar(t);

  const registro = await fetch(`${base}/api/avaliacoes`, { method: 'POST', headers: cabecalho(1), body: corpoValido });

  assert.equal(registro.status, 403);
  assert.equal((await registro.json()).erro, 'CLIENTE_NAO_ENCONTRADO');
});

test('Cliente registra a avaliação (201) e lista as suas (200)', async (t) => {
  const base = await iniciar(t);

  const registro = await fetch(`${base}/api/avaliacoes`, { method: 'POST', headers: cabecalho(3), body: corpoValido });
  const lista = await fetch(`${base}/api/avaliacoes/meus`, { headers: cabecalho(3) });

  assert.equal(registro.status, 201);
  assert.equal(lista.status, 200);
});

test('nota inválida responde 400 para o Cliente', async (t) => {
  const base = await iniciar(t);

  for (const nota of [0, 6, 4.5, 'abc']) {
    const resposta = await fetch(`${base}/api/avaliacoes`, {
      method: 'POST',
      headers: cabecalho(3),
      body: JSON.stringify({ idAtendimento: 3, nota })
    });

    assert.equal(resposta.status, 400, String(nota));
  }
});

test('requisição sem corpo responde 400 em vez de erro do servidor', async (t) => {
  const base = await iniciar(t);

  const resposta = await fetch(`${base}/api/avaliacoes`, { method: 'POST', headers: cabecalho(3) });

  assert.equal(resposta.status, 400);
});
