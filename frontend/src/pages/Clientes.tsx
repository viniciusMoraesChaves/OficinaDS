import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { ClienteDialog } from '../components/ClienteDialog';
import { apiFetch } from '../services/api';
import { formatCpf, formatPhone } from '../utils/format';
import type { ClienteResumo, ListaClientesResponse, Paginacao } from '../types/cliente';

const LIMITE = 8;

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadClientes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiFetch<ListaClientesResponse>(
        `/api/clientes?pagina=${pagina}&limite=${LIMITE}`
      );
      setClientes(result.dados);
      setPaginacao(result.paginacao);
    } catch (err) {
      setClientes([]);
      setPaginacao(null);
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, [pagina]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  return (
    <Layout
      title="Clientes"
      subtitle="Cadastro e relacionamento com veículos"
      documentTitle="OficinaOS | Consultar clientes"
    >
      <section className="intro">
        <div>
          <span className="story-label">DM-67</span>
          <h2>Consultar clientes</h2>
          <p>
            Consulte todos os clientes cadastrados e abra os detalhes para
            visualizar endereço e veículos vinculados.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          disabled={loading}
          onClick={loadClientes}
        >
          ↻ Atualizar lista
        </button>
      </section>

      <section className="panel" aria-labelledby="clientes-list-title">
        <header className="panel__header">
          <div>
            <h3 id="clientes-list-title">Clientes cadastrados</h3>
            <p>Ordenados alfabeticamente pelo nome</p>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando clientes..." />}
        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">CPF</th>
                <th scope="col">Telefone</th>
                <th scope="col">Veículos</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && clientes.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    Nenhum cliente foi cadastrado ainda.
                  </td>
                </tr>
              )}

              {clientes.map((c) => {
                const qtd = Number(c.quantidadeVeiculos);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar">{c.nome.slice(0, 2).toUpperCase()}</span>
                        <span className="person-cell__identity">
                          <strong>{c.nome}</strong>
                          <small>{c.email}</small>
                        </span>
                      </div>
                    </td>
                    <td className="nowrap">{formatCpf(c.cpf)}</td>
                    <td className="nowrap">{formatPhone(c.telefone)}</td>
                    <td className="nowrap">
                      {qtd} veículo{qtd === 1 ? '' : 's'}
                    </td>
                    <td><StatusBadge active={Boolean(c.ativo)} /></td>
                    <td className="align-right">
                      <button
                        type="button"
                        className="button button--secondary button--small"
                        aria-label={`Ver detalhes de ${c.nome}`}
                        onClick={() => setSelectedId(c.id)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginacao && (
          <Pagination
            pagina={paginacao.pagina}
            totalPaginas={paginacao.totalPaginas}
            total={paginacao.total}
            onPageChange={setPagina}
          />
        )}
      </section>

      <ClienteDialog clienteId={selectedId} onClose={() => setSelectedId(null)} />
    </Layout>
  );
}