const test = require('node:test');
const assert = require('node:assert/strict');

// Troca o repository real (que acessa o MySQL) por um dublê em memória.
const repositoryPath = require.resolve('../src/repositories/agendamentosRepository');
const estado = { agendamento: null, ocupados: [], gravacoes: [] };

require.cache[repositoryPath] = {
  id: repositoryPath,
  filename: repositoryPath,
  loaded: true,
  exports: {
    async findById() {
      return estado.agendamento;
    },
    async findOccupiedByDay() {
      return estado.ocupados;
    },
    async findVehicleById(id) {
      return id === 1 ? { id: 1, clienteId: 7 } : null;
    },
    async findEmployeeById(id) {
      return id === 2 ? { id: 2 } : null;
    },
    async reagendarSeLivre(id, novoInicioSql, validar) {
      validar(estado.agendamento, estado.ocupados);
      estado.gravacoes.push({ id, novoInicioSql });
      return { ...estado.agendamento, dataHora: novoInicioSql.replace(' ', 'T'), qtdReagendamentos: 1 };
    },
    async createSeLivre(dados, validar) {
      validar(estado.ocupados);
      estado.gravacoes.push(dados);
      return { id: 50, ...dados, status: 'Agendado', dataHora: dados.inicioSql.replace(' ', 'T') };
    }
  }
};

const controller = require('../src/controllers/agendamentosController');

// Segunda-feira, 12/10/2026, 10:00.
controller.relogio.agora = () => new Date(2026, 9, 12, 10, 0, 0);

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

function preparar({ agendamento, ocupados = [] } = {}) {
  estado.agendamento = agendamento ?? {
    id: 10,
    status: 'Agendado',
    dataHora: '2026-10-20T09:00:00',
    duracaoMinutos: 60,
    funcionarioId: 2,
    veiculoId: 1
  };
  estado.ocupados = ocupados;
  estado.gravacoes = [];
}

/* ---------- Validação das entradas ---------- */

test('parseNovoAgendamento valida e limpa os dados', () => {
  assert.deepEqual(
    controller.parseNovoAgendamento({
      veiculoId: '1',
      funcionarioId: '2',
      servico: '  Troca de óleo  ',
      data: '2026-10-20',
      hora: '09:00'
    }),
    {
      veiculoId: 1,
      funcionarioId: 2,
      servico: 'Troca de óleo',
      data: '2026-10-20',
      hora: '09:00'
    }
  );
});

test('parseNovoAgendamento rejeita serviço curto, data e hora inválidas', () => {
  const base = { veiculoId: 1, funcionarioId: 2, servico: 'Revisão', data: '2026-10-20', hora: '09:00' };

  assert.throws(() => controller.parseNovoAgendamento({ ...base, servico: 'ab' }), /pelo menos 3/);
  assert.throws(() => controller.parseNovoAgendamento({ ...base, data: '2026-13-01' }), /data válida/);
  assert.throws(() => controller.parseNovoAgendamento({ ...base, hora: '9' }), /HH:mm/);
  assert.throws(() => controller.parseNovoAgendamento({ ...base, veiculoId: 0 }), /inteiro positivo/);
});

/* ---------- Reagendamento ---------- */

test('reagendar altera data e horário quando tudo é permitido', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.reagendar(
    { params: { id: '10' }, body: { data: '2026-10-22', hora: '14:00' } },
    res
  );

  assert.equal(res.statusCode, undefined);
  assert.deepEqual(estado.gravacoes, [{ id: 10, novoInicioSql: '2026-10-22 14:00:00' }]);
  assert.equal(res.corpo.dados.dataHora, '2026-10-22T14:00:00');
  assert.match(res.corpo.mensagem, /reagendado/);
});

test('reagendar altera somente o horário mantendo a data', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.reagendar(
    { params: { id: '10' }, body: { data: '2026-10-20', hora: '16:00' } },
    res
  );

  assert.deepEqual(estado.gravacoes, [{ id: 10, novoInicioSql: '2026-10-20 16:00:00' }]);
});

test('reagendar responde 404 quando o agendamento não existe', async () => {
  preparar();
  estado.agendamento = null;
  const res = criarRespostaFake();

  await controller.reagendar(
    { params: { id: '99' }, body: { data: '2026-10-22', hora: '14:00' } },
    res
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.corpo.erro, 'AGENDAMENTO_NAO_ENCONTRADO');
});

