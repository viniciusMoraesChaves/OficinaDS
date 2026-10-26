import { useEffect, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import type { Orcamento, OrcamentoResumo, StatusOrcamento } from '../types/orcamento';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Aguardando sua decisão',
  aceito: 'Aceito',
  recusado: 'Recusado'
};

export default function MeusOrcamentos() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [selecionado, setSelecionado] = useState<Orcamento | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState('');
  const [decidindo, setDecidindo] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.title = 'OficinaDS | Meus orçamentos';
  }, []);

  function carregarLista() {
    setLoading(true);
    setErro('');

    apiFetch<{ dados: OrcamentoResumo[] }>('/api/orcamentos/meus')
      .then((res) => setOrcamentos(res.dados))
      .catch((err) => setErro(err instanceof Error ? err.message : 'Erro ao carregar orçamentos.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    carregarLista();
  }, []);

  async function abrirDetalhe(id: number) {
    setCarregandoDetalhe(true);
    setErroDetalhe('');
    dialogRef.current?.showModal();

    try {
      const res = await apiFetch<{ dados: Orcamento }>(`/api/orcamentos/${id}`);
      setSelecionado(res.dados);
    } catch (err) {
      setErroDetalhe(err instanceof Error ? err.message : 'Erro ao carregar orçamento.');
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  // DM-174/DM-175: o cliente aceita ou recusa o orçamento enviado.
  async function decidir(decisao: 'aceito' | 'recusado') {
    if (!selecionado) return;

    setDecidindo(true);
    setErroDetalhe('');

    try {
      await apiFetch(`/api/orcamentos/${selecionado.id}/decisao`, {
        method: 'PATCH',
        body: JSON.stringify({ decisao })
      });
      setSelecionado((atual) => (atual ? { ...atual, status: decisao } : atual));
      carregarLista();
    } catch (err) {
      setErroDetalhe(err instanceof Error ? err.message : 'Erro ao registrar sua decisão.');
    } finally {
      setDecidindo(false);
    }
  }

  return (
    <Layout
      title="Meus orçamentos"
      subtitle="Acompanhe e decida os orçamentos enviados pela oficina"
      documentTitle="OficinaDS | Meus orçamentos"
    >
      {loading && <Feedback type="loading" message="Carregando orçamentos..." />}
      {erro && <Feedback type="error" message={erro} />}

      <section className="panel">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Enviado em</th>
                <th><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && !erro && orcamentos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={5}>Nenhum orçamento enviado ainda.</td>
                </tr>
              )}

              {orcamentos.map((o) => (
                <tr key={o.id}>
                  <td>{o.placa} — {o.marca} {o.modelo}</td>
                  <td className="nowrap">{formatCurrency(o.valorTotal)}</td>
                  <td>
                    <span className={`status-badge ${o.status === 'recusado' ? 'is-inactive' : 'is-active'}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="nowrap">{formatDateTime(o.enviadoEm)}</td>
                  <td className="align-right">
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => abrirDetalhe(o.id)}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="dialog"
        onClose={() => {
          setSelecionado(null);
          carregarLista();
        }}
      >
        <div className="dialog__header">
          <h3>Orçamento</h3>
          <button
            type="button"
            className="dialog__close"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="dialog__body">
          {carregandoDetalhe && <Feedback type="loading" message="Carregando..." />}
          {erroDetalhe && <Feedback type="error" message={erroDetalhe} />}

          {selecionado && (
            <>
              <p><strong>Situação:</strong> {selecionado.situacaoVeiculo}</p>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selecionado.itens.map((item) => (
                      <tr key={item.id}>
                        <td>{item.descricao}</td>
                        <td className="nowrap">{formatCurrency(item.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="search-summary">
                <strong>Total: {formatCurrency(selecionado.valorTotal)}</strong>
              </p>

              <p>
                <span className={`status-badge ${selecionado.status === 'recusado' ? 'is-inactive' : 'is-active'}`}>
                  {STATUS_LABEL[selecionado.status]}
                </span>
              </p>

              {selecionado.decididoEm && (
                <p><small>Decidido em {formatDateTime(selecionado.decididoEm)}</small></p>
              )}
            </>
          )}

          <div className="dialog__actions">
            {selecionado?.status === 'enviado' && (
              <>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => decidir('recusado')}
                  disabled={decidindo}
                >
                  {decidindo ? 'Enviando...' : 'Recusar orçamento'}
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => decidir('aceito')}
                  disabled={decidindo}
                >
                  {decidindo ? 'Enviando...' : 'Aceitar orçamento'}
                </button>
              </>
            )}
            <button
              type="button"
              className="button button--secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Fechar
            </button>
          </div>
        </div>
      </dialog>
    </Layout>
  );
}