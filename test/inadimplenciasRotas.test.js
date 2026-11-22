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

simular('../src/repositories/cobrancasRepository', {
  async findInadimplentes() {
    return { rows: [], total: 0, valorTotal: 0 };
  },
  async findClientesInadimplentes() {
    return { rows: [], total: 0 };
  },
  async registrarPagamento() {
    return { registrado: true, status: 'pago' };
  },
  async registrarPagamentoDoCliente() {
    return 2;
  },
  async resumoFinanceiro() {
    return { valorVencido: 0, cobrancasVencidas: 0, clientesInadimplentes: 0, maiorAtrasoDias: 0, valorAVencer: 0 };
  }
});

const app = require('../src/app');
const env = require('../src/config/env');

const ROTAS = [
  '/api/financeiro/inadimplencias',
  '/api/financeiro/inadimplencias/clientes',
  '/api/financeiro/inadimplencias/resumo'
];

async function iniciar(t) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  return `http://127.0.0.1:${server.address().port}`;
}

function cabecalho(idUsuario) {
  const token = jwt.sign({ id_usuario: idUsuario }, env.jwtSecret, { expiresIn: '5m' });
  return { Authorization: `Bearer ${token}` };
}

test('rotas de inadimplências exigem login', async (t) => {
  const base = await iniciar(t);

  for (const caminho of ROTAS) {
    const resposta = await fetch(`${base}${caminho}`);
    assert.equal(resposta.status, 401, caminho);
  }
});

test('Funcionario e Cliente não acessam as inadimplências (403)', async (t) => {
  const base = await iniciar(t);

  for (const idUsuario of [2, 3]) {
    for (const caminho of ROTAS) {
      const resposta = await fetch(`${base}${caminho}`, { headers: cabecalho(idUsuario) });
      assert.equal(resposta.status, 403, `${caminho} (usuário ${idUsuario})`);
    }
  }
});

test('Administrador consulta as inadimplências (200)', async (t) => {
  const base = await iniciar(t);

  for (const caminho of ROTAS) {
    const resposta = await fetch(`${base}${caminho}`, { headers: cabecalho(1) });
    assert.equal(resposta.status, 200, caminho);
  }
});

test('filtro inválido responde 400 para o Administrador', async (t) => {
  const base = await iniciar(t);

  const resposta = await fetch(`${base}/api/financeiro/inadimplencias?faixaAtraso=xyz`, {
    headers: cabecalho(1)
  });

  assert.equal(resposta.status, 400);
});

const ROTAS_DE_PAGAMENTO = [
  '/api/financeiro/inadimplencias/12/pagamento',
  '/api/financeiro/inadimplencias/clientes/4/pagamento'
];

test('registrar pagamento exige login', async (t) => {
  const base = await iniciar(t);

  for (const caminho of ROTAS_DE_PAGAMENTO) {
    const resposta = await fetch(`${base}${caminho}`, { method: 'PATCH' });
    assert.equal(resposta.status, 401, caminho);
  }
});

test('Funcionario e Cliente não registram pagamento (403)', async (t) => {
  const base = await iniciar(t);

  for (const idUsuario of [2, 3]) {
    for (const caminho of ROTAS_DE_PAGAMENTO) {
      const resposta = await fetch(`${base}${caminho}`, {
        method: 'PATCH',
        headers: cabecalho(idUsuario)
      });
      assert.equal(resposta.status, 403, `${caminho} (usuário ${idUsuario})`);
    }
  }
});

test('Administrador registra pagamento (200)', async (t) => {
  const base = await iniciar(t);

  for (const caminho of ROTAS_DE_PAGAMENTO) {
    const resposta = await fetch(`${base}${caminho}`, {
      method: 'PATCH',
      headers: cabecalho(1)
    });
    assert.equal(resposta.status, 200, caminho);
  }
});

test('id inválido no pagamento responde 400', async (t) => {
  const base = await iniciar(t);

  const resposta = await fetch(`${base}/api/financeiro/inadimplencias/abc/pagamento`, {
    method: 'PATCH',
    headers: cabecalho(1)
  });

  assert.equal(resposta.status, 400);
});
