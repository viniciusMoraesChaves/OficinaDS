const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];
let respostaInsert = () => [{ insertId: 7 }];
let linhasLista = [];

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        calls.push({ sql, params });

        if (sql.includes('INSERT INTO avaliacao_funcionario')) return respostaInsert();
        if (sql.includes('WHERE a.id_atendimento = ?')) {
          return [[{ id: 3, idCliente: 5, idFuncionario: 2, status: 'aberto', etapaAtual: 'Concluída', nota: null }]];
        }

        return [linhasLista];
      }
    }
  }
};

const avaliacoesRepository = require('../src/repositories/avaliacoesRepository');

test('buscarAtendimento traz cliente, funcionário responsável, etapa e nota', async () => {
  calls.length = 0;

  const atendimento = await avaliacoesRepository.buscarAtendimento(3);

  assert.equal(atendimento.idFuncionario, 2);
  assert.equal(atendimento.nota, null);
  assert.match(calls[0].sql, /LEFT JOIN avaliacao_funcionario/);
  assert.deepEqual(calls[0].params, [3]);
});

test('registrar grava atendimento, funcionário, cliente e nota', async () => {
  calls.length = 0;

  const id = await avaliacoesRepository.registrar({
    idAtendimento: 3,
    idFuncionario: 2,
    idCliente: 5,
    nota: 4
  });

  assert.equal(id, 7);
  assert.deepEqual(calls[0].params, [3, 2, 5, 4]);
});

test('registrar traduz avaliação duplicada em erro 409', async () => {
  respostaInsert = () => {
    throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
  };

  await assert.rejects(
    () => avaliacoesRepository.registrar({ idAtendimento: 3, idFuncionario: 2, idCliente: 5, nota: 4 }),
    { statusCode: 409, message: 'Este atendimento já foi avaliado.' }
  );
});

test('registrar repassa outros erros do banco sem esconder', async () => {
  respostaInsert = () => {
    throw Object.assign(new Error('banco fora do ar'), { code: 'ECONNREFUSED' });
  };

  await assert.rejects(
    () => avaliacoesRepository.registrar({ idAtendimento: 3, idFuncionario: 2, idCliente: 5, nota: 4 }),
    { code: 'ECONNREFUSED' }
  );
});

test('listarDoCliente mostra só atendimentos concluídos e esconde campos internos', async () => {
  linhasLista = [
    { id: 1, status: 'aberto', etapaAtual: 'Em serviço', nota: null, funcionarioNome: 'Carlos' },
    { id: 2, status: 'aberto', etapaAtual: 'Concluída', nota: null, funcionarioNome: 'Carlos' },
    { id: 3, status: 'concluido', etapaAtual: null, nota: 5, funcionarioNome: 'Marina' }
  ];
  calls.length = 0;

  const lista = await avaliacoesRepository.listarDoCliente(5);

  assert.deepEqual(lista.map((item) => item.id), [2, 3]);
  assert.equal('status' in lista[0], false);
  assert.equal('etapaAtual' in lista[0], false);
  assert.equal(lista[1].nota, 5);
  assert.match(calls[0].sql, /a\.id_cliente = \?/);
  assert.match(calls[0].sql, /a\.status <> 'cancelado'/);
  assert.deepEqual(calls[0].params, [5]);
});
