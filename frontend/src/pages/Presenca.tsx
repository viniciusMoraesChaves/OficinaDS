import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch, apiPost } from '../services/api';
import { formatDate } from '../utils/format';
import type {
  FuncionarioPresenca,
  FuncionariosPresencaResponse,
  ListaPresencasResponse,
  Presenca,
  PresentesResponse,
  ResumoPresenca,
  SituacaoHoje,
  SituacaoPeriodo
} from '../types/presenca';
import '../styles/presenca.css';

const RESUMO_VAZIO: ResumoPresenca = { compareceram: 0, registros: 0, semSaida: 0 };

const ROTULO_PERIODO: Record<SituacaoPeriodo, string> = {
  presente: 'Presente',
  saiu: 'Saiu',
  sem_saida: 'Saída não registrada'
};

const ROTULO_HOJE: Record<SituacaoHoje, string> = {
  presente: 'Presente',
  saiu: 'Já saiu hoje',
  ausente: 'Ainda não chegou'
};

function hojeLocal() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function hora(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function duracao(minutos: number | null) {
  if (minutos === null || Number.isNaN(minutos)) return '—';
  const horas = Math.floor(minutos / 60);
  const resto = String(minutos % 60).padStart(2, '0');
  return horas > 0 ? `${horas}h${resto}` : `${minutos} min`;
}

export default function PresencaPage() {
  const [data, setData] = useState(hojeLocal);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [resumo, setResumo] = useState<ResumoPresenca>(RESUMO_VAZIO);
  const [presentes, setPresentes] = useState<Presenca[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioPresenca[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [registrandoId, setRegistrandoId] = useState<number | null>(null);

  const hoje = hojeLocal();
  const ehHoje = data === hoje;

  // Muda quando é preciso buscar os dados de novo (botão Atualizar, entrada ou saída).
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      apiFetch<ListaPresencasResponse>(`/api/presencas?data=${data}`),
      apiFetch<PresentesResponse>('/api/presencas/presentes'),
      apiFetch<FuncionariosPresencaResponse>('/api/presencas/funcionarios')
    ])
      .then(([lista, agora, ativos]) => {
        if (!ativo) return;
        setPresencas(lista.dados);
        setResumo(lista.resumo);
        setPresentes(agora.dados);
        setFuncionarios(ativos.dados);
        setError('');
      })
      .catch((err) => {
        if (!ativo) return;
        setError(err instanceof Error ? err.message : 'Não foi possível carregar a presença.');
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [data, versao]);

  function recarregar() {
    setLoading(true);
    setVersao((atual) => atual + 1);
  }

  function trocarData(nova: string) {
    setLoading(true);
    setData(nova);
  }

  async function registrar(funcionario: FuncionarioPresenca, acao: 'entrada' | 'saida') {
    setRegistrandoId(funcionario.id);
    setError('');
    setSucesso('');

    try {
      await apiPost(`/api/presencas/${acao}`, { idFuncionario: funcionario.id });
      setSucesso(
        acao === 'entrada'
          ? `Entrada de ${funcionario.nome} registrada.`
          : `Saída de ${funcionario.nome} registrada.`
      );
      recarregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar.');
    } finally {
      setRegistrandoId(null);
    }
  }

  return (
    <Layout
      title="Presença"
      subtitle="Acesso restrito ao Administrador"
      documentTitle="OficinaDS | Presença dos funcionários"
    >
      <section className="intro">
        <div>
          <h2>Presença dos funcionários</h2>
          <p>
            Registre a entrada e a saída da equipe, veja quem está presente agora e consulte quem
            compareceu em uma data.
          </p>
        </div>
        <button className="button button--secondary" type="button" disabled={loading} onClick={recarregar}>
          ↻ Atualizar
        </button>
      </section>

      <Feedback type="success" message={sucesso} />
      <Feedback type="error" message={error} />

      <section className="presenca-resumo" aria-label="Resumo">
        <div className="presenca-resumo__item">
          <span>Presentes agora</span>
          <strong>{presentes.length}</strong>
          <small>Entraram hoje e ainda não saíram</small>
        </div>
        <div className="presenca-resumo__item">
          <span>{ehHoje ? 'Compareceram hoje' : `Compareceram em ${formatDate(data)}`}</span>
          <strong>{resumo.compareceram}</strong>
          <small>Funcionários diferentes na data</small>
        </div>
        <div className="presenca-resumo__item">
          <span>Registros na data</span>
          <strong>{resumo.registros}</strong>
          <small>
            {resumo.semSaida > 0
              ? `${resumo.semSaida} sem saída registrada`
              : 'Entradas registradas'}
          </small>
        </div>
      </section>

      <section className="panel" aria-labelledby="presentes-title">
        <header className="panel__header">
          <div>
            <h3 id="presentes-title">Presentes agora</h3>
            <p className="search-summary">Quem está na oficina neste momento.</p>
          </div>
        </header>

        {presentes.length === 0 ? (
          <p className="presenca-vazio">Nenhum funcionário presente no momento.</p>
        ) : (
          <ul className="presenca-presentes">
            {presentes.map((item) => (
              <li key={item.id}>
                <strong>{item.nome}</strong>
                <small>
                  {item.cargo} • desde {hora(item.entradaEm)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="registrar-title" style={{ marginTop: '18px' }}>
        <header className="panel__header">
          <div>
            <h3 id="registrar-title">Registrar presença</h3>
            <p className="search-summary">
              O horário é o do momento do clique. Funcionários inativos não aparecem aqui.
            </p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Funcionário</th>
                <th scope="col">Hoje</th>
                <th scope="col">Ação</th>
              </tr>
            </thead>
            <tbody>
              {!loading && funcionarios.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={3}>
                    Nenhum funcionário ativo cadastrado.
                  </td>
                </tr>
              )}

              {funcionarios.map((funcionario) => (
                <tr key={funcionario.id}>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{funcionario.nome}</strong>
                      <small>{funcionario.cargo}</small>
                    </span>
                  </td>
                  <td>
                    <span className={`presenca-badge presenca-badge--${funcionario.situacao}`}>
                      {funcionario.situacao === 'presente'
                        ? `Presente desde ${hora(funcionario.presenteDesde)}`
                        : ROTULO_HOJE[funcionario.situacao]}
                    </span>
                  </td>
                  <td>
                    {funcionario.situacao === 'presente' ? (
                      <button
                        className="button button--secondary"
                        type="button"
                        disabled={registrandoId !== null}
                        onClick={() => registrar(funcionario, 'saida')}
                      >
                        {registrandoId === funcionario.id ? 'Registrando...' : 'Registrar saída'}
                      </button>
                    ) : (
                      <button
                        className="button button--primary"
                        type="button"
                        disabled={registrandoId !== null}
                        onClick={() => registrar(funcionario, 'entrada')}
                      >
                        {registrandoId === funcionario.id
                          ? 'Registrando...'
                          : funcionario.situacao === 'saiu'
                            ? 'Registrar nova entrada'
                            : 'Registrar entrada'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="presenca-data" style={{ marginTop: '24px' }}>
        <div className="field">
          <label htmlFor="presenca-data">Consultar comparecimento em</label>
          <input
            id="presenca-data"
            type="date"
            max={hoje}
            value={data}
            onChange={(event) => {
              if (event.target.value) trocarData(event.target.value);
            }}
          />
        </div>
        <button
          className="button button--ghost"
          type="button"
          disabled={ehHoje}
          onClick={() => trocarData(hojeLocal())}
        >
          Hoje
        </button>
      </div>

      <section className="panel" aria-labelledby="comparecimentos-title">
        <header className="panel__header">
          <div>
            <h3 id="comparecimentos-title">
              Comparecimentos {ehHoje ? 'de hoje' : `de ${formatDate(data)}`}
            </h3>
            <p className="search-summary">
              {resumo.compareceram} funcionário{resumo.compareceram === 1 ? '' : 's'} •{' '}
              {resumo.registros} registro{resumo.registros === 1 ? '' : 's'}
            </p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Funcionário</th>
                <th scope="col">Entrada</th>
                <th scope="col">Saída</th>
                <th scope="col">Tempo</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && presencas.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    Nenhum funcionário compareceu nesta data.
                  </td>
                </tr>
              )}

              {presencas.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{item.nome}</strong>
                      <small>{item.cargo}</small>
                    </span>
                  </td>
                  <td className="nowrap">{hora(item.entradaEm)}</td>
                  <td className="nowrap">{hora(item.saidaEm)}</td>
                  <td className="nowrap">{duracao(item.minutos)}</td>
                  <td>
                    <span className={`presenca-badge presenca-badge--${item.situacao}`}>
                      {ROTULO_PERIODO[item.situacao]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
