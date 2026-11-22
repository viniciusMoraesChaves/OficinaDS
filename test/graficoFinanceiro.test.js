const test = require('node:test');
const assert = require('node:assert/strict');
const {
  diasEntre,
  mesesEntre,
  definirGranularidade,
  montarSerie
} = require('../src/utils/graficoFinanceiro');

const HOJE = '2026-11-10';

test('diasEntre inclui o primeiro e o último dia, mesmo na virada de mês e ano', () => {
  assert.deepEqual(diasEntre('2026-02-27', '2026-03-02'), [
    '2026-02-27',
    '2026-02-28',
    '2026-03-01',
    '2026-03-02'
  ]);
  assert.deepEqual(diasEntre('2026-12-31', '2027-01-01'), ['2026-12-31', '2027-01-01']);
  assert.deepEqual(diasEntre('2026-11-05', '2026-11-05'), ['2026-11-05']);
});

test('diasEntre com fim antes do início devolve só o dia inicial', () => {
  assert.deepEqual(diasEntre('2026-11-05', '2026-11-01'), ['2026-11-05']);
});

test('mesesEntre atravessa o ano', () => {
  assert.deepEqual(mesesEntre('2026-11', '2027-02'), ['2026-11', '2026-12', '2027-01', '2027-02']);
});

test('sem data inicial o gráfico é por mês', () => {
  assert.equal(definirGranularidade({ inicio: '', fim: '' }, HOJE), 'mes');
});

test('"este mês" e "últimos 30 dias" são por dia; períodos longos são por mês', () => {
  assert.equal(definirGranularidade({ inicio: '2026-11-01', fim: '' }, HOJE), 'dia');
  assert.equal(definirGranularidade({ inicio: '2026-10-11', fim: '' }, HOJE), 'dia');
  assert.equal(definirGranularidade({ inicio: '2026-10-01', fim: '2026-10-31' }, HOJE), 'dia');
  assert.equal(definirGranularidade({ inicio: '2026-10-01', fim: '2026-11-10' }, HOJE), 'mes');
  assert.equal(definirGranularidade({ inicio: '2026-01-01', fim: '' }, HOJE), 'mes');
});

test('montarSerie por dia completa os dias sem movimento com zero', () => {
  const serie = montarSerie(
    [
      { periodo: '2026-11-02', entradas: 480.5, saidas: 0 },
      { periodo: '2026-11-04', entradas: 0, saidas: 390 }
    ],
    { granularidade: 'dia', inicio: '2026-11-01', fim: '2026-11-05', hoje: HOJE }
  );

  assert.deepEqual(
    serie.map((p) => p.periodo),
    ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']
  );
  assert.deepEqual(serie[1], { periodo: '2026-11-02', entradas: 480.5, saidas: 0 });
  assert.deepEqual(serie[2], { periodo: '2026-11-03', entradas: 0, saidas: 0 });
  assert.deepEqual(serie[3], { periodo: '2026-11-04', entradas: 0, saidas: 390 });
});

test('montarSerie por dia, sem data final, vai até hoje', () => {
  const serie = montarSerie([], { granularidade: 'dia', inicio: '2026-11-08', fim: '', hoje: HOJE });

  assert.deepEqual(
    serie.map((p) => p.periodo),
    ['2026-11-08', '2026-11-09', '2026-11-10']
  );
});

test('montarSerie por mês, sem período, vai do primeiro mês com dados até o mês atual', () => {
  const serie = montarSerie(
    [
      { periodo: '2026-08', entradas: 1000, saidas: 400 },
      { periodo: '2026-10', entradas: 200, saidas: 900 }
    ],
    { granularidade: 'mes', inicio: '', fim: '', hoje: HOJE }
  );

  assert.deepEqual(
    serie.map((p) => p.periodo),
    ['2026-08', '2026-09', '2026-10', '2026-11']
  );
  assert.deepEqual(serie[1], { periodo: '2026-09', entradas: 0, saidas: 0 });
  assert.equal(serie[2].saidas, 900);
});

test('montarSerie por mês sem nenhum dado mostra só o mês atual', () => {
  const serie = montarSerie([], { granularidade: 'mes', inicio: '', fim: '', hoje: HOJE });

  assert.deepEqual(serie, [{ periodo: '2026-11', entradas: 0, saidas: 0 }]);
});

test('montarSerie por mês respeita o período informado', () => {
  const serie = montarSerie([], {
    granularidade: 'mes',
    inicio: '2026-01-15',
    fim: '2026-03-20',
    hoje: HOJE
  });

  assert.deepEqual(
    serie.map((p) => p.periodo),
    ['2026-01', '2026-02', '2026-03']
  );
});

test('montarSerie limita a 36 meses, mantendo os mais recentes', () => {
  const serie = montarSerie([], {
    granularidade: 'mes',
    inicio: '2020-01-01',
    fim: '',
    hoje: HOJE
  });

  assert.equal(serie.length, 36);
  assert.equal(serie.at(-1).periodo, '2026-11');
});

test('montarSerie arredonda os valores em centavos', () => {
  const [ponto] = montarSerie([{ periodo: '2026-11-02', entradas: 0.1 + 0.2, saidas: 10 }], {
    granularidade: 'dia',
    inicio: '2026-11-02',
    fim: '2026-11-02',
    hoje: HOJE
  });

  assert.equal(ponto.entradas, 0.3);
});
