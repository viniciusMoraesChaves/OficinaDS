const { arredondar } = require('./financeiro');

// Até 31 dias de período mostra um grupo de barras por dia; acima disso (ou sem
// data inicial) mostra um por mês.
const LIMITE_DIAS = 31;
const LIMITE_MESES = 36;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function paraUtc(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function deUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function diasEntre(inicio, fim) {
  const dias = [];
  const ultimo = paraUtc(fim < inicio ? inicio : fim);

  for (let atual = paraUtc(inicio); atual <= ultimo; atual += MS_POR_DIA) {
    dias.push(deUtc(atual));
  }

  return dias;
}

function mesesEntre(inicio, fim) {
  const meses = [];
  let [ano, mes] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = (fim < inicio ? inicio : fim).split('-').map(Number);

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes += 1;

    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return meses;
}

function definirGranularidade({ inicio = '', fim = '' } = {}, hoje) {
  if (!inicio) return 'mes';

  const dias = diasEntre(inicio, fim || hoje).length;
  return dias <= LIMITE_DIAS ? 'dia' : 'mes';
}

// Completa os períodos sem movimentação com zero, para o eixo do gráfico não ter buracos.
function montarSerie(linhas, { granularidade, inicio = '', fim = '', hoje }) {
  const valores = new Map(
    linhas.map((linha) => [
      linha.periodo,
      { entradas: arredondar(linha.entradas), saidas: arredondar(linha.saidas) }
    ])
  );

  let periodos;

  if (granularidade === 'dia') {
    periodos = diasEntre(inicio, fim || hoje);
  } else {
    const primeiro = linhas.length ? linhas[0].periodo : hoje.slice(0, 7);
    const ultimo = linhas.length ? linhas[linhas.length - 1].periodo : '';

    const mesInicial = inicio ? inicio.slice(0, 7) : primeiro;
    // Com data final, o eixo termina nela (os dados nunca passam dela, pois o filtro corta).
    // Sem data final, vai até o mês atual ou até o último mês com dados.
    const mesFinal = fim ? fim.slice(0, 7) : [hoje.slice(0, 7), ultimo].sort().at(-1);

    periodos = mesesEntre(mesInicial, mesFinal).slice(-LIMITE_MESES);
  }

  return periodos.map((periodo) => ({
    periodo,
    entradas: valores.get(periodo)?.entradas ?? 0,
    saidas: valores.get(periodo)?.saidas ?? 0
  }));
}

module.exports = { LIMITE_DIAS, LIMITE_MESES, diasEntre, mesesEntre, definirGranularidade, montarSerie };
