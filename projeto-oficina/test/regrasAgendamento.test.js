const test = require('node:test');
const assert = require('node:assert/strict');

const regras = require('../src/utils/regrasAgendamento');

// Segunda-feira, 12/10/2026, 10:00 (horário local).
const AGORA = new Date(2026, 9, 12, 10, 0, 0);

function agendamento(dataHora, status = 'Agendado') {
  return { id: 1, status, dataHora };
}

function ocupado(id, dataHora, funcionarioId, veiculoId, duracaoMinutos = 60) {
  return { id, dataHora, funcionarioId, veiculoId, duracaoMinutos };
}

/* ---------- Conversão de datas ---------- */

test('parseData aceita data válida e rejeita formato ou dia inexistente', () => {
  assert.equal(regras.formatarData(regras.parseData('2026-10-20')), '2026-10-20');
  assert.throws(() => regras.parseData('20/10/2026'), /AAAA-MM-DD/);
  assert.throws(() => regras.parseData('2026-02-31'), /data válida/);
  assert.throws(() => regras.parseData(''), /AAAA-MM-DD/);
});

test('parseHora aceita HH:mm e rejeita valores inválidos', () => {
  assert.deepEqual(regras.parseHora('09:30'), { horas: 9, minutos: 30 });
  assert.throws(() => regras.parseHora('25:00'), /HH:mm/);
  assert.throws(() => regras.parseHora('9h'), /HH:mm/);
});

test('formatarDataHoraSql monta data e hora no padrão do MySQL', () => {
  assert.equal(
    regras.formatarDataHoraSql(regras.montarInicio('2026-10-20', '09:00')),
    '2026-10-20 09:00:00'
  );
});

/* ---------- Expediente ---------- */

test('dia de semana tem horários de 08:00 a 17:00', () => {
  const horarios = regras.gerarHorariosDoDia('2026-10-13'); // terça
  assert.equal(horarios.length, 10);
  assert.equal(horarios[0], '08:00');
  assert.equal(horarios.at(-1), '17:00');
});

test('sábado vai até 11:00 e domingo não tem horários', () => {
  assert.deepEqual(regras.gerarHorariosDoDia('2026-10-17'), ['08:00', '09:00', '10:00', '11:00']);
  assert.deepEqual(regras.gerarHorariosDoDia('2026-10-18'), []);
});

/* ---------- Status permitido ---------- */

test('reagendar é permitido para Agendado e Confirmado', () => {
  for (const status of ['Agendado', 'Confirmado']) {
    assert.equal(
      regras.problemaParaReagendar(agendamento('2026-10-20T09:00:00', status), AGORA),
      null
    );
  }
});

test('reagendar é bloqueado para Em atendimento, Concluído e Cancelado', () => {
  for (const status of ['Em atendimento', 'Concluído', 'Cancelado']) {
    const problema = regras.problemaParaReagendar(
      agendamento('2026-10-20T09:00:00', status),
      AGORA
    );
    assert.equal(problema.codigo, 'STATUS_NAO_PERMITIDO', status);
  }
});

/* ---------- Antecedência ---------- */

test('exige 24 horas de antecedência em relação ao horário atual', () => {
  // Exatamente 24h depois: permitido.
  assert.equal(
    regras.problemaParaReagendar(agendamento('2026-10-13T10:00:00'), AGORA),
    null
  );
  // 23h59 depois: bloqueado.
  assert.equal(
    regras.problemaParaReagendar(agendamento('2026-10-13T09:59:00'), AGORA).codigo,
    'ANTECEDENCIA_INSUFICIENTE'
  );
  // Já passou: bloqueado.
  assert.equal(
    regras.problemaParaReagendar(agendamento('2026-10-11T09:00:00'), AGORA).codigo,
    'ANTECEDENCIA_INSUFICIENTE'
  );
});

test('o novo horário precisa de 2 horas de antecedência', () => {
  const muitoCedo = regras.montarInicio('2026-10-12', '11:00'); // 1h depois
  const noLimite = regras.montarInicio('2026-10-12', '12:00'); // 2h depois

  assert.equal(regras.problemaNoNovoInicio(muitoCedo, AGORA).codigo, 'ANTECEDENCIA_INSUFICIENTE');
  assert.equal(regras.problemaNoNovoInicio(noLimite, AGORA), null);
});

/* ---------- Novo horário ---------- */

test('o novo horário respeita expediente, domingo e janela máxima', () => {
  const domingo = regras.montarInicio('2026-10-18', '09:00');
  const depoisDoFechamento = regras.montarInicio('2026-10-13', '18:00');
  const sabadoTarde = regras.montarInicio('2026-10-17', '12:00');
  const longe = regras.montarInicio('2027-02-01', '09:00');
  const minutoQuebrado = regras.montarInicio('2026-10-13', '09:30');

  assert.equal(regras.problemaNoNovoInicio(domingo, AGORA).codigo, 'FORA_DO_EXPEDIENTE');
  assert.equal(regras.problemaNoNovoInicio(depoisDoFechamento, AGORA).codigo, 'FORA_DO_EXPEDIENTE');
  assert.equal(regras.problemaNoNovoInicio(sabadoTarde, AGORA).codigo, 'FORA_DO_EXPEDIENTE');
  assert.equal(regras.problemaNoNovoInicio(minutoQuebrado, AGORA).codigo, 'FORA_DO_EXPEDIENTE');
  assert.equal(regras.problemaNoNovoInicio(longe, AGORA).codigo, 'JANELA_EXCEDIDA');
});

/* ---------- Conflitos ---------- */

