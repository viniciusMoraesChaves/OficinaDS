import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Wrench, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { formatCpf, formatDateTime, formatPhone } from '../utils/format';
import { PERFIS, type Perfil } from '../types/perfil';
import type {
  ClientePesquisaGlobal,
  IndicadorPainel,
  OrdemServicoPesquisaGlobal,
  PainelResponse,
  PesquisaGlobalResponse,
  SecaoPendencia,
} from '../types/painel';
import '../styles/painel.css';

type Acao = { rotulo: string; to: string };
type AtendimentoCliente = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  status: string;
  etapaAtual: string | null;
  previsaoConclusao: string | null;
};

const ACOES_POR_PERFIL: Record<Perfil, Acao[]> = {
  [PERFIS.ADMINISTRADOR]: [
    { rotulo: 'Novo atendimento', to: '/atendimentos?novo=1' },
    { rotulo: 'Agendar serviço', to: '/agendamentos' },
    { rotulo: 'Consultar estoque', to: '/estoque' },
    { rotulo: 'Gerenciar equipe', to: '/funcionarios' }
  ],
  [PERFIS.FUNCIONARIO]: [
    { rotulo: 'Novo atendimento', to: '/atendimentos?novo=1' },
    { rotulo: 'Agendar serviço', to: '/agendamentos' },
    { rotulo: 'Registrar diagnóstico', to: '/diagnosticos' },
    { rotulo: 'Consultar estoque', to: '/estoque' }
  ],
  [PERFIS.CLIENTE]: [
    { rotulo: 'Ver meus orçamentos', to: '/meus-orcamentos' },
    { rotulo: 'Ver meus agendamentos', to: '/meus-agendamentos' }
  ]
};

