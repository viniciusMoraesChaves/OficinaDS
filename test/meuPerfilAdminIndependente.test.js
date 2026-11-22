const test = require('node:test');
const assert = require('node:assert/strict');

let vinculo;
let ultimaConsulta;
let resultadoUpdate = { affectedRows: 1 };
const databasePath = require.resolve('../src/config/database');
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        ultimaConsulta = { sql, params };
        if (sql.includes('AS clienteId')) {
          return [vinculo ? [vinculo] : []];
        }
        if (sql.includes('UPDATE')) {
          return [resultadoUpdate];
        }
        return [[{ id: 1, perfil: 'Administrador', possuiCadastroPessoal: 1 }]];
      }
    }
  }
};

const repositorio = require('../src/repositories/usuariosRepository');

test('GET Meu Perfil habilita edição de administrador independente e usa usuario como origem', async () => {
  const perfil = await repositorio.buscarDadosMeuPerfil(1);
  assert.equal(perfil.possuiCadastroPessoal, 1);
  assert.match(ultimaConsulta.sql, /OR p\.nome = 'Administrador'/);
  assert.match(ultimaConsulta.sql, /ELSE u\.nome/);
  assert.match(ultimaConsulta.sql, /ELSE u\.telefone/);
  assert.match(ultimaConsulta.sql, /THEN u\.cpf/);
  assert.match(ultimaConsulta.sql, /END AS podeEditarCpf/);
});

test('administrador independente atualiza nome e telefone no usuario', async () => {
  vinculo = { clienteId: null, funcionarioId: null, perfil: 'Administrador' };
  resultadoUpdate = { affectedRows: 1 };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(1, {
    nome: ' Administradora ', telefone: ' (19) 99999-9999 '
  });
  assert.deepEqual(resultado, { atualizado: true });
  assert.match(ultimaConsulta.sql, /UPDATE usuario/);
  assert.match(ultimaConsulta.sql, /nome = \?, telefone = \?/);
  assert.match(ultimaConsulta.sql, /WHERE id_usuario = \?/);
  assert.match(ultimaConsulta.sql, /nome = 'Administrador'/);
  assert.deepEqual(ultimaConsulta.params, ['Administradora', '(19) 99999-9999', 1]);
});

test('admin vinculado a funcionario continua alterando funcionario', async () => {
  vinculo = { clienteId: null, funcionarioId: 4, perfil: 'Administrador' };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(1, {
    nome: 'Gerente', telefone: ''
  });
  assert.deepEqual(resultado, { atualizado: true });
  assert.match(ultimaConsulta.sql, /UPDATE funcionario/);
  assert.deepEqual(ultimaConsulta.params, ['Gerente', null, 1]);
});

test('cliente continua alterando dados em cliente, inclusive endereco', async () => {
  vinculo = { clienteId: 3, funcionarioId: null, perfil: 'Cliente' };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(7, {
    nome: 'Cliente', telefone: '', endereco: 'Rua A'
  });
  assert.deepEqual(resultado, { atualizado: true });
  assert.match(ultimaConsulta.sql, /UPDATE cliente/);
  assert.match(ultimaConsulta.sql, /endereco = \?/);
  assert.deepEqual(ultimaConsulta.params, ['Cliente', null, 'Rua A', 7]);
});

test('conta sem vinculo e sem perfil de admin continua bloqueada', async () => {
  vinculo = { clienteId: null, funcionarioId: null, perfil: 'Funcionario' };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(9, {
    nome: 'Teste', telefone: ''
  });
  assert.deepEqual(resultado, { atualizado: false, motivo: 'SEM_CADASTRO_VINCULADO' });
});

test('usuario inexistente continua retornando usuario nao encontrado', async () => {
  vinculo = null;
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(9, {
    nome: 'Teste', telefone: ''
  });
  assert.deepEqual(resultado, { atualizado: false, motivo: 'USUARIO_NAO_ENCONTRADO' });
});


test('admin independente consegue adicionar CPF e guardar no usuario', async () => {
  vinculo = { clienteId: null, funcionarioId: null, perfil: 'Administrador' };
  resultadoUpdate = { affectedRows: 1 };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(1, {
    nome: 'Bruno Alves', telefone: '19999955534', cpf: '12345678909'
  });
  assert.deepEqual(resultado, { atualizado: true });
  assert.match(ultimaConsulta.sql, /UPDATE usuario/);
  assert.match(ultimaConsulta.sql, /cpf = \?/);
  assert.deepEqual(ultimaConsulta.params, ['Bruno Alves', '19999955534', '12345678909', 1]);
});

test('admin independente pode atualizar nome sem alterar CPF anterior', async () => {
  vinculo = { clienteId: null, funcionarioId: null, perfil: 'Administrador' };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(1, {
    nome: 'Novo Nome', telefone: '11'
  });
  assert.deepEqual(resultado, { atualizado: true });
  assert.doesNotMatch(ultimaConsulta.sql, /cpf = \?/);
  assert.deepEqual(ultimaConsulta.params, ['Novo Nome', '11', 1]);
});

test('cliente nao pode alterar CPF pela API de dados pessoais', async () => {
  vinculo = { clienteId: 2, funcionarioId: null, perfil: 'Cliente' };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(1, {
    nome: 'Cliente', telefone: '', cpf: '12345678909'
  });
  assert.deepEqual(resultado, { atualizado: false, motivo: 'CPF_NAO_EDITAVEL' });
});

test('admin vinculado nao pode alterar CPF pelo perfil', async () => {
  vinculo = { clienteId: null, funcionarioId: 2, perfil: 'Administrador' };
  const resultado = await repositorio.atualizarDadosPessoaisMeuPerfil(1, {
    nome: 'Gerente', telefone: '', cpf: '12345678909'
  });
  assert.deepEqual(resultado, { atualizado: false, motivo: 'CPF_NAO_EDITAVEL' });
});
