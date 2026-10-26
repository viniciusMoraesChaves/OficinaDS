const test = require('node:test');
const assert = require('node:assert/strict');

function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

const chamadas = [];

simular('../src/repositories/painelRepository', {
  async contagensEquipe(opcoes) {
    chamadas.push(['contagensEquipe', opcoes]);
    return {
      atendimentosAbertos: 2,
      orcamentosAguardando: 1,
      semDiagnostico: 0,
      estoqueAtencao: 3,
      estoqueIndisponivel: 1,
      funcionariosAtivos: opcoes.administrador ? 7 : null
    };
  },
  async listasEquipe() {
    return { orcamentos: [], semDiagnostico: [], estoque: [] };
  },
  async contagensCliente(id) {
    chamadas.push(['contagensCliente', id]);
    return { orcamentosAguardando: 1, atendimentosAbertos: 1 };
  },
  async listasCliente(id) {
    chamadas.push(['listasCliente', id]);
    return { orcamentos: [] };
  }
});

simular('../src/repositories/clientesRepository', {
  async findByUsuarioId(id) {
    return id === 30 ? { id: 99, nome: 'Argur Moraes', email: 'argur@teste.com' } : null;
  }
});

simular('../src/repositories/funcionariosRepository', {
  async findByUsuarioId(id) {
    return id === 20 ? { id: 5, nome: 'Pedro Marques' } : null;
  }
});

const { obter } = require('../src/controllers/painelController');

async function chamar(usuarioLogado) {
  let corpo;
  await obter({ usuarioLogado }, { json(valor) { corpo = valor; } });
  return corpo.dados;
}

test('Administrador recebe o cartão de funcionários e nome padrão quando não há vínculo', async () => {
  chamadas.length = 0;
  const painel = await chamar({ id: 1, perfil: 'Administrador' });

  assert.equal(painel.usuario.nome, null);
  assert.equal(painel.usuario.perfil, 'Administrador');
  assert.equal(painel.indicadores.at(-1).chave, 'equipe');
  assert.deepEqual(chamadas[0], ['contagensEquipe', { administrador: true }]);
});

test('Funcionario recebe o nome e não vê o cartão da equipe', async () => {
  const painel = await chamar({ id: 20, perfil: 'Funcionario' });

  assert.equal(painel.usuario.nome, 'Pedro Marques');
  assert.equal(painel.indicadores.some((i) => i.chave === 'equipe'), false);
  assert.equal(painel.pendencias.length, 3);
});

test('Cliente só consulta os dados do próprio cadastro', async () => {
  chamadas.length = 0;
  const painel = await chamar({ id: 30, perfil: 'Cliente' });

  assert.equal(painel.usuario.nome, 'Argur Moraes');
  assert.deepEqual(painel.indicadores.map((i) => i.chave), ['orcamentos', 'atendimentos']);
  assert.deepEqual(chamadas, [['contagensCliente', 99], ['listasCliente', 99]]);
});

test('Cliente sem cadastro vinculado recebe um painel vazio', async () => {
  const painel = await chamar({ id: 31, perfil: 'Cliente' });

  assert.deepEqual(painel.indicadores, []);
  assert.deepEqual(painel.pendencias, []);
});
