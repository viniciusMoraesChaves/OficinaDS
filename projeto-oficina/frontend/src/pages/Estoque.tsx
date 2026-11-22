import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import type { Paginacao } from '../types/cliente';
import type {
  FiltroSituacao,
  BaixaPeca,
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
  const [mensagem, setMensagem] = useState('');
  const [baixas, setBaixas] = useState<BaixaPeca[]>([]);
  const [pecaBaixa, setPecaBaixa] = useState<Peca | null>(null);
  const [quantidadeBaixa, setQuantidadeBaixa] = useState(1);
  const [motivoBaixa, setMotivoBaixa] = useState('');
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [erroBaixa, setErroBaixa] = useState('');
  const baixaDialogRef = useRef<HTMLDialogElement>(null);

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

  const carregarBaixas = useCallback(async () => {
    try {
      const resposta = await apiFetch<{ dados: BaixaPeca[] }>('/api/pecas/baixas');
      setBaixas(resposta.dados);
    } catch {
      setBaixas([]);
    }
  }, []);

  useEffect(() => {
    carregarBaixas();
  }, [carregarBaixas]);

  useEffect(() => {
    const dialog = baixaDialogRef.current;
    if (pecaBaixa && dialog && !dialog.open) dialog.showModal();
  }, [pecaBaixa]);

  function abrirBaixa(peca: Peca) {
    setPecaBaixa(peca);
    setQuantidadeBaixa(1);
    setMotivoBaixa('');
    setErroBaixa('');
    setMensagem('');
  }

  async function handleBaixa(event: FormEvent) {
    event.preventDefault();
    if (!pecaBaixa) return;

    setSalvandoBaixa(true);
    setErroBaixa('');

    try {
      await apiFetch(`/api/pecas/${pecaBaixa.id}/baixas`, {
        method: 'POST',
        body: JSON.stringify({ quantidade: quantidadeBaixa, motivo: motivoBaixa })
      });
      baixaDialogRef.current?.close();
      setPecaBaixa(null);
      setMensagem('Baixa registrada e estoque atualizado.');
      await Promise.all([carregarPecas(), carregarBaixas()]);
    } catch (err) {
      setErroBaixa(err instanceof Error ? err.message : 'Erro ao registrar a baixa.');
    } finally {
      setSalvandoBaixa(false);
    }
  }

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

      {mensagem && <Feedback type="success" message={mensagem} />}

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
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && pecas.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={7}>
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
                  <td className="align-right">
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      onClick={() => abrirBaixa(peca)}
                      disabled={peca.quantidade === 0}
                    >
                      Dar baixa
                    </button>
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

      <section className="panel" aria-labelledby="baixas-list-title">
        <header className="panel__header">
          <div>
            <h3 id="baixas-list-title">Baixas recentes</h3>
            <p>Peças danificadas ou inutilizáveis retiradas do estoque.</p>
          </div>
        </header>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Quantidade</th>
                <th>Motivo</th>
                <th>Registrado por</th>
                <th>Data e hora</th>
              </tr>
            </thead>
            <tbody>
              {baixas.length === 0 && (
                <tr><td className="empty-cell" colSpan={5}>Nenhuma baixa registrada.</td></tr>
              )}
              {baixas.map((baixa) => (
                <tr key={baixa.id}>
                  <td><strong>{baixa.pecaCodigo}</strong> — {baixa.pecaNome}</td>
                  <td>{baixa.quantidade}</td>
                  <td>{baixa.motivo}</td>
                  <td>{baixa.usuarioNome}</td>
                  <td className="nowrap">{formatDateTime(baixa.criadaEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {pecaBaixa && (
        <dialog
          ref={baixaDialogRef}
          className="dialog"
          onClose={() => setPecaBaixa(null)}
        >
          <div className="dialog__header">
            <h2>Dar baixa em peça</h2>
            <button className="dialog__close" type="button" onClick={() => baixaDialogRef.current?.close()} aria-label="Fechar">×</button>
          </div>
          <form className="dialog__body" onSubmit={handleBaixa}>
            <p><strong>{pecaBaixa.codigo} — {pecaBaixa.nome}</strong></p>
            <p className="search-summary">Disponível: {pecaBaixa.quantidade} unidade(s)</p>
            <div className="field">
              <label htmlFor="baixa-quantidade">Quantidade</label>
              <input
                id="baixa-quantidade"
                type="number"
                min={1}
                max={pecaBaixa.quantidade}
                step={1}
                value={quantidadeBaixa}
                onChange={(event) => setQuantidadeBaixa(Number(event.target.value))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="baixa-motivo">Motivo</label>
              <textarea
                id="baixa-motivo"
                rows={3}
                minLength={5}
                maxLength={255}
                value={motivoBaixa}
                onChange={(event) => setMotivoBaixa(event.target.value)}
                placeholder="Ex.: peça trincada durante o armazenamento"
                required
              />
            </div>
            {erroBaixa && <Feedback type="error" message={erroBaixa} />}
            <div className="dialog__actions">
              <button className="button button--secondary" type="button" onClick={() => baixaDialogRef.current?.close()} disabled={salvandoBaixa}>Cancelar</button>
              <button className="button button--primary" type="submit" disabled={salvandoBaixa}>
                {salvandoBaixa ? 'Registrando...' : 'Confirmar baixa'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </Layout>
  );
}