function saudacao(hora: number) {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataPorExtenso(data: Date) {
  const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Home() {
  const { perfil } = useAuth();

  const [nome, setNome] = useState<string | null>(null);
  const [indicadores, setIndicadores] = useState<IndicadorPainel[]>([]);
  const [pendencias, setPendencias] = useState<SecaoPendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [atendimentos, setAtendimentos] = useState<AtendimentoCliente[]>([]);

  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<ClientePesquisaGlobal[]>([]);
  const [ordensEncontradas, setOrdensEncontradas] = useState<OrdemServicoPesquisaGlobal[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { dados } = await apiFetch<PainelResponse>('/api/painel');
      setNome(dados.usuario.nome);
      setIndicadores(dados.indicadores);
      setPendencias(dados.pendencias);
      if (perfil === PERFIS.CLIENTE) {
        const resposta = await apiFetch<{ dados: AtendimentoCliente[] }>(
          '/api/atendimentos/meus'
        );

        setAtendimentos(resposta.dados);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o painel.');
    } finally {
      setLoading(false);
    }
  }, [perfil]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const isEquipe = perfil === PERFIS.ADMINISTRADOR || perfil === PERFIS.FUNCIONARIO;

  useEffect(() => {
    if (!isEquipe) return;

    const q = termoPesquisa.trim();
    if (q.length < 2) {
      setClientesEncontrados([]);
      setOrdensEncontradas([]);
      setPesquisando(false);
      return;
    }

    let cancelled = false;
    setPesquisando(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        const { dados } = await apiFetch<PesquisaGlobalResponse>(
          `/api/painel/pesquisa?${params}`
        );
        if (cancelled) return;
        setClientesEncontrados(dados.clientes);
        setOrdensEncontradas(dados.ordensServico);
      } catch {
        if (cancelled) return;
        setClientesEncontrados([]);
        setOrdensEncontradas([]);
      } finally {
        if (!cancelled) setPesquisando(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [termoPesquisa, isEquipe]);

  const agora = new Date();
  const primeiroNome = nome ? nome.split(' ')[0] : perfil;
  const acoes = perfil ? ACOES_POR_PERFIL[perfil] : [];
  const buscaAtiva = termoPesquisa.trim().length >= 2;

  return (
    <Layout title="Início" subtitle="Resumo do dia" documentTitle="OficinaDS | Início">
      {isEquipe && (
        <section aria-label="Pesquisa rápida" style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '14px',
                color: '#9ca3af',
                pointerEvents: 'none',
              }}
            />
            <input
              id="pesquisa-global-inicio"
              type="search"
              aria-label="Pesquisar clientes e ordens de serviço"
              placeholder="Pesquisar cliente (nome, CPF, telefone) ou OS (número, placa, problema)..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              autoComplete="off"
              style={{
                width: '100%',
                height: '42px',
                padding: '0 38px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem',
                color: '#111827',
                outline: 'none',
              }}
            />
            {termoPesquisa && (
              <button
                type="button"
                onClick={() => setTermoPesquisa('')}
                aria-label="Limpar pesquisa"
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'inline-flex',
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {buscaAtiva && (
            <div className="panel" style={{ marginTop: '10px', padding: '16px 20px' }}>
              {pesquisando ? (
                <p className="painel-vazio" style={{ margin: 0 }}>Buscando...</p>
              ) : clientesEncontrados.length === 0 && ordensEncontradas.length === 0 ? (
                <p className="painel-vazio" style={{ margin: 0 }}>
                  Nenhum cliente ou ordem de serviço encontrado para “{termoPesquisa.trim()}”.
                </p>
              ) : (
                <div className="painel-pendencias" style={{ marginTop: 0 }}>
                  <div>
                    <h4
                      style={{
                        margin: '0 0 8px',
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <User size={14} aria-hidden="true" />
                      Clientes ({clientesEncontrados.length})
                    </h4>
                    {clientesEncontrados.length === 0 ? (
                      <p className="painel-vazio" style={{ margin: 0 }}>Nenhum cliente encontrado.</p>
                    ) : (
                      <ul className="painel-lista">
                        {clientesEncontrados.map((c) => (
                          <li key={c.id}>
                            <Link to={`/clientes?busca=${encodeURIComponent(c.nome)}`}>
                              <strong>{c.nome}</strong>
                              <span>
                                CPF: {formatCpf(c.cpf)}
                                {c.telefone ? ` • ${formatPhone(c.telefone)}` : ''}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4
                      style={{
                        margin: '0 0 8px',
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Wrench size={14} aria-hidden="true" />
                      Ordens de serviço ({ordensEncontradas.length})
                    </h4>
                    {ordensEncontradas.length === 0 ? (
                      <p className="painel-vazio" style={{ margin: 0 }}>
                        Nenhuma ordem de serviço encontrada.
                      </p>
                    ) : (
                      <ul className="painel-lista">
                        {ordensEncontradas.map((os) => (
                          <li key={os.id}>
                            <Link to="/atendimentos">
                              <strong>
                                OS #{os.id} — {os.cliente} ({os.placa})
                              </strong>
                              <span>
                                {os.marca} {os.modelo}
                                {os.descricaoProblema ? ` • ${os.descricaoProblema}` : ''}
                              </span>
                              <small>Status: {os.status}</small>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="painel-saudacao">
        <div>
          <h2>
            {saudacao(agora.getHours())}
            {primeiroNome ? `, ${primeiroNome}` : ''}
          </h2>
          <p>{dataPorExtenso(agora)}</p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          disabled={loading}
          onClick={carregar}
        >
          ↻ Atualizar
        </button>
      </section>

      <nav className="painel-acoes" aria-label="Ações rápidas">
        {acoes.map((acao, indice) => (
          <Link
            key={acao.to}
            className={`button ${indice === 0 ? 'button--primary' : 'button--secondary'}`}
            to={acao.to}
          >
            {acao.rotulo}
          </Link>
        ))}
      </nav>

      {loading && <Feedback type="loading" message="Carregando painel..." />}
      {error && <Feedback type="error" message={error} />}

      {!error && indicadores.length > 0 && (
        <section className="painel-indicadores" aria-label="Indicadores">
          {indicadores.map((indicador) => (
            <Link
              key={indicador.chave}
              className={`painel-card ${indicador.atencao ? 'painel-card--atencao' : ''}`}
              to={indicador.link}
            >
              <span className="painel-card__rotulo">{indicador.rotulo}</span>
              <strong className="painel-card__valor">{indicador.valor}</strong>
              <small>{indicador.ajuda}</small>
            </Link>
          ))}
        </section>
      )}

      {!error && pendencias.length > 0 && (
        <section className="painel-pendencias" aria-label="Pendências">
          {pendencias.map((secao) => (
            <article className="panel" key={secao.chave}>
              <header className="panel__header">
                <div>
                  <h3>{secao.titulo}</h3>
                </div>
                <Link className="painel-ver-tudo" to={secao.link}>
                  Ver tudo
                </Link>
              </header>

              {secao.itens.length === 0 ? (
                <p className="painel-vazio">{secao.vazio}</p>
              ) : (
                <ul className="painel-lista">
                  {secao.itens.map((item) => (
                    <li key={item.id}>
                      <Link to={secao.link}>
                        <strong>{item.titulo}</strong>
                        <span>{item.detalhe}</span>
                        {item.data && <small>{formatDateTime(item.data)}</small>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}
      {perfil === PERFIS.CLIENTE && !loading && !error && (
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Meus veículos em atendimento</h3>
              <p>Acompanhe o progresso dos serviços da oficina.</p>
            </div>
          </header>

          {atendimentos.length === 0 ? (
            <p className="painel-vazio">
              Você não possui veículos em atendimento no momento.
            </p>
          ) : (
            <ul className="painel-lista">
              {atendimentos.map((atendimento) => (
                <li key={atendimento.id}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px 18px',
                      width: '100%'
                    }}
                  >
                    <strong>
                      {atendimento.marca} {atendimento.modelo}
                    </strong>

                    <span>Placa: {atendimento.placa}</span>

                    <span>
                      Etapa atual: {atendimento.etapaAtual || 'Não informada'}
                    </span>
                    <span>
                      Previsão de conclusão:{' '}
                      {atendimento.previsaoConclusao
                        ? new Date(atendimento.previsaoConclusao).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })
                        : 'Não informada'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Layout>
  );
}