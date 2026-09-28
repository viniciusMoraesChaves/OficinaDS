import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../services/api';
import { formatCpf, formatPhone } from '../utils/format';
import type { ClienteDetalhe } from '../types/cliente';

type Props = {
  clienteId: number | null;
  onClose: () => void;
};

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

export function ClienteDialog({ clienteId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // abre/fecha o <dialog> conforme o id selecionado
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (clienteId !== null) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [clienteId]);

  // busca os detalhes quando muda o id
  useEffect(() => {
    if (clienteId === null) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setCliente(null);

    apiFetch<{ dados: ClienteDetalhe }>(`/api/clientes/${clienteId}`)
      .then((res) => {
        if (!cancelled) setCliente(res.dados);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  const title = loading
    ? 'Carregando cliente...'
    : error
      ? 'Não foi possível abrir o cliente'
      : cliente?.nome ?? 'Detalhes do cliente';

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="cliente-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <header className="dialog__header">
        <h2 id="cliente-dialog-title">{title}</h2>
        <button
          className="dialog__close"
          type="button"
          aria-label="Fechar detalhes"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      <div className="dialog__body">
        {loading && <p className="feedback feedback--loading">Buscando detalhes...</p>}
        {error && <p className="feedback feedback--error">{error}</p>}

        {cliente && (
          <>
            <dl className="details-grid">
              <DetailItem label="CPF" value={formatCpf(cliente.cpf)} />
              <DetailItem label="E-mail" value={cliente.email} />
              <DetailItem label="Telefone" value={formatPhone(cliente.telefone)} />
              <DetailItem label="Status" value={cliente.ativo ? 'Ativo' : 'Inativo'} />
              <DetailItem label="Endereço" value={cliente.endereco} />
            </dl>

            <h3 className="dialog__section-title">
              Veículos ({cliente.veiculos.length})
            </h3>

            {cliente.veiculos.length === 0 ? (
              <p className="empty-panel">Este cliente não possui veículos cadastrados.</p>
            ) : (
              <div className="vehicle-list">
                {cliente.veiculos.map((v) => (
                  <article className="vehicle-card" key={v.placa}>
                    <span className="plate">{v.placa}</span>
                    <strong>{v.marca} {v.modelo}</strong>
                    <small>{v.ano} • {v.cor || 'Cor não informada'}</small>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}