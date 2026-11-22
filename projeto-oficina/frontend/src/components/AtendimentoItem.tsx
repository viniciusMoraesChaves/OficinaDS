import type { AtendimentoHistorico } from '../types/historico';
import { brl, chaveStatus, partesData, totalAtendimento, totalPecas, totalServicos } from '../utils/historicoFormat';
import { Icon } from './Icon';
import StatusAtendimento from './StatusAtendimento';

const ESTILOS = `
.hv-item { position: relative; --hv-c: #9ca3af; }
.hv-item--ok { --hv-c: #16a34a; }
.hv-item--prog { --hv-c: #2563eb; }
.hv-item--wait { --hv-c: #7c3aed; }
.hv-item--cancel { --hv-c: #dc2626; }
.hv-item__dot {
  position: absolute; left: -26px; top: 26px; width: 12px; height: 12px; border-radius: 50%;
  background: var(--hv-c); box-shadow: 0 0 0 4px var(--hv-bg);
}

.hv-card { background: var(--hv-card); border: 1px solid var(--hv-line); border-radius: 12px; overflow: hidden; transition: box-shadow .15s, border-color .15s; }
.hv-item.is-open .hv-card, .hv-card:hover { border-color: #d9d4ca; box-shadow: 0 2px 10px rgba(30, 24, 10, .06); }
.hv-card__head {
  display: flex; align-items: center; gap: 16px; width: 100%; padding: 14px 18px;
  background: none; border: 0; text-align: left; font: inherit; color: inherit; cursor: pointer;
}
.hv-card__head:focus-visible { outline: 2px solid var(--hv-accent); outline-offset: -2px; }
.hv-date {
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex: none;
  width: 50px; height: 54px; border-radius: 10px; background: var(--hv-head);
}
.hv-date strong { font-size: 18px; line-height: 1; }
.hv-date small { margin-top: 3px; font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--hv-muted); }
.hv-card__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.hv-card__title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hv-card__meta { display: flex; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--hv-muted); gap: 0; }
.hv-card__meta svg { margin-right: 6px; }
.hv-card__total { font-size: 15px; font-weight: 700; min-width: 96px; text-align: right; }
.hv-chevron { color: var(--hv-muted); transition: transform .2s; flex: none; }
.hv-item.is-open .hv-chevron { transform: rotate(180deg); }

.hv-card__body { border-top: 1px solid var(--hv-line); padding: 18px; display: flex; flex-direction: column; gap: 18px; background: #fdfcfb; }
.hv-card__body[hidden] { display: none; }
.hv-notes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.hv-note { background: #fff; border: 1px solid var(--hv-line); border-radius: 10px; padding: 12px 14px; }
.hv-note--accent { background: var(--hv-accent-soft); border-color: #f6dca4; }
.hv-note__label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--hv-muted); }
.hv-note--accent .hv-note__label { color: #8a4b04; }
.hv-note p { margin: 8px 0 0; font-size: 14px; line-height: 1.5; }

.hv-tables { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.hv-table__title { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 13px; font-weight: 700; }
.hv-table__empty { margin: 0; font-size: 13px; padding: 10px 0; }
.hv-table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; border: 1px solid var(--hv-line); border-radius: 8px; overflow: hidden; }
.hv-table th { text-align: left; padding: 8px 12px; background: var(--hv-head); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--hv-muted); }
.hv-table td { padding: 9px 12px; border-top: 1px solid var(--hv-line); }
.hv-num { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }

.hv-card__foot { display: flex; justify-content: flex-end; gap: 22px; flex-wrap: wrap; padding-top: 14px; border-top: 1px dashed var(--hv-line); font-size: 13px; color: var(--hv-muted); }
.hv-card__foot strong { margin-left: 6px; color: var(--hv-text); }
.hv-card__grand strong { color: #8a4b04; font-size: 15px; }

@media (prefers-reduced-motion: reduce) { .hv-chevron { transition: none; } }
@media (max-width: 1000px) {
  .hv-tables, .hv-notes { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .hv-card__head { flex-wrap: wrap; gap: 10px 14px; }
  .hv-card__main { flex-basis: calc(100% - 70px); }
  .hv-card__total { min-width: 0; margin-left: auto; }
  .hv-item__dot { left: -19px; }
}
@media print {
  .hv-chevron { display: none !important; }
  .hv-card__body[hidden] { display: flex !important; }
  .hv-card { break-inside: avoid; box-shadow: none !important; }
}
`;

