import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Layout } from '../components/Layout';
import { listarVeiculos } from '../services/veiculoService';
import type { VeiculoLista } from '../types/veiculo';
import { dataRelativa } from '../utils/historicoFormat';

const ESTILOS = `
.vl-page {
  --vl-accent: #f59e0b; --vl-accent-soft: #fef3dc; --vl-card: #fff; --vl-line: #e8e5e0;
  --vl-head: #ecebe7; --vl-text: #1a1a1a; --vl-muted: #78736b;
  display: flex; flex-direction: column; gap: 18px; color: var(--vl-text); font-family: inherit;
}
.vl-page *, .vl-page *::before, .vl-page *::after { box-sizing: border-box; }
.vl-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.vl-search {
  display: flex; align-items: center; gap: 8px; flex: 1 1 280px; max-width: 420px; height: 38px;
  padding: 0 12px; border: 1px solid var(--vl-line); border-radius: 8px; background: var(--vl-card); color: var(--vl-muted);
}
.vl-search:focus-within { border-color: var(--vl-accent); }
.vl-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: var(--vl-text); }
.vl-count { font-size: 13px; color: var(--vl-muted); }

.vl-card { background: var(--vl-card); border: 1px solid var(--vl-line); border-radius: 12px; overflow: hidden; }
.vl-scroll { overflow-x: auto; }
.vl-table { width: 100%; border-collapse: collapse; min-width: 720px; }
.vl-table th {
  text-align: left; padding: 14px 18px; background: var(--vl-head);
  font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--vl-muted);
}
.vl-table td { padding: 14px 18px; border-top: 1px solid var(--vl-line); font-size: 14px; vertical-align: middle; }
.vl-table tbody tr:hover { background: #fcfbf9; }
.vl-right { text-align: right !important; }
.vl-plate {
  display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 600; letter-spacing: .08em;
  background: var(--vl-head); border: 1px solid #dedbd5; border-radius: 6px; padding: 3px 9px;
}
.vl-name { font-weight: 600; }
.vl-sub { display: block; margin-top: 2px; font-size: 12px; color: var(--vl-muted); }
.vl-inline { display: inline-flex; align-items: center; gap: 8px; }
.vl-muted { color: var(--vl-muted); }
.vl-link {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--vl-line); background: var(--vl-card); color: var(--vl-text);
  font-size: 13px; font-weight: 600; text-decoration: none; transition: background .15s, border-color .15s;
}
.vl-link:hover { background: var(--vl-accent-soft); border-color: var(--vl-accent); }
.vl-link:focus-visible { outline: 2px solid var(--vl-accent); outline-offset: 2px; }

.vl-state { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 48px 20px; color: var(--vl-muted); }
.vl-state h3 { margin: 6px 0 0; font-size: 16px; color: var(--vl-text); }
.vl-state p { margin: 0 0 10px; font-size: 14px; max-width: 440px; }
.vl-retry {
  display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px; border: 0; border-radius: 8px;
  background: var(--vl-accent); color: #1a1205; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
}
.vl-skeleton { height: 54px; margin: 10px 18px; border-radius: 8px; background: linear-gradient(90deg, #f0eee9 25%, #f8f7f4 37%, #f0eee9 63%); background-size: 400% 100%; animation: vl-shimmer 1.4s ease infinite; }
@keyframes vl-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) { .vl-skeleton { animation: none; } }
`;

export default function Veiculos() {
  const [veiculos, setVeiculos] = useState<VeiculoLista[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);

    // pequena espera ao digitar, para não consultar a API a cada letra
    const timer = window.setTimeout(
      () => {
        listarVeiculos(busca.trim(), controller.signal)
          .then(setVeiculos)
          .catch((e: unknown) => {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            setErro(e instanceof Error ? e.message : 'Não foi possível carregar os veículos.');
          })
          .finally(() => {
            if (!controller.signal.aborted) setCarregando(false);
          });
      },
      busca ? 300 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [busca, tentativa]);

  return (
    <Layout
      title="Veículos"
      subtitle="Cadastro e histórico de veículos atendidos."
      documentTitle="Veículos | OficinaDS"
    >
      <div className="vl-page">
        <style>{ESTILOS}</style>

        <div className="vl-bar">
          <label className="vl-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Buscar por placa, veículo ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          {!carregando && !erro && (
            <span className="vl-count">
              {veiculos.length} {veiculos.length === 1 ? 'veículo' : 'veículos'}
            </span>
          )}
        </div>

        <div className="vl-card">
          {erro && (
            <div className="vl-state" role="alert">
              <Icon name="alert" size={28} />
              <h3>Não foi possível carregar os veículos</h3>
              <p>{erro}</p>
              <button type="button" className="vl-retry" onClick={() => setTentativa((t) => t + 1)}>
                <Icon name="refresh" /> Tentar novamente
              </button>
            </div>
          )}

          {carregando && !erro && (
            <div aria-busy="true" aria-label="Carregando veículos">
              {[0, 1, 2, 3].map((n) => <div key={n} className="vl-skeleton" />)}
            </div>
          )}

          {!carregando && !erro && veiculos.length === 0 && (
            <div className="vl-state">
              <Icon name="car" size={28} />
              <h3>Nenhum veículo encontrado</h3>
              <p>{busca ? 'Revise o termo da busca.' : 'Ainda não há veículos cadastrados.'}</p>
            </div>
          )}

          {!carregando && !erro && veiculos.length > 0 && (
            <div className="vl-scroll">
              <table className="vl-table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Veículo</th>
                    <th>Cliente</th>
                    <th>Último serviço</th>
                    <th className="vl-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((v) => (
                    <tr key={v.id}>
                      <td><span className="vl-plate">{v.placa}</span></td>
                      <td>
                        <span className="vl-name">{v.marca} {v.modelo}</span>
                        <span className="vl-sub">Ano: {v.ano}</span>
                      </td>
                      <td><span className="vl-inline"><Icon name="user" size={16} /> {v.cliente}</span></td>
                      <td>
                        {v.ultimoServico ? (
                          <span className="vl-inline"><Icon name="calendar" size={16} /> {dataRelativa(v.ultimoServico)}</span>
                        ) : (
                          <span className="vl-muted">Sem atendimentos</span>
                        )}
                      </td>
                      <td className="vl-right">
                        <Link className="vl-link" to={`/veiculos/${v.id}/historico`}>
                          <Icon name="clipboard" size={15} /> Ver histórico
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}