import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch, apiPost } from '../services/api';

type ClienteOpcao = { id: number; nome: string; cpf: string };
type FormVeiculo = {
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
  chassi: string;
};

const VAZIO: FormVeiculo = {
  clienteId: '', placa: '', marca: '', modelo: '', ano: '', cor: '', chassi: ''
};

const ESTILOS = `
.nv-dialog { width: min(580px, calc(100vw - 32px)); max-height: min(90vh, 820px); padding: 0;
  border: 1px solid #e8e5e0; border-radius: 14px; background: white; color: #1a1a1a;
  box-shadow: 0 20px 80px #0003; font: inherit; }
.nv-dialog::backdrop { background: rgba(0, 0, 0, .48); }
.nv-dialog * { box-sizing: border-box; }
.nv-header { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 20px 24px; border-bottom: 1px solid #e8e5e0; }
.nv-header h2 { margin: 0; font-size: 20px; }
.nv-close { border: 0; background: transparent; cursor: pointer; font-size: 24px; color: #555; }
.nv-form { display: flex; flex-direction: column; gap: 18px; padding: 20px 24px 24px; }
.nv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.nv-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; font-size: 13px; font-weight: 600; }
.nv-field--full { grid-column: 1 / -1; }
.nv-field input, .nv-field select { width: 100%; height: 40px; padding: 0 11px;
  border: 1px solid #d9d5cf; border-radius: 8px; background: #fff; color: #1a1a1a;
  font: inherit; font-size: 14px; font-weight: 400; }
.nv-field input:focus, .nv-field select:focus { outline: 2px solid #f59e0b; outline-offset: 1px; }
.nv-field small { font-size: 11px; color: #78736b; font-weight: 400; }
.nv-error { margin: 0; font-size: 13px; color: #991b1b; }
.nv-actions { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e8e5e0; padding-top: 16px; }
.nv-actions button { min-height: 38px; border-radius: 8px; padding: 0 16px; font: inherit; font-size: 14px;
  font-weight: 600; cursor: pointer; }
.nv-actions button:disabled { cursor: not-allowed; opacity: .55; }
.nv-cancel { border: 1px solid #d9d5cf; background: #fff; color: #1a1a1a; }
.nv-save { border: 1px solid #f59e0b; background: #f59e0b; color: #1a1205; }
@media (max-width: 500px) { .nv-grid { grid-template-columns: 1fr; } .nv-header, .nv-form { padding-left: 16px; padding-right: 16px; } }
`;

export function NovoVeiculoDialog({
  aberto,
  onClose,
  onCriado
}: {
  aberto: boolean;
  onClose: () => void;
  onCriado: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormVeiculo>(VAZIO);
  const [clientes, setClientes] = useState<ClienteOpcao[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [erroClientes, setErroClientes] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    setForm(VAZIO);
    setErro('');
    setErroClientes('');
    setClientes([]);
    setCarregandoClientes(true);
    const controller = new AbortController();

    apiFetch<{ dados: ClienteOpcao[] }>('/api/clientes/opcoes', { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setClientes(res.dados ?? []);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setErroClientes(err instanceof Error ? err.message : 'Não foi possível carregar os clientes.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoClientes(false);
      });

    return () => controller.abort();
  }, [aberto]);

  function alterar(campo: keyof FormVeiculo, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando || carregandoClientes || erroClientes) return;
    setErro('');
    setSalvando(true);

    try {
      await apiPost('/api/veiculos', {
        ...form,
        clienteId: Number(form.clienteId),
        placa: form.placa.trim().toUpperCase(),
        ano: Number(form.ano)
      });
      onCriado();
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível cadastrar o veículo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <style>{ESTILOS}</style>
      <dialog
        ref={ref}
        className="nv-dialog"
        aria-labelledby="nv-titulo"
        onCancel={(event) => {
          if (salvando) event.preventDefault();
          else onClose();
        }}
        onClose={onClose}
      >
        <div className="nv-header">
          <h2 id="nv-titulo">Cadastrar veículo</h2>
          <button className="nv-close" type="button" onClick={onClose} disabled={salvando} aria-label="Fechar">×</button>
        </div>
        <form className="nv-form" onSubmit={salvar}>
          <div className="nv-grid">
            <label className="nv-field nv-field--full">
              Cliente responsável *
              <select
                required
                value={form.clienteId}
                onChange={(event) => alterar('clienteId', event.target.value)}
                disabled={salvando || carregandoClientes || !!erroClientes}
              >
                <option value="">{carregandoClientes ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.cpf}</option>)}
              </select>
              {!carregandoClientes && !erroClientes && clientes.length === 0 && (
                <small>Cadastre um cliente ativo antes de adicionar um veículo.</small>
              )}
            </label>
            <label className="nv-field">
              Placa *
              <input required maxLength={10} placeholder="ABC1D23" value={form.placa}
                onChange={(event) => alterar('placa', event.target.value.toUpperCase())} />
              <small>Padrão antigo ou Mercosul</small>
            </label>
            <label className="nv-field">
              Ano *
              <input required type="number" min={1900} max={2200} step={1} placeholder="2022"
                value={form.ano} onChange={(event) => alterar('ano', event.target.value)} />
            </label>
            <label className="nv-field">
              Marca *
              <input required maxLength={60} placeholder="Fiat" value={form.marca}
                onChange={(event) => alterar('marca', event.target.value)} />
            </label>
            <label className="nv-field">
              Modelo *
              <input required maxLength={80} placeholder="Argo" value={form.modelo}
                onChange={(event) => alterar('modelo', event.target.value)} />
            </label>
            <label className="nv-field">
              Cor (opcional)
              <input maxLength={40} placeholder="Prata" value={form.cor}
                onChange={(event) => alterar('cor', event.target.value)} />
            </label>
            <label className="nv-field">
              Chassi (opcional)
              <input maxLength={30} placeholder="Identificador do chassi" value={form.chassi}
                onChange={(event) => alterar('chassi', event.target.value.toUpperCase())} />
            </label>
          </div>
          {erroClientes && <p className="nv-error" role="alert">Erro ao consultar clientes: {erroClientes}</p>}
          {erro && <p className="nv-error" role="alert">{erro}</p>}
          <div className="nv-actions">
            <button className="nv-cancel" type="button" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button className="nv-save" type="submit"
              disabled={salvando || carregandoClientes || !!erroClientes || clientes.length === 0}>
              {salvando ? 'Salvando...' : 'Cadastrar veículo'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