test('conflito de profissional no mesmo horário', () => {
  const inicio = regras.montarInicio('2026-10-14', '09:00');
  const conflito = regras.encontrarConflito(
    { inicio, funcionarioId: 2, veiculoId: 10 },
    [ocupado(5, '2026-10-14T09:00:00', 2, 99)]
  );

  assert.equal(conflito.codigo, 'CONFLITO_PROFISSIONAL');
});

test('conflito de veículo no mesmo horário', () => {
  const inicio = regras.montarInicio('2026-10-14', '09:00');
  const conflito = regras.encontrarConflito(
    { inicio, funcionarioId: 2, veiculoId: 10 },
    [ocupado(5, '2026-10-14T09:00:00', 3, 10)]
  );

  assert.equal(conflito.codigo, 'CONFLITO_VEICULO');
});

test('oficina lotada quando atinge a capacidade simultânea', () => {
  const inicio = regras.montarInicio('2026-10-14', '09:00');
  const lotado = [
    ocupado(1, '2026-10-14T09:00:00', 3, 11),
    ocupado(2, '2026-10-14T09:00:00', 4, 12),
    ocupado(3, '2026-10-14T09:00:00', 5, 13)
  ];

  assert.equal(
    regras.encontrarConflito({ inicio, funcionarioId: 2, veiculoId: 10 }, lotado).codigo,
    'OFICINA_LOTADA'
  );
  assert.equal(
    regras.encontrarConflito({ inicio, funcionarioId: 2, veiculoId: 10 }, lotado.slice(0, 2)),
    null
  );
});

test('horários que apenas encostam não são conflito', () => {
  const inicio = regras.montarInicio('2026-10-14', '10:00');
  const conflito = regras.encontrarConflito(
    { inicio, funcionarioId: 2, veiculoId: 10 },
    [ocupado(5, '2026-10-14T09:00:00', 2, 10)] // termina às 10:00
  );

  assert.equal(conflito, null);
});

test('atendimento mais longo ocupa o horário seguinte', () => {
  const inicio = regras.montarInicio('2026-10-14', '10:00');
  const conflito = regras.encontrarConflito(
    { inicio, funcionarioId: 2, veiculoId: 10 },
    [ocupado(5, '2026-10-14T09:00:00', 2, 99, 120)] // 09:00 até 11:00
  );

  assert.equal(conflito.codigo, 'CONFLITO_PROFISSIONAL');
});

test('o próprio agendamento é ignorado ao reagendar', () => {
  const inicio = regras.montarInicio('2026-10-14', '09:00');
  const conflito = regras.encontrarConflito(
    { inicio, funcionarioId: 2, veiculoId: 10, ignorarId: 5 },
    [ocupado(5, '2026-10-14T09:00:00', 2, 10)]
  );

  assert.equal(conflito, null);
});

test('exigirSemConflito lança erro 409 e exigirNovoInicioValido lança 422', () => {
  const inicio = regras.montarInicio('2026-10-14', '09:00');

  assert.throws(
    () =>
      regras.exigirSemConflito({ inicio, funcionarioId: 2, veiculoId: 10 }, [
        ocupado(5, '2026-10-14T09:00:00', 2, 99)
      ]),
    (erro) => erro.statusCode === 409 && erro.codigo === 'CONFLITO_PROFISSIONAL'
  );

  assert.throws(
    () => regras.exigirNovoInicioValido(regras.montarInicio('2026-10-18', '09:00'), AGORA),
    (erro) => erro.statusCode === 422 && erro.codigo === 'FORA_DO_EXPEDIENTE'
  );
});

/* ---------- Horários disponíveis ---------- */

test('listarHorarios marca livres e ocupados com o motivo', () => {
  const resultado = regras.listarHorarios({
    data: '2026-10-14',
    ocupados: [ocupado(5, '2026-10-14T09:00:00', 2, 99)],
    funcionarioId: 2,
    veiculoId: 10,
    agora: AGORA
  });

  assert.equal(resultado.fechado, false);
  assert.equal(resultado.horarios.length, 10);

  const nove = resultado.horarios.find((item) => item.hora === '09:00');
  const dez = resultado.horarios.find((item) => item.hora === '10:00');

  assert.equal(nove.disponivel, false);
  assert.match(nove.motivo, /profissional/);
  assert.equal(dez.disponivel, true);
  assert.equal(dez.motivo, null);
});

test('listarHorarios marca o horário atual do agendamento como indisponível', () => {
  const resultado = regras.listarHorarios({
    data: '2026-10-14',
    ocupados: [ocupado(5, '2026-10-14T09:00:00', 2, 10)],
    funcionarioId: 2,
    veiculoId: 10,
    ignorarId: 5,
    inicioAtual: regras.parseInicioBanco('2026-10-14T09:00:00'),
    agora: AGORA
  });

  const nove = resultado.horarios.find((item) => item.hora === '09:00');
  assert.equal(nove.disponivel, false);
  assert.match(nove.motivo, /horário atual/);
});

test('listarHorarios no domingo informa que a oficina está fechada', () => {
  const resultado = regras.listarHorarios({
    data: '2026-10-18',
    ocupados: [],
    funcionarioId: 2,
    veiculoId: 10,
    agora: AGORA
  });

  assert.equal(resultado.fechado, true);
  assert.deepEqual(resultado.horarios, []);
});

test('listarHorarios bloqueia horários que já passaram ou estão muito próximos', () => {
  const resultado = regras.listarHorarios({
    data: '2026-10-12', // hoje, agora são 10:00
    ocupados: [],
    funcionarioId: 2,
    veiculoId: 10,
    agora: AGORA
  });

  const disponiveis = resultado.horarios.filter((item) => item.disponivel).map((item) => item.hora);
  assert.deepEqual(disponiveis, ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00']);
});
