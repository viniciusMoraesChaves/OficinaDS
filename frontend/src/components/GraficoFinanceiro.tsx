import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { FiltroTipo } from '../types/financeiro';
import '../styles/grafico-financeiro.css';

type Granularidade = 'dia' | 'mes';

type PontoGrafico = {
  periodo: string; // AAAA-MM-DD (por dia) ou AAAA-MM (por mês)
  entradas: number;
  saidas: number;
};

type GraficoResponse = {
  dados: { granularidade: Granularidade; serie: PontoGrafico[] };
};

type FiltrosGrafico = {
  inicio: string;
  fim: string;
  tipo: FiltroTipo;
  categoria: string;
  busca: string;
};

type Props = {
  filtros: FiltrosGrafico;
  // muda quando há lançamento novo, para o gráfico buscar os dados de novo
  versao?: number;
};

const LARGURA = 720;
const ALTURA = 300;
const MARGEM = { topo: 16, direita: 16, base: 44, esquerda: 72 };

const COR_ENTRADA = '#2e8b57';
const COR_SAIDA = '#c0504d';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Escolhe um topo "redondo" para o eixo vertical e as marcas entre 0 e o topo.
function escala(maximo: number) {
  const passoBruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(passoBruto));
  const fracao = passoBruto / potencia;
  const passo = (fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 5 ? 5 : 10) * potencia;
  const topo = Math.ceil(maximo / passo) * passo;
  const marcas: number[] = [];

  for (let i = 0; i * passo <= topo + passo / 1000; i += 1) {
    marcas.push(Math.round(i * passo * 100) / 100);
  }

  return { topo, marcas };
}

function moedaCurta(valor: number) {
  return `R$ ${valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}`;
}

function rotuloEixo(periodo: string, granularidade: Granularidade) {
  if (granularidade === 'dia') return periodo.slice(8, 10);
  return `${MESES[Number(periodo.slice(5, 7)) - 1]}/${periodo.slice(2, 4)}`;
}

function rotuloCompleto(periodo: string, granularidade: Granularidade) {
  if (granularidade === 'dia') {
    return `${periodo.slice(8, 10)}/${periodo.slice(5, 7)}/${periodo.slice(0, 4)}`;
  }
  return `${MESES[Number(periodo.slice(5, 7)) - 1]} de ${periodo.slice(0, 4)}`;
}

