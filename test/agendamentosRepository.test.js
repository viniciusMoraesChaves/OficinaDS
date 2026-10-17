const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const registro = { poolCalls: [], conexaoCalls: [], eventos: [], linhaAtual: null };

const conexao = {
  async beginTransaction() { registro.eventos.push('begin'); },
  async commit() { registro.eventos.push('commit'); },
  async rollback() { registro.eventos.push('rollback'); },
  release() { registro.eventos.push('release'); },
  async execute(sql, params = []) {
    registro.conexaoCalls.push({ sql, params });

    if (/FROM agendamento\s+WHERE id_agendamento = \?\s+FOR UPDATE/.test(sql)) {
      return [registro.linhaAtual ? [registro.linhaAtual] : []];
    }

    if (/FOR UPDATE/.test(sql)) {
      return [[]];
    }

    return [{ affectedRows: 1, insertId: 77 }];
  }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        registro.poolCalls.push({ sql, params });
        return [[{ id: 10 }]];
      },
      async getConnection() {
        return conexao;
      }
    }
  }
};

const repository = require('../src/repositories/agendamentosRepository');

function reiniciar(linhaAtual = null) {
  registro.poolCalls = [];
  registro.conexaoCalls = [];
  registro.eventos = [];
  registro.linhaAtual = linhaAtual;
}

test('reagendarSeLivre bloqueia as linhas, atualiza e confirma a transação', async () => {
  reiniciar({ id: 10, funcionarioId: 2, veiculoId: 1, status: 'Agendado', dataHora: '2026-10-20T09:00:00' });
  let validou = false;

  const resultado = await repository.reagendarSeLivre(10, '2026-10-22 14:00:00', (atual, ocupados) => {
    validou = true;
    assert.equal(atual.id, 10);
    assert.deepEqual(ocupados, []);
  });

  assert.equal(validou, true);
  assert.deepEqual(resultado, { id: 10 });
  assert.deepEqual(registro.eventos, ['begin', 'commit', 'release']);

  const update = registro.conexaoCalls.find((chamada) => /UPDATE agendamento/.test(chamada.sql));
  assert.ok(update, 'deve executar o UPDATE');
  assert.match(update.sql, /qtd_reagendamentos = qtd_reagendamentos \+ 1/);
  assert.deepEqual(update.params, ['2026-10-22 14:00:00', 10]);

  const buscaDoDia = registro.conexaoCalls.find((chamada) => /DATE_ADD\(\?, INTERVAL 1 DAY\)/.test(chamada.sql));
  assert.match(buscaDoDia.sql, /FOR UPDATE/);
  assert.equal(buscaDoDia.params[0], '2026-10-22 00:00:00');
});

test('reagendarSeLivre desfaz a transação quando a validação recusa', async () => {
  reiniciar({ id: 10, funcionarioId: 2, veiculoId: 1, status: 'Agendado', dataHora: '2026-10-20T09:00:00' });

  await assert.rejects(
    repository.reagendarSeLivre(10, '2026-10-22 14:00:00', () => {
      throw new Error('conflito');
    }),
    /conflito/
  );

  assert.deepEqual(registro.eventos, ['begin', 'rollback', 'release']);
  assert.equal(
    registro.conexaoCalls.some((chamada) => /UPDATE agendamento/.test(chamada.sql)),
    false
  );
});

test('reagendarSeLivre devolve null quando o agendamento não existe', async () => {
  reiniciar(null);

  const resultado = await repository.reagendarSeLivre(99, '2026-10-22 14:00:00', () => {});

  assert.equal(resultado, null);
  assert.deepEqual(registro.eventos, ['begin', 'commit', 'release']);
});

test('createSeLivre insere com status Agendado dentro da transação', async () => {
  reiniciar();

  await repository.createSeLivre(
    { clienteId: 7, veiculoId: 1, funcionarioId: 2, servico: 'Revisão geral', inicioSql: '2026-10-21 08:00:00' },
    () => {}
  );

  const insert = registro.conexaoCalls.find((chamada) => /INSERT INTO agendamento/.test(chamada.sql));
  assert.deepEqual(insert.params, [7, 1, 2, 'Revisão geral', '2026-10-21 08:00:00', 60, 'Agendado']);
  assert.deepEqual(registro.eventos, ['begin', 'commit', 'release']);
});

test('findOccupiedByDay consulta somente status que ocupam horário', async () => {
  reiniciar();

  await repository.findOccupiedByDay('2026-10-22');

  const chamada = registro.poolCalls[0];
  assert.doesNotMatch(chamada.sql, /FOR UPDATE/);
  assert.deepEqual(chamada.params.slice(2), ['Agendado', 'Confirmado', 'Em atendimento']);
});

test('findByCliente filtra pelo cliente e deixa concluídos e cancelados por último', async () => {
  reiniciar();

  await repository.findByCliente(7);

  const chamada = registro.poolCalls[0];
  assert.match(chamada.sql, /WHERE ag\.id_cliente = \?/);
  assert.deepEqual(chamada.params, [7, 'Concluído', 'Cancelado']);
});
