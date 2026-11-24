const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hojeIso,
  parseDataConsulta,
  parseIdFuncionario,
  situacaoDoPeriodo,
  montarPresenca,
  situacaoHoje,
  resumirDia
} = require('../src/utils/presenca');

const AGORA = new Date(2026, 10, 10, 9, 30, 0); // 10/11/2026
const HOJE = '2026-11-10';

test('hojeIso usa a data local, no formato AAAA-MM-DD', () => {
  assert.equal(hojeIso(AGORA), HOJE);
  assert.equal(hojeIso(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('parseDataConsulta usa hoje quando a data não é informada', () => {
  assert.equal(parseDataConsulta({}, AGORA), HOJE);
  assert.equal(parseDataConsulta({ data: '  ' }, AGORA), HOJE);
});

test('parseDataConsulta aceita hoje e datas passadas', () => {
  assert.equal(parseDataConsulta({ data: '2026-11-10' }, AGORA), '2026-11-10');
  assert.equal(parseDataConsulta({ data: '2026-10-01' }, AGORA), '2026-10-01');
});

test('parseDataConsulta recusa data futura, inexistente e mal formatada', () => {
  for (const data of ['2026-11-11', '2026-02-30', '10/11/2026', 'ontem']) {
    assert.throws(() => parseDataConsulta({ data }, AGORA), { statusCode: 400 }, data);
  }
});

test('parseIdFuncionario aceita inteiro positivo e recusa o resto', () => {
  assert.equal(parseIdFuncionario({ idFuncionario: 7 }), 7);
  assert.equal(parseIdFuncionario({ idFuncionario: '7' }), 7);

  for (const ruim of [undefined, null, '', 0, -1, 1.5, 'abc']) {
    assert.throws(() => parseIdFuncionario({ idFuncionario: ruim }), { statusCode: 400 }, String(ruim));
  }

  assert.throws(() => parseIdFuncionario(), { statusCode: 400 });
});

test('situacaoDoPeriodo: presente, saiu e sem saída de dia anterior', () => {
  assert.equal(situacaoDoPeriodo({ saidaEm: null, data: HOJE }, HOJE), 'presente');
  assert.equal(situacaoDoPeriodo({ saidaEm: '2026-11-10T17:00:00', data: HOJE }, HOJE), 'saiu');
  assert.equal(situacaoDoPeriodo({ saidaEm: null, data: '2026-11-09' }, HOJE), 'sem_saida');
  assert.equal(situacaoDoPeriodo({ saidaEm: '2026-11-09T17:00:00', data: '2026-11-09' }, HOJE), 'saiu');
});

test('montarPresenca não inventa duração para período sem saída de dia anterior', () => {
  const base = { id: 1, idFuncionario: 2, nome: 'Ana', cargo: 'Mecânica', entradaEm: 'x', minutos: 3000 };

  assert.equal(montarPresenca({ ...base, data: '2026-11-09', saidaEm: null }, HOJE).minutos, null);
  assert.equal(montarPresenca({ ...base, data: HOJE, saidaEm: null, minutos: '95' }, HOJE).minutos, 95);
  assert.equal(montarPresenca({ ...base, data: HOJE, saidaEm: null }, HOJE).situacao, 'presente');
});

test('situacaoHoje: presente, já saiu ou ainda não chegou', () => {
  assert.equal(situacaoHoje({ presenteDesde: new Date(), registrosHoje: 1 }), 'presente');
  assert.equal(situacaoHoje({ presenteDesde: null, registrosHoje: 2 }), 'saiu');
  assert.equal(situacaoHoje({ presenteDesde: null, registrosHoje: 0 }), 'ausente');
  assert.equal(situacaoHoje({ presenteDesde: null, registrosHoje: '0' }), 'ausente');
});

test('resumirDia conta funcionários distintos, registros e períodos sem saída', () => {
  const resumo = resumirDia([
    { idFuncionario: 1, situacao: 'saiu' },
    { idFuncionario: 1, situacao: 'presente' },
    { idFuncionario: 2, situacao: 'sem_saida' }
  ]);

  assert.deepEqual(resumo, { compareceram: 2, registros: 3, semSaida: 1 });
  assert.deepEqual(resumirDia([]), { compareceram: 0, registros: 0, semSaida: 0 });
});