export default function GraficoFinanceiro({ filtros, versao = 0 }: Props) {
  const { inicio, fim, tipo, categoria, busca } = filtros;

  const [granularidade, setGranularidade] = useState<Granularidade>('dia');
  const [serie, setSerie] = useState<PontoGrafico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    const params = new URLSearchParams({ inicio, fim, tipo, categoria, busca });

    apiFetch<GraficoResponse>(`/api/financeiro/movimentacoes/grafico?${params}`)
      .then((resposta) => {
        if (!ativo) return;
        setGranularidade(resposta.dados.granularidade);
        setSerie(resposta.dados.serie);
        setErro('');
      })
      .catch((err) => {
        if (!ativo) return;
        setSerie([]);
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar o gráfico.');
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [inicio, fim, tipo, categoria, busca, versao]);

  const maximo = Math.max(0, ...serie.flatMap((ponto) => [ponto.entradas, ponto.saidas]));
  const vazio = maximo === 0;
  const { topo, marcas } = escala(vazio ? 1 : maximo);

  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const larguraGrupo = serie.length > 0 ? larguraUtil / serie.length : larguraUtil;
  const larguraBarra = Math.max(3, Math.min(22, larguraGrupo * 0.36));
  const passoRotulos = Math.ceil(serie.length / 12);

  const y = (valor: number) => MARGEM.topo + alturaUtil - (valor / topo) * alturaUtil;

  const totalEntradas = serie.reduce((soma, ponto) => soma + ponto.entradas, 0);
  const totalSaidas = serie.reduce((soma, ponto) => soma + ponto.saidas, 0);

  const titulo = granularidade === 'dia' ? 'Entradas e saídas por dia' : 'Entradas e saídas por mês';

  return (
    <section className="panel grafico-financeiro" aria-labelledby="grafico-financeiro-title">
      <header className="panel__header">
        <div>
          <h3 id="grafico-financeiro-title">{titulo}</h3>
          <p className="search-summary">Acompanha os filtros escolhidos acima.</p>
        </div>

        <ul className="grafico-financeiro__legenda" aria-label="Legenda">
          <li>
            <span className="grafico-financeiro__cor" style={{ background: COR_ENTRADA }} />
            Entradas
          </li>
          <li>
            <span className="grafico-financeiro__cor" style={{ background: COR_SAIDA }} />
            Saídas
          </li>
        </ul>
      </header>

      <div className="grafico-financeiro__corpo">
        {loading && <p className="grafico-financeiro__aviso">Carregando gráfico...</p>}
        {erro && <p className="grafico-financeiro__aviso grafico-financeiro__aviso--erro">{erro}</p>}

        {!loading && !erro && vazio && (
          <p className="grafico-financeiro__aviso">Sem movimentações neste período para montar o gráfico.</p>
        )}

        {!loading && !erro && !vazio && (
          <>
            <svg
              className="grafico-financeiro__svg"
              viewBox={`0 0 ${LARGURA} ${ALTURA}`}
              role="img"
              aria-label={`${titulo}. Total de entradas ${formatCurrency(totalEntradas)} e de saídas ${formatCurrency(totalSaidas)}.`}
            >
              {marcas.map((marca) => (
                <g key={marca}>
                  <line
                    x1={MARGEM.esquerda}
                    x2={LARGURA - MARGEM.direita}
                    y1={y(marca)}
                    y2={y(marca)}
                    className="grafico-financeiro__grade"
                  />
                  <text
                    x={MARGEM.esquerda - 8}
                    y={y(marca) + 4}
                    textAnchor="end"
                    className="grafico-financeiro__texto"
                  >
                    {moedaCurta(marca)}
                  </text>
                </g>
              ))}

              {serie.map((ponto, indice) => {
                const centro = MARGEM.esquerda + larguraGrupo * indice + larguraGrupo / 2;
                const alturaEntrada = (ponto.entradas / topo) * alturaUtil;
                const alturaSaida = (ponto.saidas / topo) * alturaUtil;

                return (
                  <g key={ponto.periodo}>
                    <title>
                      {`${rotuloCompleto(ponto.periodo, granularidade)}: entradas ${formatCurrency(ponto.entradas)}, saídas ${formatCurrency(ponto.saidas)}`}
                    </title>

                    <rect
                      x={MARGEM.esquerda + larguraGrupo * indice}
                      y={MARGEM.topo}
                      width={larguraGrupo}
                      height={alturaUtil}
                      className="grafico-financeiro__area"
                    />

                    {ponto.entradas > 0 && (
                      <rect
                        x={centro - larguraBarra - 1}
                        y={y(ponto.entradas)}
                        width={larguraBarra}
                        height={alturaEntrada}
                        rx={2}
                        fill={COR_ENTRADA}
                      />
                    )}

                    {ponto.saidas > 0 && (
                      <rect
                        x={centro + 1}
                        y={y(ponto.saidas)}
                        width={larguraBarra}
                        height={alturaSaida}
                        rx={2}
                        fill={COR_SAIDA}
                      />
                    )}

                    {indice % passoRotulos === 0 && (
                      <text
                        x={centro}
                        y={ALTURA - MARGEM.base + 18}
                        textAnchor="middle"
                        className="grafico-financeiro__texto"
                      >
                        {rotuloEixo(ponto.periodo, granularidade)}
                      </text>
                    )}
                  </g>
                );
              })}

              <line
                x1={MARGEM.esquerda}
                x2={LARGURA - MARGEM.direita}
                y1={y(0)}
                y2={y(0)}
                className="grafico-financeiro__base"
              />
            </svg>

            <details className="grafico-financeiro__dados">
              <summary>Ver os valores do gráfico</summary>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{granularidade === 'dia' ? 'Dia' : 'Mês'}</th>
                      <th scope="col">Entradas</th>
                      <th scope="col">Saídas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serie
                      .filter((ponto) => ponto.entradas > 0 || ponto.saidas > 0)
                      .map((ponto) => (
                        <tr key={ponto.periodo}>
                          <td className="nowrap">{rotuloCompleto(ponto.periodo, granularidade)}</td>
                          <td className="nowrap valor--entrada">{formatCurrency(ponto.entradas)}</td>
                          <td className="nowrap valor--saida">{formatCurrency(ponto.saidas)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  );
}
