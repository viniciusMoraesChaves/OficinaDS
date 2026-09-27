const test = require('node:test');
const assert = require('node:assert/strict');

// Troca o repository real (que acessa o MySQL) por um dublê em memória,
// simulando um usuário Administrador (id 1) e um Funcionario (id 2).
const usuariosRepositoryPath = require.resolve('../src/repositories/usuariosRepository');
require.cache[usuariosRepositoryPath] = {
  id: usuariosRepositoryPath,
  filename: usuariosRepositoryPath,
  loaded: true,
  exports: {
    async buscarComPerfilPorId(idUsuario) {
      const usuarios = {
        1: { id: 1, email: 'admin@oficina.test', ativo: true, perfilId: 1, perfil: 'Administrador' },
        2: { id: 2, email: 'funcionario@oficina.test', ativo: true, perfilId: 2, perfil: 'Funcionario' },
        3: { id: 3, email: 'inativo@oficina.test', ativo: false, perfilId: 2, perfil: 'Funcionario' }
      };
      return usuarios[idUsuario] || null;
    }
  }
};

const { carregarUsuarioLogado, permitirPerfis } = require('../src/middlewares/permissoes');

function criarRespostaFake() {
  const res = {};
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (corpo) => {
    res.corpo = corpo;
    return res;
  };
  return res;
}

test('carregarUsuarioLogado busca o perfil do Administrador pelo id do token', async () => {
  const req = { usuario: { id_usuario: 1 } };
  const res = criarRespostaFake();
  let chamouNext = false;

  await carregarUsuarioLogado(req, res, () => {
    chamouNext = true;
  });

  assert.equal(chamouNext, true);
  assert.equal(req.usuarioLogado.perfil, 'Administrador');
});

test('carregarUsuarioLogado busca o perfil do Funcionario pelo id do token', async () => {
  const req = { usuario: { id_usuario: 2 } };
  const res = criarRespostaFake();
  let chamouNext = false;

  await carregarUsuarioLogado(req, res, () => {
    chamouNext = true;
  });

  assert.equal(chamouNext, true);
  assert.equal(req.usuarioLogado.perfil, 'Funcionario');
});

test('carregarUsuarioLogado responde 401 quando o usuário está inativo', async () => {
  const req = { usuario: { id_usuario: 3 } };
  const res = criarRespostaFake();

  await carregarUsuarioLogado(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.corpo.erro, 'USUARIO_INVALIDO');
});

test('carregarUsuarioLogado responde 401 quando não há token decodificado', async () => {
  const req = {};
  const res = criarRespostaFake();

  await carregarUsuarioLogado(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.corpo.erro, 'USUARIO_NAO_IDENTIFICADO');
});

test('permitirPerfis libera o Administrador em rota restrita a Administrador', () => {
  const req = { usuarioLogado: { perfil: 'Administrador' } };
  const res = criarRespostaFake();
  let chamouNext = false;

  permitirPerfis('Administrador')(req, res, () => {
    chamouNext = true;
  });

  assert.equal(chamouNext, true);
  assert.equal(res.statusCode, undefined);
});

test('permitirPerfis bloqueia o Funcionario em rota restrita a Administrador', () => {
  const req = { usuarioLogado: { perfil: 'Funcionario' } };
  const res = criarRespostaFake();
  let chamouNext = false;

  permitirPerfis('Administrador')(req, res, () => {
    chamouNext = true;
  });

  assert.equal(chamouNext, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.corpo.erro, 'PERMISSAO_NEGADA');
});

test('permitirPerfis libera Administrador e Funcionario quando ambos são aceitos', () => {
  const res1 = criarRespostaFake();
  const res2 = criarRespostaFake();
  let chamadas = 0;

  permitirPerfis('Administrador', 'Funcionario')(
    { usuarioLogado: { perfil: 'Administrador' } },
    res1,
    () => chamadas++
  );
  permitirPerfis('Administrador', 'Funcionario')(
    { usuarioLogado: { perfil: 'Funcionario' } },
    res2,
    () => chamadas++
  );

  assert.equal(chamadas, 2);
});

test('permitirPerfis responde 401 quando não há usuário logado', () => {
  const req = {};
  const res = criarRespostaFake();

  permitirPerfis('Administrador')(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.corpo.erro, 'USUARIO_NAO_IDENTIFICADO');
});