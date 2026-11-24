import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '../services/api';
import { formatDateTime } from '../utils/format';
import type { AtendimentoAberto } from '../types/orcamento';

type DanoChegada = {
  id: number;
  descricao: string;
  registradoEm: string;
  registradoPor: string;
};

const ESTILOS = `
.dc-dialog { width: min(620px, calc(100vw - 32px)); max-height: 90vh; border: 1px solid #e8e5e0;
  border-radius: 12px; padding: 0; background: #fff; color: #1a1a1a; font: inherit; }
.dc-dialog::backdrop { background: #0008; }
.dc-dialog * { box-sizing: border-box; }
.dc-dialog__head { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 20px 24px; border-bottom: 1px solid #e8e5e0; }
.dc-dialog__head h2 { font-size: 20px; margin: 0; }
.dc-dialog__close { border: 0; background: none; font-size: 24px; cursor: pointer; }
.dc-dialog__body { padding: 20px 24px 24px; display: grid; gap: 16px; }
.dc-dialog__vehicle { margin: 0; font-size: 14px; color: #625c55; }
.dc-dialog__field { display: grid; gap: 7px; font-size: 13px; font-weight: 600; }
.dc-dialog__field textarea { resize: vertical; width: 100%; min-height: 95px; padding: 10px 12px;
  font: inherit; font-size: 14px; font-weight: 400; border: 1px solid #d9d5cf; border-radius: 8px; }
.dc-dialog__field textarea:focus { outline: 2px solid #f59e0b; outline-offset: 1px; }
.dc-dialog__help { color: #77716a; font-size: 12px; font-weight: 400; }
.dc-dialog__error { color: #991b1b; font-size: 13px; margin: 0; }
.dc-dialog__success { color: #166534; font-size: 13px; margin: 0; }
.dc-dialog__actions { display: flex; justify-content: flex-end; gap: 10px; }
.dc-dialog__history { border-top: 1px solid #e8e5e0; padding-top: 18px; }
.dc-dialog__history h3 { font-size: 15px; margin: 0 0 10px; }
.dc-dialog__history ul { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }
.dc-dialog__history li { padding: 12px; background: #f8f7f4; border: 1px solid #e8e5e0; border-radius: 8px; }
.dc-dialog__history p { margin: 0 0 6px; font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
.dc-dialog__history small { color: #756f68; font-size: 12px; }
@media (max-width: 500px) { .dc-dialog__head, .dc-dialog__body { padding-left: 16px; padding-right: 16px; } }
`;

export function DanosChegadaDialog({ atendimento, onClose }: {
  atendimento: AtendimentoAberto | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [descricao, setDescricao] = useState('');
  const [registros, setRegistros] = useState<DanoChegada[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const idAtendimento = atendimento?.id;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (atendimento && !dialog.open) dialog.showModal();
    if (!atendimento && dialog.open) dialog.close();
  }, [atendimento]);

  useEffect(() => {
    if (!idAtendimento) return;
    const abort = new AbortController();
    setDescricao('');
    setRegistros([]);
    setErro('');
    setSucesso('');
    setLoading(true);
    apiFetch<{ dados: DanoChegada[] }>(`/api/atendimentos/${idAtendimento}/danos`, { signal: abort.signal })
      .then(({ dados }) => { if (!abort.signal.aborted) setRegistros(dados); })
      .catch((e: unknown) => { if (!abort.signal.aborted) setErro(e instanceof Error ? e.message : 'Erro ao carregar danos.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [idAtendimento]);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!idAtendimento || salvando) return;
    setErro('');
    setSucesso('');
    if (descricao.trim().length < 10 || descricao.trim().length > 1000) {
      setErro('Descreva o dano com 10 a 1000 caracteres.');
      return;
    }
    setSalvando(true);
    try {
      await apiFetch(`/api/atendimentos/${idAtendimento}/danos`, {
        method: 'POST', body: JSON.stringify({ descricao: descricao.trim() })
      });
      const { dados } = await apiFetch<{ dados: DanoChegada[] }>(`/api/atendimentos/${idAtendimento}/danos`);
      setRegistros(dados);
      setDescricao('');
      setSucesso('Dano registrado com sucesso.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar dano.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <style>{ESTILOS}</style>
      <dialog
        ref={ref}
        className="dc-dialog"
        aria-labelledby="dc-titulo"
        onClose={onClose}
        onCancel={(e) => { if (salvando) e.preventDefault(); else onClose(); }}
      >
        <div className="dc-dialog__head">
          <h2 id="dc-titulo">Danos na chegada</h2>
          <button className="dc-dialog__close" type="button" onClick={onClose} disabled={salvando} aria-label="Fechar">×</button>
        </div>
        <div className="dc-dialog__body">
          <p className="dc-dialog__vehicle">
            {atendimento?.clienteNome} — {atendimento?.marca} {atendimento?.modelo} ({atendimento?.placa})
          </p>
          <form onSubmit={salvar} className="dc-dialog__body" style={{ padding: 0 }}>
            <label className="dc-dialog__field" htmlFor="dc-descricao">
              Descrição do dano identificado *
              <textarea id="dc-descricao" required minLength={10} maxLength={1000}
                placeholder="Ex.: Arranhão de aproximadamente 15 cm na porta dianteira direita."
                value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={salvando} />
              <span className="dc-dialog__help">Identificaremos automaticamente quem registrou e o horário.</span>
            </label>
            {erro && <p role="alert" className="dc-dialog__error">{erro}</p>}
            {sucesso && <p role="status" className="dc-dialog__success">{sucesso}</p>}
            <div className="dc-dialog__actions">
              <button className="button button--secondary" type="button" onClick={onClose} disabled={salvando}>Fechar</button>
              <button className="button button--primary" type="submit" disabled={salvando || loading}>
                {salvando ? 'Salvando...' : 'Registrar dano'}
              </button>
            </div>
          </form>
          <section className="dc-dialog__history" aria-label="Danos registrados">
            <h3>Registros anteriores ({registros.length})</h3>
            {loading ? <p>Carregando registros...</p> : registros.length === 0 ? (
              <p>Nenhum dano registrado para este atendimento.</p>
            ) : (
              <ul>{registros.map((d) => (
                <li key={d.id}>
                  <p>{d.descricao}</p>
                  <small>{d.registradoPor} • {formatDateTime(d.registradoEm)}</small>
                </li>
              ))}</ul>
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}
