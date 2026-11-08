import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch, apiPost } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import type { Paginacao } from '../types/cliente';
import type {
  CategoriasResponse,
  FiltroTipo,
  FormaPagamento,
  ListaMovimentacoesResponse,
  Movimentacao,
  ResumoFinanceiro,
  TipoMovimentacao
} from '../types/financeiro';
import '../styles/financeiro.css';

const LIMITE = 8;

type Atalho = 'mes' | '30d' | 'tudo' | 'custom';

const ATALHOS: { id: Exclude<Atalho, 'custom'>; rotulo: string }[] = [
  { id: 'mes', rotulo: 'Este mês' },
  { id: '30d', rotulo: 'Últimos 30 dias' },
  { id: 'tudo', rotulo: 'Tudo' }
];

const ROTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  boleto: 'Boleto',
  transferencia: 'Transferência'
};

const RESUMO_VAZIO: ResumoFinanceiro = { entradas: 0, saidas: 0, resultado: 0, quantidade: 0 };

function isoLocal(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function periodoDoAtalho(atalho: Exclude<Atalho, 'custom'>) {
  const hoje = new Date();

  if (atalho === 'mes') {
    return { inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: '' };
  }

  if (atalho === '30d') {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 30);
    return { inicio: isoLocal(inicio), fim: '' };
  }

  return { inicio: '', fim: '' };
}

type Filtros = {
  inicio: string;
  fim: string;
  tipo: FiltroTipo;
  categoria: string;
  busca: string;
};

function filtrosIniciais(): Filtros {
  return { ...periodoDoAtalho('mes'), tipo: 'todos', categoria: '', busca: '' };
}

type FormLancamento = {
  tipo: TipoMovimentacao;
  categoria: string;
  descricao: string;
  valor: string;
  data: string;
  formaPagamento: string;
};

function formVazio(): FormLancamento {
  return {
    tipo: 'entrada',
    categoria: '',
    descricao: '',
    valor: '',
    data: isoLocal(new Date()),
    formaPagamento: ''
  };
}

