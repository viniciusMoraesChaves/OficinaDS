import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { formatDateTime } from '../utils/format';
import { PERFIS, type Perfil } from '../types/perfil';
import type { IndicadorPainel, SecaoPendencia, PainelResponse } from '../types/painel';
import '../styles/painel.css';

type Acao = { rotulo: string; to: string };

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
  [PERFIS.CLIENTE]: [{ rotulo: 'Ver meus orçamentos', to: '/meus-orcamentos' }]
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

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { dados } = await apiFetch<PainelResponse>('/api/painel');
      setNome(dados.usuario.nome);
      setIndicadores(dados.indicadores);
      setPendencias(dados.pendencias);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const agora = new Date();
  const primeiroNome = nome ? nome.split(' ')[0] : perfil;
  const acoes = perfil ? ACOES_POR_PERFIL[perfil] : [];

  return (
    <Layout title="Início" subtitle="Resumo do dia" documentTitle="OficinaDS | Início">
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
    </Layout>
  );
}
