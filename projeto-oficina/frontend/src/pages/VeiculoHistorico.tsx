import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import AtendimentoItem, { EstilosAtendimentoItem } from '../components/AtendimentoItem';
import { Icon } from '../components/Icon';
import { EstilosStatusAtendimento } from '../components/StatusAtendimento';
import { getHistoricoVeiculo } from '../services/historicoService';
import type { AtendimentoHistorico, HistoricoVeiculoResposta } from '../types/historico';
import {
  brl,
  chaveMes,
  dataRelativa,
  normalizar,
  paraISODataLocal,
  rotuloMes,
  totalAtendimento,
} from '../utils/historicoFormat';

type Atalho = 'tudo' | '30d' | '6m' | '12m' | 'custom';

const ATALHOS: { id: Exclude<Atalho, 'custom'>; rotulo: string }[] = [
  { id: 'tudo', rotulo: 'Tudo' },
  { id: '30d', rotulo: '30 dias' },
  { id: '6m', rotulo: '6 meses' },
  { id: '12m', rotulo: '12 meses' },
];

function inicioDoAtalho(atalho: Atalho): string {
  const d = new Date();
  if (atalho === '30d') d.setDate(d.getDate() - 30);
  else if (atalho === '6m') d.setMonth(d.getMonth() - 6);
  else if (atalho === '12m') d.setFullYear(d.getFullYear() - 1);
  else return '';
  return paraISODataLocal(d);
}

