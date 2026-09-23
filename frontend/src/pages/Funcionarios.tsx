import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch } from '../services/api';
import { formatCpf, formatDate, formatPhone } from '../utils/format';
import type {
  Funcionario,
  ListaFuncionariosResponse,
  StatusFiltro,
} from '../types/funcionario';
import type { Paginacao } from '../types/cliente';

const LIMITE = 8;

type Filtros = { busca: string; status: StatusFiltro };
const FILTROS_INICIAIS: Filtros = { busca: '', status: 'todos' };

export default function Funcionarios() {
  // o que está no formulário
  const [inputBusca, setInputBusca] = useState('');
  const [inputStatus, setInputStatus] = useState<StatusFiltro>('todos');

  // a busca aplicada (dispara o fetch)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function pesquisar() {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE),
        busca: filtros.busca,
        status: filtros.status,
      });

      try {
        const result = await apiFetch<ListaFuncionariosResponse>(
          `/api/funcionarios?${params}`
        );
        if (cancelled) return;
        setFuncionarios(result.dados);
        setPaginacao(result.paginacao);
      } catch (err) {
        if (cancelled) return;
        setFuncionarios([]);
        setPaginacao(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    pesquisar();
    return () => {
      cancelled = true;
    };
  }, [filtros, pagina]);

  function aplicar(busca: string, status: StatusFiltro) {
    setFiltros({ busca, status });
    setPagina(1);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    aplicar(inputBusca.trim(), inputStatus);
  }

  function handleStatusChange(status: StatusFiltro) {
    setInputStatus(status);
    aplicar(inputBusca.trim(), status); // equivale ao requestSubmit() do original
  }

  function handleClear() {
    setInputBusca('');
    setInputStatus('todos');
    aplicar('', 'todos');
    searchRef.current?.focus();
  }

  function resumo(total: number) {
    const partes: string[] = [];
    if (filtros.busca) partes.push(`“${filtros.busca}”`);
    if (filtros.status !== 'todos') partes.push(filtros.status);

    return partes.length
      ? `${total} resultado${total === 1 ? '' : 's'} para ${partes.join(' • ')}`
      : `${total} funcionário${total === 1 ? '' : 's'} no total`;
  }

  return (
    <Layout
      title="Funcionários"
      subtitle="Equipe e cargos da oficina"
      documentTitle="OficinaDS | Pesquisar funcionários"
    >
      <section className="intro">
        <div>
          <span className="story-label">DM-100</span>
          <h2>Pesquisar funcionários</h2>
          <p>
            Digite um nome, CPF, e-mail ou cargo. Você também pode limitar o
            resultado a funcionários ativos ou inativos.
          </p>
        </div>
      </section>

      <form className="search-panel" role="search" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="funcionarios-search">O que você procura?</label>
          <input
            ref={searchRef}
            id="funcionarios-search"
            name="busca"
            type="search"
            maxLength={100}
            placeholder="Ex.: Carlos, Mecânico ou CPF"
            autoComplete="off"
            value={inputBusca}
            onChange={(e) => setInputBusca(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="funcionarios-status">Status</label>
          <select
            id="funcionarios-status"
            name="status"
            value={inputStatus}
            onChange={(e) => handleStatusChange(e.target.value as StatusFiltro)}
          >
            <option value="todos">Todos</option>
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente inativos</option>
          </select>
        </div>

        <button className="button button--primary" type="submit" disabled={loading}>
          Pesquisar
        </button>
        <button className="button button--ghost" type="button" onClick={handleClear}>
          Limpar
        </button>
      </form>

      <section className="panel" aria-labelledby="funcionarios-list-title">
        <header className="panel__header">
          <div>
            <h3 id="funcionarios-list-title">Resultado da pesquisa</h3>
            <p className="search-summary">{paginacao ? resumo(paginacao.total) : ''}</p>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Pesquisando funcionários..." />}
        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Funcionário</th>
                <th scope="col">Cargo</th>
                <th scope="col">CPF</th>
                <th scope="col">Telefone</th>
                <th scope="col">Admissão</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && funcionarios.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    Nenhum funcionário corresponde à pesquisa.
                  </td>
                </tr>
              )}

              {funcionarios.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar avatar--blue">
                        {f.nome.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="person-cell__identity">
                        <strong>{f.nome}</strong>
                        <small>{f.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{f.cargo}</td>
                  <td className="nowrap">{formatCpf(f.cpf)}</td>
                  <td className="nowrap">{formatPhone(f.telefone)}</td>
                  <td className="nowrap">{formatDate(f.dataAdmissao)}</td>
                  <td><StatusBadge active={Boolean(f.ativo)} /></td>
                </tr>
              ))}
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
    </Layout>
  );
}