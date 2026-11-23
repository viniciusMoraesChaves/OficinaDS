const test = require('node:test');
const assert = require('node:assert/strict');

const repositoryPath = require.resolve('../src/repositories/danosChegadaRepository');
const chamadas = [];
let atendimento = { id: 7, idVeiculo: 19, status: 'aberto' };
let funcionario = { id: 2 };
let idRegistrado = 33;
const registros = [{ id: 33, descricao: 'Arranhão na porta dianteira direita', registradoPor: 'Carlos', registradoEm: '2026-11-23 10:00:00', veiculoId: 19 }];
require.cache[repositoryPath] = {
  id: repositoryPath, filename: repositoryPath, loaded: true,
  exports: {
    async buscarAtendimento(id) { chamadas.push(['atendimento', id]); return atendimento; },
    async buscarFuncionarioDoUsuario(id) { chamadas.push(['funcionario', id]); return funcionario; },
    async listar(id) { chamadas.push(['listar', id]); return registros; },
    async registrar(id, usuario, descricao) { chamadas.push(['registrar', id, usuario, descricao]); return idRegistrado; }
  }
};
const controller = require('../src/controllers/danosChegadaController');
function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}
function request(perfil = 'Funcionario', body = { descricao: 'Arranhão na porta direita' }) {
  return { params: { id: '7' }, usuarioLogado: { id: 12, perfil }, body };
}

test('descricao aceita texto entre 10 e 1000 caracteres e remove espaços', () => {
  assert.equal(controller.validarDescricao({ descricao: '  Porta amassada  ' }), 'Porta amassada');
  assert.throws(() => controller.validarDescricao({ descricao: 'curto' }), /10 a 1000/);
  assert.throws(() => controller.validarDescricao({ descricao: 'A'.repeat(1001) }), /10 a 1000/);
  assert.throws(() => controller.validarDescricao({ descricao: 123 }), /10 a 1000/);
});

test('funcionario vinculado registra dano com seu usuario autenticado, nao id do corpo', async () => {
  chamadas.length = 0;
  atendimento = { id: 7, idVeiculo: 19, status: 'aberto' };
  funcionario = { id: 2 };
  idRegistrado = 33;
  const req = request('Funcionario', { descricao: 'Arranhão na porta direita', idUsuario: 999, idVeiculo: 888 });
  const res = response();
  await controller.registrar(req, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.dados, { id: 33 });
  assert.deepEqual(chamadas, [
    ['funcionario', 12], ['atendimento', 7], ['registrar', 7, 12, 'Arranhão na porta direita']
  ]);
});

test('administrador independente pode registrar sem funcionario vinculado', async () => {
  chamadas.length = 0;
  funcionario = null;
  const res = response();
  await controller.registrar(request('Administrador'), res);
  assert.equal(res.statusCode, 201);
  assert.equal(chamadas.some((call) => call[0] === 'funcionario'), false);
});

test('funcionario sem cadastro vinculado nao pode registrar', async () => {
  chamadas.length = 0;
  funcionario = null;
  const res = response();
  await controller.registrar(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(chamadas.some((call) => call[0] === 'registrar'), false);
  funcionario = { id: 2 };
});

test('nao registra para atendimento inexistente', async () => {
  chamadas.length = 0;
  atendimento = null;
  const res = response();
  await controller.registrar(request('Administrador'), res);
  assert.equal(res.statusCode, 404);
  assert.equal(chamadas.some((call) => call[0] === 'registrar'), false);
  atendimento = { id: 7, idVeiculo: 19, status: 'aberto' };
});

test('nao registra quando atendimento foi encerrado', async () => {
  chamadas.length = 0;
  atendimento = { id: 7, idVeiculo: 19, status: 'concluido' };
  const res = response();
  await controller.registrar(request('Administrador'), res);
  assert.equal(res.statusCode, 409);
  assert.equal(chamadas.some((call) => call[0] === 'registrar'), false);
  atendimento = { id: 7, idVeiculo: 19, status: 'aberto' };
});

test('evita gravacao quando atendimento encerra durante o registro', async () => {
  idRegistrado = null;
  const res = response();
  await controller.registrar(request('Administrador'), res);
  assert.equal(res.statusCode, 409);
  idRegistrado = 33;
});

test('lista danos com responsavel e veiculo associados, incluindo historico', async () => {
  chamadas.length = 0;
  const res = response();
  await controller.listar(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dados[0].registradoPor, 'Carlos');
  assert.equal(res.body.dados[0].veiculoId, 19);
  assert.deepEqual(chamadas, [['atendimento', 7], ['listar', 7]]);
});

test('listagem de atendimento inexistente devolve 404', async () => {
  atendimento = null;
  const res = response();
  await controller.listar(request(), res);
  assert.equal(res.statusCode, 404);
  atendimento = { id: 7, idVeiculo: 19, status: 'aberto' };
});
