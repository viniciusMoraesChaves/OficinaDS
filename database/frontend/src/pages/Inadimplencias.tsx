import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { Pagination } from '../components/Pagination';
import { apiFetch } from '../services/api';
import { formatCpf, formatCurrency, formatDate, formatPhone } from '../utils/format';
import type { Paginacao } from '../types/cliente';
import type {
  ClienteInadimplente,
  FaixaAtraso,
  Inadimplencia,
  ListaClientesInadimplentesResponse,
  ListaInadimplenciasResponse,
  OrdenacaoClientes,
  OrdenacaoCobrancas,
  ResumoInadimplencia
} from '../types/inadimplencia';
import '../styles/inadimplencias.css';

const LIMITE = 10;

type Visao = 'cobrancas' | 'clientes';

type FiltrosCobrancas = {
  busca: string;
  faixaAtraso: FaixaAtraso;
  valorMin: string;
  valorMax: string;
  vencimentoDe: string;
  vencimentoAte: string;
};

const FILTROS_VAZIOS: FiltrosCobrancas = {
  busca: '',
  faixaAtraso: 'todas',
  valorMin: '',
  valorMax: '',
  vencimentoDe: '',
  vencimentoAte: ''
};

const ROTULO_FAIXA: Record<FaixaAtraso, string> = {
  todas: 'Qualquer atraso',
  ate30: 'Até 30 dias',
  de31a60: '31 a 60 dias',
  de61a90: '61 a 90 dias',
  acima90: 'Mais de 90 dias'
};

const ROTULO_ORDEM_COBRANCAS: Record<OrdenacaoCobrancas, string> = {
  maior_atraso: 'Maior atraso',
  menor_atraso: 'Menor atraso',
  maior_valor: 'Maior valor',
  menor_valor: 'Menor valor',
  cliente: 'Cliente (A–Z)'
};

const ROTULO_ORDEM_CLIENTES: Record<OrdenacaoClientes, string> = {
  maior_valor: 'Maior valor em aberto',
  maior_atraso: 'Maior atraso',
  mais_cobrancas: 'Mais cobranças vencidas',
  cliente: 'Cliente (A–Z)'
};

function classeAtraso(dias: number): 'leve' | 'medio' | 'grave' | 'critico' {
  if (dias > 90) return 'critico';
  if (dias > 60) return 'grave';
  if (dias > 30) return 'medio';
  return 'leve';
}

function textoDias(dias: number): string {
  return `${dias} dia${dias === 1 ? '' : 's'}`;
}

function BadgeAtraso({ dias }: { dias: number }) {
  return (
    <span className={`atraso-badge atraso-badge--${classeAtraso(dias)}`}>{textoDias(dias)}</span>
  );
}

function mensagemErro(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro desconhecido.';
}

type ListaCobrancasProps = {
  buscaInicial: string;
  atualizacao: number;
  semVencidas: boolean;
  onPagamento: (mensagem: string) => void;
};