export function EstilosAtendimentoItem() {
  return <style>{ESTILOS}</style>;
}

interface Props {
  atendimento: AtendimentoHistorico;
  aberto: boolean;
  onAlternar: (id: number) => void;
}

export default function AtendimentoItem({ atendimento: a, aberto, onAlternar }: Props) {
  const data = partesData(a.data);
  const painelId = `hv-painel-${a.idAtendimento}`;
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

  return (
    <li className={`hv-item hv-item--${chaveStatus(a.status)}${aberto ? ' is-open' : ''}`}>
      <span className="hv-item__dot" aria-hidden="true" />
      <article className="hv-card">
        <button
          type="button"
          className="hv-card__head"
          aria-expanded={aberto}
          aria-controls={painelId}
          onClick={() => onAlternar(a.idAtendimento)}
        >
          <span className="hv-date">
            <strong>{data.dia}</strong>
            <small>{data.mes}</small>
          </span>

          <span className="hv-card__main">
            <span className="hv-card__title">{a.problema}</span>
            <span className="hv-card__meta">
              <Icon name="wrench" size={13} />
              {a.mecanico ?? 'Sem mecânico'}
              <span className="hv-sep">·</span>
              {data.hora}
              <span className="hv-sep">·</span>
              {plural(a.servicos.length, 'serviço', 'serviços')}
              <span className="hv-sep">·</span>
              {plural(a.pecas.length, 'peça', 'peças')}
            </span>
          </span>

          <StatusAtendimento status={a.status} />
          <span className="hv-card__total">{brl(totalAtendimento(a))}</span>
          <Icon name="chevron" size={18} className="hv-chevron" />
        </button>

        <div id={painelId} className="hv-card__body" hidden={!aberto}>
          <div className="hv-notes">
            <div className="hv-note">
              <span className="hv-note__label"><Icon name="alert" size={14} /> Problema relatado</span>
              <p>{a.problema}</p>
            </div>
            <div className="hv-note hv-note--accent">
              <span className="hv-note__label"><Icon name="activity" size={14} /> Diagnóstico</span>
              <p className={a.diagnostico ? undefined : 'hv-muted'}>
                {a.diagnostico ?? 'Nenhum diagnóstico registrado.'}
              </p>
            </div>
          </div>

          <div className="hv-tables">
            <section>
              <h4 className="hv-table__title"><Icon name="wrench" size={14} /> Serviços realizados</h4>
              {a.servicos.length === 0 ? (
                <p className="hv-muted hv-table__empty">Nenhum serviço registrado.</p>
              ) : (
                <table className="hv-table">
                  <thead>
                    <tr><th>Descrição</th><th className="hv-num">Valor</th></tr>
                  </thead>
                  <tbody>
                    {a.servicos.map((s, i) => (
                      <tr key={`${s.descricao}-${i}`}>
                        <td>{s.descricao}</td>
                        <td className="hv-num">{brl(s.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h4 className="hv-table__title"><Icon name="package" size={14} /> Peças utilizadas</h4>
              {a.pecas.length === 0 ? (
                <p className="hv-muted hv-table__empty">Nenhuma peça utilizada.</p>
              ) : (
                <table className="hv-table">
                  <thead>
                    <tr><th>Peça</th><th className="hv-num">Qtd.</th><th className="hv-num">Unitário</th><th className="hv-num">Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {a.pecas.map((p, i) => (
                      <tr key={`${p.nome}-${i}`}>
                        <td>{p.nome}</td>
                        <td className="hv-num">{p.quantidade}</td>
                        <td className="hv-num">{brl(p.valorUnitario)}</td>
                        <td className="hv-num">{brl(p.quantidade * p.valorUnitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <footer className="hv-card__foot">
            <span>Serviços <strong>{brl(totalServicos(a))}</strong></span>
            <span>Peças <strong>{brl(totalPecas(a))}</strong></span>
            <span className="hv-card__grand">Total <strong>{brl(totalAtendimento(a))}</strong></span>
          </footer>
        </div>
      </article>
    </li>
  );
}