const ESTILOS = `
/* Histórico do veículo — mesmo visual do OficinaDS (laranja, bege, cards brancos). */
.hv-page {
  --hv-accent: #f59e0b;
  --hv-accent-strong: #d97706;
  --hv-accent-soft: #fef3dc;
  --hv-bg: #f3f1ee;
  --hv-card: #ffffff;
  --hv-line: #e8e5e0;
  --hv-head: #ecebe7;
  --hv-text: #1a1a1a;
  --hv-muted: #78736b;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--hv-text);
  font-family: inherit;
}
.hv-page *, .hv-page *::before, .hv-page *::after { box-sizing: border-box; }
.hv-muted { color: var(--hv-muted); }
.hv-sep { margin: 0 6px; color: #b9b4ab; }

/* ações (o título fica no topo do Layout) */
.hv-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

.hv-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px; border-radius: 8px;
  font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  border: 1px solid transparent; transition: background .15s, border-color .15s, transform .05s;
}
.hv-btn:active { transform: translateY(1px); }
.hv-btn:focus-visible, .hv-chip:focus-visible, .hv-link:focus-visible { outline: 2px solid var(--hv-accent); outline-offset: 2px; }
.hv-btn--primary { background: var(--hv-accent); color: #1a1205; }
.hv-btn--primary:hover { background: #fbab1c; }
.hv-btn--ghost { background: var(--hv-card); border-color: var(--hv-line); color: var(--hv-text); }
.hv-btn--ghost:hover { background: #faf9f7; }

/* veículo */
.hv-vehicle {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: var(--hv-card); border: 1px solid var(--hv-line); border-radius: 12px; padding: 18px 20px;
}
.hv-vehicle__icon {
  display: grid; place-items: center; width: 52px; height: 52px; flex: none;
  border-radius: 12px; background: var(--hv-accent-soft); color: var(--hv-accent-strong);
}
.hv-vehicle__info { flex: 1; min-width: 200px; }
.hv-vehicle__top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hv-vehicle__top h2 { margin: 0; font-size: 18px; font-weight: 700; }
.hv-vehicle__info p { margin: 4px 0 0; font-size: 13px; color: var(--hv-muted); }
.hv-plate {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 600; letter-spacing: .08em;
  background: var(--hv-head); border: 1px solid #dedbd5; border-radius: 6px; padding: 3px 9px;
}
.hv-vehicle__owner { display: flex; flex-direction: column; gap: 4px; padding-left: 18px; border-left: 1px solid var(--hv-line); }
.hv-vehicle__label { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--hv-muted); }
.hv-vehicle__client { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }

/* estatísticas */
.hv-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.hv-stat {
  display: flex; align-items: center; gap: 12px;
  background: var(--hv-card); border: 1px solid var(--hv-line); border-radius: 12px; padding: 14px 16px;
}
.hv-stat__icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--hv-head); color: #5b564e; flex: none; }
.hv-stat__label { display: block; font-size: 12px; color: var(--hv-muted); }
.hv-stat strong { display: block; margin-top: 2px; font-size: 18px; font-weight: 700; }

/* filtros */
.hv-toolbar {
  display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap;
  background: var(--hv-card); border: 1px solid var(--hv-line); border-radius: 12px; padding: 14px 16px;
}
.hv-search {
  display: flex; align-items: center; gap: 8px; flex: 1 1 260px; min-width: 220px; height: 38px;
  padding: 0 12px; border: 1px solid var(--hv-line); border-radius: 8px; background: #fbfaf8; color: var(--hv-muted);
}
.hv-search:focus-within { border-color: var(--hv-accent); background: #fff; }
.hv-search input { flex: 1; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: var(--hv-text); min-width: 0; }
.hv-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.hv-chip {
  height: 34px; padding: 0 14px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 13px; font-weight: 500; color: #4a463f;
  background: #fbfaf8; border: 1px solid var(--hv-line); transition: all .15s;
}
.hv-chip:hover { border-color: #d4cfc6; }
.hv-chip.is-active { background: var(--hv-accent-soft); border-color: var(--hv-accent); color: #8a4b04; font-weight: 600; }
.hv-dates { display: flex; gap: 10px; }
.hv-dates label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--hv-muted); }
.hv-dates input {
  height: 34px; padding: 0 10px; border: 1px solid var(--hv-line); border-radius: 8px;
  font: inherit; font-size: 13px; color: var(--hv-text); background: #fbfaf8; text-transform: none; letter-spacing: 0;
}
.hv-dates input:focus { outline: 0; border-color: var(--hv-accent); background: #fff; }
.hv-toolbar__error { flex-basis: 100%; margin: 0; font-size: 13px; color: #b91c1c; }

/* lista / linha do tempo */
.hv-list__bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 13px; color: var(--hv-muted); }
.hv-list__bar strong { color: var(--hv-text); }
.hv-link { background: none; border: 0; padding: 4px 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--hv-accent-strong); cursor: pointer; }
.hv-link:hover { text-decoration: underline; }
.hv-group { margin-top: 18px; }
.hv-group__title { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--hv-muted); }
.hv-timeline { position: relative; list-style: none; margin: 0; padding: 0 0 0 28px; display: flex; flex-direction: column; gap: 12px; }
.hv-timeline::before { content: ''; position: absolute; left: 9px; top: 10px; bottom: 10px; width: 2px; background: var(--hv-line); }

/* estados */
.hv-state {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;
  background: var(--hv-card); border: 1px dashed #d9d4ca; border-radius: 12px; padding: 44px 20px;
}
.hv-state h3 { margin: 6px 0 0; font-size: 16px; }
.hv-state p { margin: 0 0 10px; max-width: 420px; font-size: 14px; color: var(--hv-muted); }
.hv-state__icon { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: var(--hv-head); color: #6b665d; }
.hv-state--error { border-color: #f3c0c0; }
.hv-state--error .hv-state__icon { background: #fee2e2; color: #b91c1c; }

.hv-skeletons { display: flex; flex-direction: column; gap: 12px; }
.hv-skeleton {
  height: 84px; border-radius: 12px; border: 1px solid var(--hv-line);
  background: linear-gradient(90deg, #f0eee9 25%, #f8f7f4 37%, #f0eee9 63%); background-size: 400% 100%;
  animation: hv-shimmer 1.4s ease infinite;
}
@keyframes hv-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) { .hv-skeleton { animation: none; } }

/* responsivo */
@media (max-width: 1000px) {
  .hv-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 680px) {
  .hv-vehicle__owner { padding-left: 0; border-left: 0; }
  .hv-timeline { padding-left: 20px; }
  .hv-timeline::before { left: 2px; }
}

/* impressão */
@media print {
  .hv-actions, .hv-toolbar, .hv-list__bar { display: none !important; }
  .sidebar, .topbar, .sidebar-backdrop { display: none !important; }
}
`;

interface Grupo {
  rotulo: string;
  itens: AtendimentoHistorico[];
}

