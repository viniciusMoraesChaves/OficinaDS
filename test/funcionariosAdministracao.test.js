const test = require('node:test');
const assert = require('node:assert/strict');

const funcionariosPath = require.resolve('../src/repositories/funcionariosRepository');
const cargosPath = require.resolve('../src/repositories/cargosRepository');
const perfisPath = require.resolve('../src/repositories/perfisRepository');
const contasPath = require.resolve('../src/repositories/contasRepository');

const estado = { atualizacao: null };

require.cache[funcionariosPath] = {
  id: funcionariosPath,
  filename: funcionariosPath,
  loaded: true,
  exports: {
    async findById(id) {
      return id === 2
        ? { id: 2, nome: 'Carlos', cargoId: 2, cargo: 'Mecânico', ativo: 1 }
        : null;
    },
    async listarServicosAtribuidos(id) {
      return [{ referencia: 'AG-4', tipo: 'Agendamento', servico: 'Revisão', funcionarioId: id }];
    },
    async atualizar(dados) {
      estado.atualizacao = dados;
      return dados.idFuncionario === 2;
    }
  }
};

require.cache[cargosPath] = {
  id: cargosPath,
  filename: cargosPath,
  loaded: true,
  exports: {
    async findById(id) {
      return id === 2 ? { id: 2, nome: 'Mecânico' } : null;
    }
  }
};

require.cache[perfisPath] = {
  id: perfisPath,
  filename: perfisPath,
  loaded: true,
  exports: {
    async buscarPorNome() {
      return { id: 2, nome: 'Funcionário' };
    }
  }
};

require.cache[contasPath] = {
  id: contasPath,
  filename: contasPath,
  loaded: true,
  exports: {}
};

const controller = require('../src/controllers/funcionariosController');

function respostaFake() {
  const res = {};
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (corpo) => { res.corpo = corpo; return res; };
  return res;
}

test('obter funcionário inclui os serviços atribuídos', async () => {
  const res = respostaFake();
  await controller.obter({ params: { id: '2' } }, res);

  assert.equal(res.corpo.dados.nome, 'Carlos');
  assert.equal(res.corpo.dados.servicos[0].referencia, 'AG-4');
});

test('atualizar permite editar dados e inativar funcionário e usuário', async () => {
  estado.atualizacao = null;
  const res = respostaFake();

  await controller.atualizar(
    {
      params: { id: '2' },
      body: {
        nome: ' Carlos Silva ',
        cpf: '123.456.789-01',
        email: 'CARLOS@OFICINA.TEST',
        telefone: '(19) 99999-0000',
        dataAdmissao: '2026-01-10',
        idCargo: 2,
        ativo: false
      }
    },
    res
  );

  assert.equal(estado.atualizacao.nome, 'Carlos Silva');
  assert.equal(estado.atualizacao.cpf, '12345678901');
  assert.equal(estado.atualizacao.email, 'carlos@oficina.test');
  assert.equal(estado.atualizacao.ativo, false);
  assert.match(res.corpo.mensagem, /inativado/);
});

test('atualizar recusa situação e data de admissão inválidas', async () => {
  const base = {
    nome: 'Carlos', cpf: '12345678901', email: 'carlos@oficina.test',
    telefone: '', dataAdmissao: '2026-01-10', idCargo: 2, ativo: true
  };

  await assert.rejects(
    controller.atualizar(
      { params: { id: '2' }, body: { ...base, dataAdmissao: '2026-02-30' } },
      respostaFake()
    ),
    /data de admissão válida/
  );

  const res = respostaFake();
  await controller.atualizar(
    { params: { id: '2' }, body: { ...base, ativo: 'não' } },
    res
  );
  assert.equal(res.statusCode, 400);
});
