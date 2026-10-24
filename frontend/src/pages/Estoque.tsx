import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { Paginacao } from '../types/cliente';
import type {
  FiltroSituacao,
  ListaPecasResponse,
  Peca,
  ResumoEstoque,
  SituacaoPeca
} from '../types/peca';
import '../styles/estoque.css';

const LIMITE = 8;

const ROTULO_SITUACAO: Record<SituacaoPeca, string> = {
  disponivel: 'Disponível',
  baixo: 'Estoque baixo',
  indisponivel: 'Indisponível'
};

const RESUMO_VAZIO: ResumoEstoque = { total: 0, disponivel: 0, baixo: 0, indisponivel: 0 };

export default function Estoque() {
  const [inputBusca, setInputBusca] = useState('');
  const [inputSituacao, setInputSituacao] = useState<FiltroSituacao>('todas');
  const [inputCategoria, setInputCategoria] = useState('');
  const [filtros, setFiltros] = useState({ busca: '', situacao: 'todas' as FiltroSituacao, categoria: '' });

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [resumo, setResumo] = useState<ResumoEstoque>(RESUMO_VAZIO);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarPecas = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE),
        busca: filtros.busca,
        situacao: filtros.situacao,
        categoria: filtros.categoria
      });
      const resultado = await apiFetch<ListaPecasResponse>(`/api/pecas?${params}`);
      setPecas(resultado.dados);
      setResumo(resultado.resumo);
      setPaginacao(resultado.paginacao);
    } catch (err) {
      setPecas([]);
      setPaginacao(null);
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    carregarPecas();
  }, [carregarPecas]);

  useEffect(() => {
    apiFetch<{ dados: string[] }>('/api/pecas/categorias')
      .then((resposta) => setCategorias(resposta.dados))
      .catch(() => setCategorias([]));
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFiltros({
      busca: inputBusca.trim(),
      situacao: inputSituacao,
      categoria: inputCategoria
    });
    setPagina(1);
  }

  function handleClear() {
    setInputBusca('');
    setInputSituacao('todas');
    setInputCategoria('');
    setFiltros({ busca: '', situacao: 'todas', categoria: '' });
    setPagina(1);
  }

  const filtrando = Boolean(filtros.busca || filtros.categoria || filtros.situacao !== 'todas');

  function textoResumo(total: number) {
    const itens = `${total} peça${total === 1 ? '' : 's'}`;
    return filtrando ? `${itens} encontrada${total === 1 ? '' : 's'}` : `${itens} em estoque`;
  }

  return (
    <Layout
      title="Estoque"
      subtitle="Peças disponíveis na oficina"
      documentTitle="OficinaDS | Estoque de peças"
    >
      <section className="intro">
        <div>
          <h2>Consultar estoque de peças</h2>
          <p>
            Veja código, quantidade, localização, preço e a situação de cada peça. Filtre por
            nome, código, localização, categoria ou disponibilidade.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          disabled={loading}
          onClick={carregarPecas}
        >
          ↻ Atualizar lista
        </button>
      </section>

      <section className="estoque-resumo" aria-label="Resumo do estoque">
        <div className="estoque-resumo__item">
          <span>Peças cadastradas</span>
          <strong>{resumo.total}</strong>
        </div>
        <div className="estoque-resumo__item">
          <span>Disponíveis</span>
          <strong>{resumo.disponivel}</strong>
        </div>
        <div className="estoque-resumo__item">
          <span>Estoque baixo</span>
          <strong>{resumo.baixo}</strong>
        </div>
        <div className="estoque-resumo__item">
          <span>Indisponíveis</span>
          <strong>{resumo.indisponivel}</strong>
        </div>
      </section>

      <form
        className="search-panel search-panel--estoque"
        role="search"
        onSubmit={handleSubmit}
      >
        <div className="field">
          <label htmlFor="estoque-busca">O que você procura?</label>
          <input
            id="estoque-busca"
            name="busca"
            type="search"
            maxLength={100}
            placeholder="Ex.: filtro, FRE-PAS-DI ou B2-P1"
            autoComplete="off"
            value={inputBusca}
            onChange={(event) => setInputBusca(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="estoque-categoria">Categoria</label>
          <select
            id="estoque-categoria"
            name="categoria"
            value={inputCategoria}
            onChange={(event) => setInputCategoria(event.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="estoque-situacao">Situação</label>
          <select
            id="estoque-situacao"
            name="situacao"
            value={inputSituacao}
            onChange={(event) => setInputSituacao(event.target.value as FiltroSituacao)}
          >
            <option value="todas">Todas</option>
            <option value="disponivel">Disponíveis</option>
            <option value="baixo">Estoque baixo</option>
            <option value="indisponivel">Indisponíveis</option>
          </select>
        </div>

        <button className="button button--primary" type="submit" disabled={loading}>
          Filtrar
        </button>
        <button className="button button--ghost" type="button" onClick={handleClear}>
          Limpar
        </button>
      </form>

      <section className="panel" aria-labelledby="estoque-list-title">
        <header className="panel__header">
          <div>
            <h3 id="estoque-list-title">Peças em estoque</h3>
            <p className="search-summary">{paginacao ? textoResumo(paginacao.total) : ''}</p>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando peças..." />}
        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Peça</th>
                <th scope="col">Quantidade</th>
                <th scope="col">Localização</th>
                <th scope="col">Preço</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && pecas.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    {filtrando
                      ? 'Nenhuma peça corresponde aos filtros.'
                      : 'Nenhuma peça cadastrada no estoque.'}
                  </td>
                </tr>
              )}

              {pecas.map((peca) => (
                <tr key={peca.id}>
                  <td className="nowrap">
                    <strong>{peca.codigo}</strong>
                  </td>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{peca.nome}</strong>
                      <small>{peca.categoria}</small>
                    </span>
                  </td>
                  <td className="quantidade-cell nowrap">
                    <strong>{peca.quantidade}</strong>
                    <small>mínimo {peca.quantidadeMinima}</small>
                  </td>
                  <td className="nowrap">{peca.localizacao}</td>
                  <td className="nowrap">{formatCurrency(peca.preco)}</td>
                  <td>
                    <span className={`situacao-badge situacao-badge--${peca.situacao}`}>
                      {ROTULO_SITUACAO[peca.situacao]}
                    </span>
                  </td>
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