export default function Financeiro() {
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [atalho, setAtalho] = useState<Atalho>('mes');
  const [inputInicio, setInputInicio] = useState(filtros.inicio);
  const [inputFim, setInputFim] = useState(filtros.fim);
  const [inputTipo, setInputTipo] = useState<FiltroTipo>('todos');
  const [inputCategoria, setInputCategoria] = useState('');
  const [inputBusca, setInputBusca] = useState('');
  const [erroFiltro, setErroFiltro] = useState('');

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro>(RESUMO_VAZIO);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [pagina, setPagina] = useState(1);
  const [recarregar, setRecarregar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [categorias, setCategorias] = useState<Record<TipoMovimentacao, string[]>>({
    entrada: [],
    saida: []
  });
  const [formas, setFormas] = useState<FormaPagamento[]>([]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormLancamento>(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const carregarMovimentacoes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE),
        tipo: filtros.tipo,
        categoria: filtros.categoria,
        busca: filtros.busca,
        inicio: filtros.inicio,
        fim: filtros.fim
      });
      const resultado = await apiFetch<ListaMovimentacoesResponse>(
        `/api/financeiro/movimentacoes?${params}`
      );
      setMovimentacoes(resultado.dados);
      setResumo(resultado.resumo);
      setPaginacao(resultado.paginacao);
    } catch (err) {
      setMovimentacoes([]);
      setPaginacao(null);
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    carregarMovimentacoes();
  }, [carregarMovimentacoes, recarregar]);

  useEffect(() => {
    apiFetch<CategoriasResponse>('/api/financeiro/movimentacoes/categorias')
      .then((resposta) => {
        setCategorias(resposta.dados.categorias);
        setFormas(resposta.dados.formasPagamento);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (modalAberto && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [modalAberto]);

  const todasCategorias = [...categorias.entrada, ...categorias.saida].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  function escolherAtalho(novo: Exclude<Atalho, 'custom'>) {
    const periodo = periodoDoAtalho(novo);

    setAtalho(novo);
    setInputInicio(periodo.inicio);
    setInputFim(periodo.fim);
    setErroFiltro('');
    setFiltros((atual) => ({ ...atual, ...periodo }));
    setPagina(1);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (inputInicio && inputFim && inputInicio > inputFim) {
      setErroFiltro('A data inicial não pode ser depois da data final.');
      return;
    }

    setErroFiltro('');
    setFiltros({
      inicio: inputInicio,
      fim: inputFim,
      tipo: inputTipo,
      categoria: inputCategoria,
      busca: inputBusca.trim()
    });
    setPagina(1);
  }

  function limparFiltros(manterAtalho = false) {
    const padrao = filtrosIniciais();

    if (!manterAtalho) {
      setAtalho('mes');
    }

    setInputInicio(padrao.inicio);
    setInputFim(padrao.fim);
    setInputTipo('todos');
    setInputCategoria('');
    setInputBusca('');
    setErroFiltro('');
    setFiltros(padrao);
    setPagina(1);
  }

  function abrirNovoLancamento() {
    setForm(formVazio());
    setErroForm('');
    setSucesso('');
    setModalAberto(true);
  }

  function fecharModal() {
    dialogRef.current?.close();
  }

  function atualizarForm(campo: keyof FormLancamento, valor: string) {
    setForm((atual) => {
      const novo = { ...atual, [campo]: valor };
      // as categorias dependem do tipo: ao trocar o tipo, a escolha anterior deixa de valer
      if (campo === 'tipo') novo.categoria = '';
      return novo;
    });
  }

  async function handleSalvar(event: FormEvent) {
    event.preventDefault();
    setErroForm('');

    if (!form.categoria) return setErroForm('Escolha uma categoria.');
    if (form.descricao.trim().length < 3) return setErroForm('Descreva o lançamento (mínimo de 3 letras).');
    if (!form.valor.trim()) return setErroForm('Informe o valor.');
    if (!form.data) return setErroForm('Informe a data.');

    setSalvando(true);

    try {
      await apiPost('/api/financeiro/movimentacoes', {
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        valor: form.valor.trim(),
        data: form.data,
        formaPagamento: form.formaPagamento
      });

      const foraDoPeriodo =
        (filtros.inicio && form.data < filtros.inicio) || (filtros.fim && form.data > filtros.fim);

      dialogRef.current?.close();
      setSucesso(`Lançamento de ${formatDate(form.data)} registrado com sucesso.`);

      if (foraDoPeriodo) {
        // o lançamento novo não apareceria no período filtrado: mostra tudo
        escolherAtalho('tudo');
        setInputTipo('todos');
        setInputCategoria('');
        setInputBusca('');
        setFiltros({ inicio: '', fim: '', tipo: 'todos', categoria: '', busca: '' });
      } else {
        setPagina(1);
        setRecarregar((v) => v + 1);
      }
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : 'Não foi possível registrar o lançamento.');
    } finally {
      setSalvando(false);
    }
  }

  const filtrando = Boolean(
    filtros.categoria || filtros.busca || filtros.tipo !== 'todos'
  );

  const periodoTexto = (() => {
    if (!filtros.inicio && !filtros.fim) return 'Todo o período';
    if (filtros.inicio && !filtros.fim) return `Desde ${formatDate(filtros.inicio)}`;
    if (!filtros.inicio) return `Até ${formatDate(filtros.fim)}`;
    return `${formatDate(filtros.inicio)} a ${formatDate(filtros.fim)}`;
  })();

  const rotuloResultado =
    resumo.resultado > 0 ? 'Lucro' : resumo.resultado < 0 ? 'Prejuízo' : 'Resultado';
  const classeResultado =
    resumo.resultado > 0 ? 'valor--entrada' : resumo.resultado < 0 ? 'valor--saida' : '';

  return (
    <Layout
      title="Financeiro"
      subtitle="Acesso restrito ao Administrador"
      documentTitle="OficinaDS | Financeiro"
    >
      <section className="intro">
        <div>
          <h2>Controle financeiro da oficina</h2>
          <p>
            Registre entradas e saídas e acompanhe o resultado do período. Cobranças pagas pelos
            clientes entram automaticamente como entradas.
          </p>
        </div>
        <button className="button button--primary" type="button" onClick={abrirNovoLancamento}>
          + Novo lançamento
        </button>
      </section>

      <Feedback type="success" message={sucesso} />

      <section className="financeiro-resumo" aria-label="Resumo do período">
        <div className="financeiro-resumo__item">
          <span>Entradas</span>
          <strong className="valor--entrada">{formatCurrency(resumo.entradas)}</strong>
          <small>{periodoTexto}</small>
        </div>
        <div className="financeiro-resumo__item">
          <span>Saídas</span>
          <strong className="valor--saida">{formatCurrency(resumo.saidas)}</strong>
          <small>{periodoTexto}</small>
        </div>
        <div className="financeiro-resumo__item">
          <span>{rotuloResultado}</span>
          <strong className={classeResultado}>{formatCurrency(resumo.resultado)}</strong>
          <small>Entradas menos saídas</small>
        </div>
        <div className="financeiro-resumo__item">
          <span>Movimentações</span>
          <strong>{resumo.quantidade}</strong>
          <small>{filtrando ? 'Com os filtros aplicados' : 'No período'}</small>
        </div>
      </section>

      <div className="financeiro-periodo" role="group" aria-label="Período">
        {ATALHOS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`financeiro-periodo__atalho ${atalho === item.id ? 'is-active' : ''}`}
            aria-pressed={atalho === item.id}
            onClick={() => escolherAtalho(item.id)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      <form
        className="search-panel search-panel--financeiro"
        role="search"
        onSubmit={handleSubmit}
      >
        <div className="field">
          <label htmlFor="fin-inicio">De</label>
          <input
            id="fin-inicio"
            type="date"
            value={inputInicio}
            onChange={(event) => {
              setInputInicio(event.target.value);
              setAtalho('custom');
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="fin-fim">Até</label>
          <input
            id="fin-fim"
            type="date"
            value={inputFim}
            onChange={(event) => {
              setInputFim(event.target.value);
              setAtalho('custom');
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="fin-tipo">Tipo</label>
          <select
            id="fin-tipo"
            value={inputTipo}
            onChange={(event) => setInputTipo(event.target.value as FiltroTipo)}
          >
            <option value="todos">Entradas e saídas</option>
            <option value="entrada">Só entradas</option>
            <option value="saida">Só saídas</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="fin-categoria">Categoria</label>
          <select
            id="fin-categoria"
            value={inputCategoria}
            onChange={(event) => setInputCategoria(event.target.value)}
          >
            <option value="">Todas</option>
            {todasCategorias.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="fin-busca">Descrição</label>
          <input
            id="fin-busca"
            type="search"
            maxLength={100}
            placeholder="Ex.: aluguel, freio"
            autoComplete="off"
            value={inputBusca}
            onChange={(event) => setInputBusca(event.target.value)}
          />
        </div>

        <button className="button button--primary" type="submit" disabled={loading}>
          Filtrar
        </button>
        <button className="button button--ghost" type="button" onClick={() => limparFiltros()}>
          Limpar
        </button>
      </form>

      <Feedback type="error" message={erroFiltro} />

      <section className="panel" aria-labelledby="movimentacoes-title">
        <header className="panel__header">
          <div>
            <h3 id="movimentacoes-title">Movimentações</h3>
            <p className="search-summary">
              {paginacao
                ? `${paginacao.total} movimentaç${paginacao.total === 1 ? 'ão' : 'ões'} • ${periodoTexto}`
                : ''}
            </p>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando movimentações..." />}
        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Descrição</th>
                <th scope="col">Origem</th>
                <th scope="col">Pagamento</th>
                <th scope="col">Valor</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && movimentacoes.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    Nenhuma movimentação encontrada neste período.
                  </td>
                </tr>
              )}

              {movimentacoes.map((item) => (
                <tr key={item.id}>
                  <td className="nowrap">{formatDate(item.data)}</td>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{item.descricao}</strong>
                      <small>{item.categoria}</small>
                    </span>
                  </td>
                  <td>
                    <span
                      className={`origem-badge ${item.origem === 'cobranca' ? 'origem-badge--cobranca' : ''}`}
                    >
                      {item.origem === 'cobranca' ? 'Cobrança paga' : 'Lançamento'}
                    </span>
                  </td>
                  <td className="nowrap">
                    {item.formaPagamento ? ROTULO_FORMA[item.formaPagamento] : '—'}
                  </td>
                  <td className={`nowrap valor--${item.tipo}`}>
                    <strong>
                      {item.tipo === 'saida' ? '− ' : '+ '}
                      {formatCurrency(item.valor)}
                    </strong>
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

      {modalAberto && (
        <dialog
          ref={dialogRef}
          className="dialog"
          onClose={() => setModalAberto(false)}
        >
          <div className="dialog__header">
            <h2>Novo lançamento</h2>
            <button
              className="dialog__close"
              type="button"
              onClick={fecharModal}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <form className="dialog__body lancamento-form" onSubmit={handleSalvar} noValidate>
            <div className="lancamento-form__linha">
              <div className="field">
                <label htmlFor="lanc-tipo">Tipo</label>
                <select
                  id="lanc-tipo"
                  value={form.tipo}
                  onChange={(event) => atualizarForm('tipo', event.target.value)}
                  disabled={salvando}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="lanc-categoria">Categoria</label>
                <select
                  id="lanc-categoria"
                  value={form.categoria}
                  onChange={(event) => atualizarForm('categoria', event.target.value)}
                  disabled={salvando}
                >
                  <option value="">Selecione</option>
                  {categorias[form.tipo].map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="lanc-descricao">Descrição</label>
              <input
                id="lanc-descricao"
                type="text"
                maxLength={150}
                placeholder="Ex.: Conta de energia de novembro"
                value={form.descricao}
                onChange={(event) => atualizarForm('descricao', event.target.value)}
                disabled={salvando}
              />
            </div>

            <div className="lancamento-form__linha">
              <div className="field">
                <label htmlFor="lanc-valor">Valor (R$)</label>
                <input
                  id="lanc-valor"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(event) => atualizarForm('valor', event.target.value)}
                  disabled={salvando}
                />
              </div>

              <div className="field">
                <label htmlFor="lanc-data">Data</label>
                <input
                  id="lanc-data"
                  type="date"
                  max={isoLocal(new Date())}
                  value={form.data}
                  onChange={(event) => atualizarForm('data', event.target.value)}
                  disabled={salvando}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="lanc-forma">Forma de pagamento (opcional)</label>
              <select
                id="lanc-forma"
                value={form.formaPagamento}
                onChange={(event) => atualizarForm('formaPagamento', event.target.value)}
                disabled={salvando}
              >
                <option value="">Não informada</option>
                {formas.map((forma) => (
                  <option key={forma} value={forma}>
                    {ROTULO_FORMA[forma]}
                  </option>
                ))}
              </select>
            </div>

            {erroForm && <p className="lancamento-form__erro">{erroForm}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="button button--secondary"
                type="button"
                onClick={fecharModal}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button className="button button--primary" type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Registrar lançamento'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </Layout>
  );
}