export default function VeiculoHistorico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idVeiculo = Number(id);

  const [dados, setDados] = useState<HistoricoVeiculoResposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [atalho, setAtalho] = useState<Atalho>('tudo');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState<Set<number>>(new Set());

  const periodoInvalido = inicio !== '' && fim !== '' && inicio > fim;

  useEffect(() => {
    if (!Number.isInteger(idVeiculo) || idVeiculo <= 0) {
      setErro('Veículo inválido.');
      setCarregando(false);
      return undefined;
    }
    if (periodoInvalido) return undefined;

    const controller = new AbortController();
    setCarregando(true);
    setErro(null);

    getHistoricoVeiculo(idVeiculo, { inicio: inicio || undefined, fim: fim || undefined }, controller.signal)
      .then((resposta: any) => {
        // Trata a resposta caso o backend devolva envelopado em { dados: ... }
        const payload: HistoricoVeiculoResposta = resposta?.dados ?? resposta;
        setDados(payload);

        // Garante que 'atendimentos' seja um array antes de chamar .slice()
        const listaAtendimentos = payload?.atendimentos ?? [];
        setAbertos(new Set(listaAtendimentos.slice(0, 1).map((a: AtendimentoHistorico) => a.idAtendimento)));
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [idVeiculo, inicio, fim, periodoInvalido, tentativa]);

  const resumo = useMemo(() => {
    const lista = dados?.atendimentos ?? [];
    return {
      total: lista.length,
      gasto: lista.reduce((soma: number, a: AtendimentoHistorico) => soma + totalAtendimento(a), 0),
      ultimo: lista[0]?.data ?? null,
      emAberto: lista.filter((a: AtendimentoHistorico) => a.status !== 'Concluído' && a.status !== 'Cancelado').length,
    };
  }, [dados]);

  const visiveis = useMemo(() => {
    const lista = dados?.atendimentos ?? [];
    const termo = normalizar(busca.trim());
    if (!termo) return lista;
    return lista.filter((a) =>
      normalizar(
        [
          a.problema ?? '',
          a.diagnostico ?? '',
          a.mecanico ?? '',
          a.status ?? '',
          ...(a.servicos ?? []).map((s) => s.descricao ?? ''),
          ...(a.pecas ?? []).map((p) => p.nome ?? ''),
        ].join(' '),
      ).includes(termo),
    );
  }, [dados, busca]);

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const a of visiveis) {
      const chave = chaveMes(a.data);
      const grupo = mapa.get(chave);
      if (grupo) grupo.itens.push(a);
      else mapa.set(chave, { rotulo: rotuloMes(a.data), itens: [a] });
    }
    return Array.from(mapa.values());
  }, [visiveis]);

  function alternar(idAtendimento: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(idAtendimento)) novo.delete(idAtendimento);
      else novo.add(idAtendimento);
      return novo;
    });
  }

  const todosAbertos = visiveis.length > 0 && visiveis.every((a) => abertos.has(a.idAtendimento));

  function alternarTodos() {
    setAbertos(todosAbertos ? new Set() : new Set(visiveis.map((a) => a.idAtendimento)));
  }

  function escolherAtalho(novo: Exclude<Atalho, 'custom'>) {
    setAtalho(novo);
    setInicio(inicioDoAtalho(novo));
    setFim('');
  }

  const veiculo = dados?.veiculo;
  const listaAtendimentosTotal = dados?.atendimentos ?? [];
  const semHistorico = !carregando && !erro && listaAtendimentosTotal.length === 0;
  const semResultadoBusca = !carregando && !erro && !semHistorico && visiveis.length === 0;

  const subtitulo = veiculo
    ? `${veiculo.marca} ${veiculo.modelo} · ${veiculo.placa}`
    : 'Atendimentos, diagnósticos, serviços e peças do veículo.';

  return (
    <Layout
      title="Histórico do veículo"
      subtitle={subtitulo}
      documentTitle="Histórico do veículo | OficinaDS"
    >
      <div className="hv-page">
        <style>{ESTILOS}</style>
        <EstilosAtendimentoItem />
        <EstilosStatusAtendimento />

        <div className="hv-actions">
          <button type="button" className="hv-btn hv-btn--ghost" onClick={() => window.print()}>
            <Icon name="printer" /> Imprimir
          </button>
          <button type="button" className="hv-btn hv-btn--primary" onClick={() => navigate('/veiculos')}>
            <Icon name="arrowLeft" /> Voltar
          </button>
        </div>

        {veiculo && (
          <section className="hv-vehicle" aria-label="Dados do veículo">
            <span className="hv-vehicle__icon"><Icon name="car" size={26} /></span>
            <div className="hv-vehicle__info">
              <div className="hv-vehicle__top">
                <span className="hv-plate">{veiculo.placa}</span>
                <h2>{veiculo.marca} {veiculo.modelo}</h2>
              </div>
              <p>
                Ano {veiculo.ano}
                {veiculo.cor ? <><span className="hv-sep">·</span>{veiculo.cor}</> : null}
              </p>
            </div>
            <div className="hv-vehicle__owner">
              <span className="hv-vehicle__label">Cliente</span>
              <span className="hv-vehicle__client"><Icon name="user" size={16} /> {veiculo.cliente}</span>
            </div>
          </section>
        )}

        {dados && (
          <section className="hv-stats" aria-label="Resumo do histórico">
            <div className="hv-stat">
              <span className="hv-stat__icon"><Icon name="clipboard" size={18} /></span>
              <div><span className="hv-stat__label">Atendimentos</span><strong>{resumo.total}</strong></div>
            </div>
            <div className="hv-stat">
              <span className="hv-stat__icon"><Icon name="calendar" size={18} /></span>
              <div>
                <span className="hv-stat__label">Último atendimento</span>
                <strong>{resumo.ultimo ? dataRelativa(resumo.ultimo) : '—'}</strong>
              </div>
            </div>
            <div className="hv-stat">
              <span className="hv-stat__icon"><Icon name="wrench" size={18} /></span>
              <div><span className="hv-stat__label">Em andamento</span><strong>{resumo.emAberto}</strong></div>
            </div>
            <div className="hv-stat">
              <span className="hv-stat__icon"><Icon name="wallet" size={18} /></span>
              <div><span className="hv-stat__label">Total no período</span><strong>{brl(resumo.gasto)}</strong></div>
            </div>
          </section>
        )}

        {(dados || carregando) && !(erro && !dados) && (
          <section className="hv-toolbar" aria-label="Filtros">
            <label className="hv-search">
              <Icon name="search" size={16} />
              <input
                type="search"
                placeholder="Buscar por problema, serviço, peça ou mecânico..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </label>

            <div className="hv-chips" role="group" aria-label="Período">
              {ATALHOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`hv-chip${atalho === a.id ? ' is-active' : ''}`}
                  aria-pressed={atalho === a.id}
                  onClick={() => escolherAtalho(a.id)}
                >
                  {a.rotulo}
                </button>
              ))}
            </div>

            <div className="hv-dates">
              <label>
                <span>De</span>
                <input
                  type="date"
                  value={inicio}
                  max={fim || undefined}
                  onChange={(e) => { setInicio(e.target.value); setAtalho('custom'); }}
                />
              </label>
              <label>
                <span>Até</span>
                <input
                  type="date"
                  value={fim}
                  min={inicio || undefined}
                  onChange={(e) => { setFim(e.target.value); setAtalho('custom'); }}
                />
              </label>
            </div>

            {periodoInvalido && (
              <p className="hv-toolbar__error" role="alert">
                A data inicial deve ser menor ou igual à data final.
              </p>
            )}
          </section>
        )}

        {erro && (
          <div className="hv-state hv-state--error" role="alert">
            <span className="hv-state__icon"><Icon name="alert" size={26} /></span>
            <h3>Não foi possível carregar o histórico</h3>
            <p>{erro}</p>
            <button type="button" className="hv-btn hv-btn--primary" onClick={() => setTentativa((t) => t + 1)}>
              <Icon name="refresh" /> Tentar novamente
            </button>
          </div>
        )}

        {carregando && !erro && (
          <div className="hv-skeletons" aria-busy="true" aria-label="Carregando histórico">
            {[0, 1, 2].map((n) => <div key={n} className="hv-skeleton" />)}
          </div>
        )}

        {semHistorico && (
          <div className="hv-state">
            <span className="hv-state__icon"><Icon name="clipboard" size={26} /></span>
            <h3>Nenhum atendimento encontrado</h3>
            <p>
              {inicio || fim
                ? 'Não há atendimentos neste período. Tente ampliar as datas.'
                : 'Este veículo ainda não possui atendimentos registrados.'}
            </p>
          </div>
        )}

        {semResultadoBusca && (
          <div className="hv-state">
            <span className="hv-state__icon"><Icon name="search" size={26} /></span>
            <h3>Nada encontrado para “{busca}”</h3>
            <p>Revise o termo da busca ou limpe o campo para ver todos os atendimentos.</p>
          </div>
        )}

        {!carregando && !erro && visiveis.length > 0 && (
          <section className="hv-list" aria-label="Linha do tempo de atendimentos">
            <div className="hv-list__bar">
              <span>
                Mostrando <strong>{visiveis.length}</strong> de <strong>{resumo.total}</strong> atendimentos
              </span>
              <button type="button" className="hv-link" onClick={alternarTodos}>
                {todosAbertos ? 'Recolher todos' : 'Expandir todos'}
              </button>
            </div>

            {grupos.map((grupo) => (
              <div key={grupo.rotulo} className="hv-group">
                <h3 className="hv-group__title">{grupo.rotulo}</h3>
                <ol className="hv-timeline">
                  {grupo.itens.map((a) => (
                    <AtendimentoItem
                      key={a.idAtendimento}
                      atendimento={a}
                      aberto={abertos.has(a.idAtendimento)}
                      onAlternar={alternar}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}
      </div>
    </Layout>
  );
}