test('reagendar recusa status que não permite reagendamento', async () => {
  preparar({
    agendamento: {
      id: 10, status: 'Concluído', dataHora: '2026-10-20T09:00:00',
      duracaoMinutos: 60, funcionarioId: 2, veiculoId: 1
    }
  });

  await assert.rejects(
    controller.reagendar(
      { params: { id: '10' }, body: { data: '2026-10-22', hora: '14:00' } },
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'STATUS_NAO_PERMITIDO' && erro.statusCode === 422
  );
  assert.equal(estado.gravacoes.length, 0);
});

test('reagendar recusa quando falta antecedência mínima', async () => {
  preparar({
    agendamento: {
      id: 10, status: 'Agendado', dataHora: '2026-10-13T08:00:00', // 22h depois
      duracaoMinutos: 60, funcionarioId: 2, veiculoId: 1
    }
  });

  await assert.rejects(
    controller.reagendar(
      { params: { id: '10' }, body: { data: '2026-10-22', hora: '14:00' } },
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'ANTECEDENCIA_INSUFICIENTE' && erro.statusCode === 422
  );
  assert.equal(estado.gravacoes.length, 0);
});

test('reagendar recusa horário fora do expediente', async () => {
  preparar();

  await assert.rejects(
    controller.reagendar(
      { params: { id: '10' }, body: { data: '2026-10-25', hora: '10:00' } }, // domingo
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'FORA_DO_EXPEDIENTE'
  );
});

test('reagendar recusa o mesmo horário do agendamento atual', async () => {
  preparar();

  await assert.rejects(
    controller.reagendar(
      { params: { id: '10' }, body: { data: '2026-10-20', hora: '09:00' } },
      criarRespostaFake()
    ),
    /diferente do atual/
  );
});

test('reagendar recusa conflito com outro atendimento do profissional', async () => {
  preparar({
    ocupados: [
      { id: 20, funcionarioId: 2, veiculoId: 55, dataHora: '2026-10-22T14:00:00', duracaoMinutos: 60 }
    ]
  });

  await assert.rejects(
    controller.reagendar(
      { params: { id: '10' }, body: { data: '2026-10-22', hora: '14:00' } },
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'CONFLITO_PROFISSIONAL' && erro.statusCode === 409
  );
  assert.equal(estado.gravacoes.length, 0);
});

/* ---------- Horários disponíveis ---------- */

test('horariosReagendamento lista horários sem contar o próprio agendamento', async () => {
  preparar({
    ocupados: [
      { id: 10, funcionarioId: 2, veiculoId: 1, dataHora: '2026-10-20T09:00:00', duracaoMinutos: 60 },
      { id: 20, funcionarioId: 2, veiculoId: 55, dataHora: '2026-10-20T10:00:00', duracaoMinutos: 60 }
    ]
  });
  const res = criarRespostaFake();

  await controller.horariosReagendamento({ params: { id: '10' }, query: { data: '2026-10-20' } }, res);

  const horarios = res.corpo.dados.horarios;
  const nove = horarios.find((item) => item.hora === '09:00');
  const dez = horarios.find((item) => item.hora === '10:00');
  const onze = horarios.find((item) => item.hora === '11:00');

  assert.match(nove.motivo, /horário atual/);
  assert.match(dez.motivo, /profissional/);
  assert.equal(onze.disponivel, true);
});

test('horariosReagendamento recusa agendamento que não pode ser reagendado', async () => {
  preparar({
    agendamento: {
      id: 10, status: 'Cancelado', dataHora: '2026-10-20T09:00:00',
      duracaoMinutos: 60, funcionarioId: 2, veiculoId: 1
    }
  });

  await assert.rejects(
    controller.horariosReagendamento(
      { params: { id: '10' }, query: { data: '2026-10-21' } },
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'STATUS_NAO_PERMITIDO'
  );
});

/* ---------- Novo agendamento ---------- */

test('create grava o agendamento quando o horário está livre', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.create(
    {
      body: { veiculoId: 1, funcionarioId: 2, servico: 'Revisão geral', data: '2026-10-21', hora: '08:00' }
    },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(estado.gravacoes[0].clienteId, 7);
  assert.equal(estado.gravacoes[0].inicioSql, '2026-10-21 08:00:00');
});

test('create recusa veículo ou funcionário inexistente', async () => {
  preparar();

  await assert.rejects(
    controller.create(
      { body: { veiculoId: 9, funcionarioId: 2, servico: 'Revisão geral', data: '2026-10-21', hora: '08:00' } },
      criarRespostaFake()
    ),
    /veículo/
  );
  await assert.rejects(
    controller.create(
      { body: { veiculoId: 1, funcionarioId: 9, servico: 'Revisão geral', data: '2026-10-21', hora: '08:00' } },
      criarRespostaFake()
    ),
    /funcionário/
  );
});

test('create recusa horário já ocupado pelo profissional', async () => {
  preparar({
    ocupados: [
      { id: 20, funcionarioId: 2, veiculoId: 55, dataHora: '2026-10-21T08:00:00', duracaoMinutos: 60 }
    ]
  });

  await assert.rejects(
    controller.create(
      { body: { veiculoId: 1, funcionarioId: 2, servico: 'Revisão geral', data: '2026-10-21', hora: '08:00' } },
      criarRespostaFake()
    ),
    (erro) => erro.statusCode === 409
  );
});