function ListaCobrancas({ buscaInicial, atualizacao, semVencidas, onPagamento }: ListaCobrancasProps) {
  const inicial: FiltrosCobrancas = { ...FILTROS_VAZIOS, busca: buscaInicial };

  const [entradas, setEntradas] = useState<FiltrosCobrancas>(inicial);
  const [filtros, setFiltros] = useState<FiltrosCobrancas>(inicial);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoCobrancas>('maior_atraso');
  const [pagina, setPagina] = useState(1);

  const [cobrancas, setCobrancas] = useState<Inadimplencia[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [valorFiltrado, setValorFiltrado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagando, setPagando] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          pagina: String(pagina),
          limite: String(LIMITE),
          ordenacao,
          ...filtros
        });
        const resultado = await apiFetch<ListaInadimplenciasResponse>(
          `/api/financeiro/inadimplencias?${params}`
        );

        if (!ativo) return;
        setCobrancas(resultado.dados);
        setPaginacao(resultado.paginacao);
        setValorFiltrado(resultado.valorFiltrado);
      } catch (err) {
        if (!ativo) return;
        setCobrancas([]);
        setPaginacao(null);
        setError(mensagemErro(err));
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [filtros, ordenacao, pagina, atualizacao]);

  // Se a última cobrança da página foi quitada, volta para a página anterior.
  useEffect(() => {
    if (!loading && !error && cobrancas.length === 0 && pagina > 1) {
      setPagina(pagina - 1);
    }
  }, [loading, error, cobrancas, pagina]);

  async function marcarComoPaga(cobranca: Inadimplencia) {
    const confirmado = window.confirm(
      `Registrar o pagamento de ${formatCurrency(cobranca.valor)} de ${cobranca.clienteNome}?`
    );
    if (!confirmado) return;

    setPagando(cobranca.id);
    setErroAcao('');

    try {
      await apiFetch(`/api/financeiro/inadimplencias/${cobranca.id}/pagamento`, {
        method: 'PATCH'
      });
      onPagamento(
        `Pagamento de ${formatCurrency(cobranca.valor)} de ${cobranca.clienteNome} registrado.`
      );
    } catch (err) {
      setErroAcao(mensagemErro(err));
    } finally {
      setPagando(null);
    }
  }

  function alterar<K extends keyof FiltrosCobrancas>(campo: K, valor: FiltrosCobrancas[K]) {
    setEntradas((atual) => ({ ...atual, [campo]: valor }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFiltros({ ...entradas, busca: entradas.busca.trim() });
    setPagina(1);
  }

  function handleClear() {
    setEntradas(FILTROS_VAZIOS);
    setFiltros(FILTROS_VAZIOS);
    setPagina(1);
  }

  const filtrando = Object.values(filtros).some((valor) => valor !== '' && valor !== 'todas');

  function textoResumo(total: number) {
    const itens = `${total} cobrança${total === 1 ? '' : 's'} vencida${total === 1 ? '' : 's'}`;
    const encontradas = filtrando ? `${itens} encontrada${total === 1 ? '' : 's'}` : itens;
    return total > 0 ? `${encontradas}, somando ${formatCurrency(valorFiltrado)}` : encontradas;
  }

  return (
    <>
      <form className="search-panel search-panel--inad" role="search" onSubmit={handleSubmit}>
        <div className="field field--wide">
          <label htmlFor="inad-busca">Cliente, CPF ou placa</label>
          <input
            id="inad-busca"
            type="search"
            maxLength={100}
            placeholder="Ex.: Ricardo, 111.222.333-44 ou BRA2E19"
            autoComplete="off"
            value={entradas.busca}
            onChange={(event) => alterar('busca', event.target.value)}
          />
        </div>

        <div className="field field--wide">
          <label htmlFor="inad-faixa">Tempo de atraso</label>
          <select
            id="inad-faixa"
            value={entradas.faixaAtraso}
            onChange={(event) => alterar('faixaAtraso', event.target.value as FaixaAtraso)}
          >
            {(Object.keys(ROTULO_FAIXA) as FaixaAtraso[]).map((faixa) => (
              <option key={faixa} value={faixa}>
                {ROTULO_FAIXA[faixa]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="inad-valor-min">Valor mínimo (R$)</label>
          <input
            id="inad-valor-min"
            type="text"
            inputMode="decimal"
            maxLength={12}
            placeholder="Ex.: 100,00"
            value={entradas.valorMin}
            onChange={(event) => alterar('valorMin', event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="inad-valor-max">Valor máximo (R$)</label>
          <input
            id="inad-valor-max"
            type="text"
            inputMode="decimal"
            maxLength={12}
            placeholder="Ex.: 2.000,00"
            value={entradas.valorMax}
            onChange={(event) => alterar('valorMax', event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="inad-de">Vencimento a partir de</label>
          <input
            id="inad-de"
            type="date"
            value={entradas.vencimentoDe}
            onChange={(event) => alterar('vencimentoDe', event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="inad-ate">Vencimento até</label>
          <input
            id="inad-ate"
            type="date"
            value={entradas.vencimentoAte}
            onChange={(event) => alterar('vencimentoAte', event.target.value)}
          />
        </div>

        <div className="inad-acoes">
          <button className="button button--ghost" type="button" onClick={handleClear}>
            Limpar
          </button>
          <button className="button button--primary" type="submit" disabled={loading}>
            Filtrar
          </button>
        </div>
      </form>

      <section className="panel" aria-labelledby="inad-lista-titulo">
        <header className="panel__header">
          <div>
            <h3 id="inad-lista-titulo">Cobranças vencidas</h3>
            <p className="search-summary">{paginacao ? textoResumo(paginacao.total) : ''}</p>
          </div>

          <div className="inad-ordenar">
            <label htmlFor="inad-ordem">Ordenar por</label>
            <select
              id="inad-ordem"
              value={ordenacao}
              onChange={(event) => {
                setOrdenacao(event.target.value as OrdenacaoCobrancas);
                setPagina(1);
              }}
            >
              {(Object.keys(ROTULO_ORDEM_COBRANCAS) as OrdenacaoCobrancas[]).map((ordem) => (
                <option key={ordem} value={ordem}>
                  {ROTULO_ORDEM_COBRANCAS[ordem]}
                </option>
              ))}
            </select>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando inadimplências..." />}
        {error && <Feedback type="error" message={error} />}
        {erroAcao && <Feedback type="error" message={erroAcao} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Veículo</th>
                <th scope="col">Cobrança</th>
                <th scope="col">Vencimento</th>
                <th scope="col">Atraso</th>
                <th scope="col" className="align-right">Valor</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && cobrancas.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    {filtrando
                      ? 'Nenhuma cobrança vencida corresponde aos filtros.'
                      : semVencidas
                        ? 'Nenhuma cobrança vencida. Todos os clientes estão em dia.'
                        : 'Nenhuma cobrança vencida encontrada.'}
                  </td>
                </tr>
              )}

              {cobrancas.map((cobranca) => (
                <tr key={cobranca.id}>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{cobranca.clienteNome}</strong>
                      <small>
                        {formatCpf(cobranca.clienteCpf)}
                        {cobranca.clienteTelefone ? ` • ${formatPhone(cobranca.clienteTelefone)}` : ''}
                      </small>
                    </span>
                  </td>
                  <td>
                    {cobranca.idVeiculo ? (
                      <span className="person-cell__identity">
                        <Link
                          className="inad-link"
                          to={`/veiculos/${cobranca.idVeiculo}/historico`}
                          title="Ver histórico do veículo"
                        >
                          <strong>{cobranca.placa}</strong>
                        </Link>
                        <small>
                          {cobranca.marca} {cobranca.modelo}
                        </small>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{cobranca.descricao}</td>
                  <td className="nowrap">{formatDate(cobranca.dataVencimento)}</td>
                  <td>
                    <BadgeAtraso dias={cobranca.diasAtraso} />
                  </td>
                  <td className="align-right nowrap">
                    <strong>{formatCurrency(cobranca.valor)}</strong>
                  </td>
                  <td className="align-right">
                    <button
                      className="button button--secondary button--small"
                      type="button"
                      disabled={pagando !== null}
                      onClick={() => marcarComoPaga(cobranca)}
                    >
                      {pagando === cobranca.id ? 'Registrando...' : 'Marcar como paga'}
                    </button>
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
    </>
  );
}

type ListaClientesProps = {
  atualizacao: number;
  semVencidas: boolean;
  onVerCobrancas: (cpf: string) => void;
  onPagamento: (mensagem: string) => void;
};

function ListaClientes({ atualizacao, semVencidas, onVerCobrancas, onPagamento }: ListaClientesProps) {
  const [inputBusca, setInputBusca] = useState('');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoClientes>('maior_valor');
  const [pagina, setPagina] = useState(1);

  const [clientes, setClientes] = useState<ClienteInadimplente[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagandoCliente, setPagandoCliente] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          pagina: String(pagina),
          limite: String(LIMITE),
          busca,
          ordenacao
        });
        const resultado = await apiFetch<ListaClientesInadimplentesResponse>(
          `/api/financeiro/inadimplencias/clientes?${params}`
        );

        if (!ativo) return;
        setClientes(resultado.dados);
        setPaginacao(resultado.paginacao);
      } catch (err) {
        if (!ativo) return;
        setClientes([]);
        setPaginacao(null);
        setError(mensagemErro(err));
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [busca, ordenacao, pagina, atualizacao]);

  // Se o último cliente da página foi quitado, volta para a página anterior.
  useEffect(() => {
    if (!loading && !error && clientes.length === 0 && pagina > 1) {
      setPagina(pagina - 1);
    }
  }, [loading, error, clientes, pagina]);

  async function registrarPagamentoDoCliente(cliente: ClienteInadimplente) {
    const cobrancas = `${cliente.quantidadeCobrancas} cobrança${cliente.quantidadeCobrancas === 1 ? '' : 's'} vencida${cliente.quantidadeCobrancas === 1 ? '' : 's'}`;
    const confirmado = window.confirm(
      `Registrar o pagamento de ${cobrancas} de ${cliente.nome}, somando ${formatCurrency(cliente.valorEmAberto)}?\n\nO cliente deixa de aparecer como inadimplente.`
    );
    if (!confirmado) return;

    setPagandoCliente(cliente.id);
    setErroAcao('');

    try {
      const resposta = await apiFetch<{ mensagem: string }>(
        `/api/financeiro/inadimplencias/clientes/${cliente.id}/pagamento`,
        { method: 'PATCH' }
      );
      onPagamento(`${cliente.nome}: ${resposta.mensagem}`);
    } catch (err) {
      setErroAcao(mensagemErro(err));
    } finally {
      setPagandoCliente(null);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusca(inputBusca.trim());
    setPagina(1);
  }

  function handleClear() {
    setInputBusca('');
    setBusca('');
    setPagina(1);
  }

  function textoResumo(total: number) {
    const itens = `${total} cliente${total === 1 ? '' : 's'} com valores vencidos`;
    return busca ? `${itens} encontrado${total === 1 ? '' : 's'}` : itens;
  }

  return (
    <>
      <form className="search-panel search-panel--clients" role="search" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="inad-cliente-busca">Nome ou CPF do cliente</label>
          <input
            id="inad-cliente-busca"
            type="search"
            maxLength={100}
            placeholder="Ex.: Patrícia ou 444.555.666-77"
            autoComplete="off"
            value={inputBusca}
            onChange={(event) => setInputBusca(event.target.value)}
          />
        </div>
        <button className="button button--primary" type="submit" disabled={loading}>
          Filtrar
        </button>
        <button className="button button--ghost" type="button" onClick={handleClear}>
          Limpar
        </button>
      </form>

      <section className="panel" aria-labelledby="inad-clientes-titulo">
        <header className="panel__header">
          <div>
            <h3 id="inad-clientes-titulo">Clientes com valores em aberto</h3>
            <p className="search-summary">{paginacao ? textoResumo(paginacao.total) : ''}</p>
          </div>

          <div className="inad-ordenar">
            <label htmlFor="inad-cliente-ordem">Ordenar por</label>
            <select
              id="inad-cliente-ordem"
              value={ordenacao}
              onChange={(event) => {
                setOrdenacao(event.target.value as OrdenacaoClientes);
                setPagina(1);
              }}
            >
              {(Object.keys(ROTULO_ORDEM_CLIENTES) as OrdenacaoClientes[]).map((ordem) => (
                <option key={ordem} value={ordem}>
                  {ROTULO_ORDEM_CLIENTES[ordem]}
                </option>
              ))}
            </select>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando clientes..." />}
        {error && <Feedback type="error" message={error} />}
        {erroAcao && <Feedback type="error" message={erroAcao} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Contato</th>
                <th scope="col">Cobranças vencidas</th>
                <th scope="col">Vencimento mais antigo</th>
                <th scope="col">Maior atraso</th>
                <th scope="col" className="align-right">Valor em aberto</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && clientes.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={7}>
                    {busca
                      ? 'Nenhum cliente inadimplente corresponde à busca.'
                      : semVencidas
                        ? 'Nenhum cliente com valores vencidos. Todos estão em dia.'
                        : 'Nenhum cliente inadimplente encontrado.'}
                  </td>
                </tr>
              )}

              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{cliente.nome}</strong>
                      <small>{formatCpf(cliente.cpf)}</small>
                    </span>
                  </td>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{formatPhone(cliente.telefone)}</strong>
                      <small>{cliente.email}</small>
                    </span>
                  </td>
                  <td>{cliente.quantidadeCobrancas}</td>
                  <td className="nowrap">{formatDate(cliente.vencimentoMaisAntigo)}</td>
                  <td>
                    <BadgeAtraso dias={cliente.maiorAtrasoDias} />
                  </td>
                  <td className="align-right nowrap">
                    <strong>{formatCurrency(cliente.valorEmAberto)}</strong>
                  </td>
                  <td className="align-right">
                    <div className="inad-linha-acoes">
                      <button
                        className="button button--secondary button--small"
                        type="button"
                        onClick={() => onVerCobrancas(cliente.cpf)}
                      >
                        Ver cobranças
                      </button>
                      <button
                        className="button button--primary button--small"
                        type="button"
                        disabled={pagandoCliente !== null}
                        onClick={() => registrarPagamentoDoCliente(cliente)}
                      >
                        {pagandoCliente === cliente.id ? 'Registrando...' : 'Cliente pagou'}
                      </button>
                    </div>
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
    </>
  );
}

export default function Inadimplencias() {
  const [visao, setVisao] = useState<Visao>('cobrancas');
  const [buscaInicial, setBuscaInicial] = useState('');
  const [atualizacao, setAtualizacao] = useState(0);
  const [resumo, setResumo] = useState<ResumoInadimplencia | null>(null);
  const [erroResumo, setErroResumo] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativo = true;

    apiFetch<{ dados: ResumoInadimplencia }>('/api/financeiro/inadimplencias/resumo')
      .then((resposta) => {
        if (!ativo) return;
        setResumo(resposta.dados);
        setErroResumo('');
      })
      .catch((err) => {
        if (!ativo) return;
        setResumo(null);
        setErroResumo(mensagemErro(err));
      });

    return () => {
      ativo = false;
    };
  }, [atualizacao]);

  function verCobrancasDoCliente(cpf: string) {
    setBuscaInicial(cpf);
    setVisao('cobrancas');
  }

  function mudarVisao(nova: Visao) {
    if (nova === 'cobrancas') setBuscaInicial('');
    setSucesso('');
    setVisao(nova);
  }

  // Depois de registrar um pagamento, o resumo e a lista são recarregados.
  function pagamentoRegistrado(mensagem: string) {
    setSucesso(mensagem);
    setAtualizacao((n) => n + 1);
  }

  const semVencidas = resumo !== null && resumo.cobrancasVencidas === 0;

  return (
    <Layout
      title="Inadimplências"
      subtitle="Valores em aberto e situação dos pagamentos"
      documentTitle="OficinaDS | Inadimplências"
    >
      <section className="intro">
        <div>
          <h2>Consultar inadimplências</h2>
          <p>
            Acompanhe as cobranças vencidas e ainda não pagas. Filtre por cliente, tempo de
            atraso, valor ou data de vencimento e veja quais clientes têm valores em aberto.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => {
            setSucesso('');
            setAtualizacao((n) => n + 1);
          }}
        >
          ↻ Atualizar
        </button>
      </section>

      {erroResumo && <Feedback type="error" message={erroResumo} />}
      {sucesso && <Feedback type="success" message={sucesso} />}

      <section className="inad-resumo" aria-label="Resumo financeiro">
        <div className="inad-resumo__item inad-resumo__item--destaque">
          <span>Valor em atraso</span>
          <strong>{resumo ? formatCurrency(resumo.valorVencido) : '—'}</strong>
        </div>
        <div className="inad-resumo__item">
          <span>Cobranças vencidas</span>
          <strong>{resumo ? resumo.cobrancasVencidas : '—'}</strong>
        </div>
        <div className="inad-resumo__item">
          <span>Clientes inadimplentes</span>
          <strong>{resumo ? resumo.clientesInadimplentes : '—'}</strong>
        </div>
        <div className="inad-resumo__item">
          <span>Maior atraso</span>
          <strong>{resumo ? textoDias(resumo.maiorAtrasoDias) : '—'}</strong>
        </div>
        <div className="inad-resumo__item">
          <span>A vencer (em dia)</span>
          <strong>{resumo ? formatCurrency(resumo.valorAVencer) : '—'}</strong>
        </div>
      </section>

      <div className="inad-tabs" role="tablist" aria-label="Tipo de consulta">
        <button
          id="inad-aba-cobrancas"
          className="inad-tabs__tab"
          type="button"
          role="tab"
          aria-selected={visao === 'cobrancas'}
          aria-controls="inad-painel"
          onClick={() => mudarVisao('cobrancas')}
        >
          Cobranças vencidas
        </button>
        <button
          id="inad-aba-clientes"
          className="inad-tabs__tab"
          type="button"
          role="tab"
          aria-selected={visao === 'clientes'}
          aria-controls="inad-painel"
          onClick={() => mudarVisao('clientes')}
        >
          Clientes com valores em aberto
        </button>
      </div>

      <div
        id="inad-painel"
        role="tabpanel"
        aria-labelledby={visao === 'cobrancas' ? 'inad-aba-cobrancas' : 'inad-aba-clientes'}
      >
        {visao === 'cobrancas' ? (
          <ListaCobrancas
            key={buscaInicial}
            buscaInicial={buscaInicial}
            atualizacao={atualizacao}
            semVencidas={semVencidas}
            onPagamento={pagamentoRegistrado}
          />
        ) : (
          <ListaClientes
            atualizacao={atualizacao}
            semVencidas={semVencidas}
            onVerCobrancas={verCobrancasDoCliente}
            onPagamento={pagamentoRegistrado}
          />
        )}
      </div>
    </Layout>
  );
}
