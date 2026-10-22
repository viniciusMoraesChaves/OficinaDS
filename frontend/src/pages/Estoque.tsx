
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { apiFetch } from '../services/api';
import type {
  AlertasEstoqueResponse,
  TodasPecasEstoqueResponse,
  PecaAlerta
} from '../types/estoque';

const estilos: Record<string, CSSProperties> = {
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 24
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '20px 22px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    boxShadow: 'var(--shadow)'
  },
  cardDestaque: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)'
  },
  rotulo: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)'
  },
  rotuloDestaque: { color: 'rgba(32, 33, 31, 0.7)' },
  valor: {
    fontSize: 36,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    color: 'var(--text)'
  },
  legenda: { fontSize: 12, color: 'var(--text-muted)' },
  legendaDestaque: { color: 'rgba(32, 33, 31, 0.7)' },
  selo: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800
  },
  seloAbaixo: {
    color: 'var(--danger)',
    background: 'var(--danger-soft)'
  },
  seloProximo: {
    color: '#865608',
    background: '#fff0cf'
  },
  seloNormal: {
    color: '#166534',
    background: '#dcfce7'
  }
};

export default function Estoque() {
  const [dados, setDados] = useState<AlertasEstoqueResponse | null>(null);
  const [todasPecas, setTodasPecas] = useState<PecaAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [alertas, estoque] = await Promise.all([
        apiFetch<AlertasEstoqueResponse>('/api/estoque/alertas'),
        apiFetch<TodasPecasEstoqueResponse>('/api/estoque/pecas')
      ]);

      setDados(alertas);
      setTodasPecas(estoque.dados);
    } catch (err) {
      setDados(null);
      setTodasPecas([]);
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resumo = dados?.resumo ?? {
    total: 0,
    abaixo: 0,
    proximo: 0
  };

  const pecas = todasPecas;

  return (
    <Layout
      title="Estoque"
      subtitle="Alertas de estoque mínimo"
      documentTitle="OficinaDS | Estoque"
    >
      <section style={estilos.cards}>
        <article style={{ ...estilos.card, ...estilos.cardDestaque }}>
          <span style={{ ...estilos.rotulo, ...estilos.rotuloDestaque }}>
            Em alerta
          </span>
          <strong style={estilos.valor}>{resumo.total}</strong>
          <small style={{ ...estilos.legenda, ...estilos.legendaDestaque }}>
            {resumo.total === 1
              ? 'peça precisa de atenção'
              : 'peças precisam de atenção'}
          </small>
        </article>

        <article style={estilos.card}>
          <span style={estilos.rotulo}>Abaixo do mínimo</span>
          <strong style={{ ...estilos.valor, color: 'var(--danger)' }}>
            {resumo.abaixo}
          </strong>
          <small style={estilos.legenda}>Reposição urgente</small>
        </article>

        <article style={estilos.card}>
          <span style={estilos.rotulo}>Próximas do mínimo</span>
          <strong style={{ ...estilos.valor, color: 'var(--accent-dark)' }}>
            {resumo.proximo}
          </strong>
          <small style={estilos.legenda}>
            Até 20% acima do mínimo
          </small>
        </article>
      </section>

      <section className="panel" aria-labelledby="estoque-title">
        <header className="panel__header">
          <h3 id="estoque-title">Todas as peças</h3>

          <button
            className="button button--secondary"
            type="button"
            disabled={loading}
            onClick={carregar}
          >
            ↻ Atualizar
          </button>
        </header>

        {loading && (
          <Feedback type="loading" message="Carregando peças..." />
        )}

        {error && <Feedback type="error" message={error} />}

        <div className="table-wrapper">
          <table className="data-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th scope="col">Peça</th>
                <th scope="col">Em estoque</th>
                <th scope="col">Mínimo</th>
                <th scope="col">Falta repor</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !error && pecas.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={5}>
                    Nenhuma peça cadastrada no estoque.
                  </td>
                </tr>
              )}

              {pecas.map((p) => {
                const falta = Math.max(
                  p.estoque_minimo - p.quantidade,
                  0
                );

                const abaixo = p.situacao === 'ABAIXO';
                const proximo = p.situacao === 'PROXIMO';

                return (
                  <tr key={p.id_peca}>
                    <td>
                      <strong style={{ color: 'var(--text)' }}>
                        {p.nome}
                      </strong>
                    </td>

                    <td className="nowrap">{p.quantidade}</td>
                    <td className="nowrap">{p.estoque_minimo}</td>

                    <td className="nowrap">
                      {falta > 0 ? falta : '—'}
                    </td>

                    <td>
                      <span
                        style={{
                          ...estilos.selo,
                          ...(abaixo
                            ? estilos.seloAbaixo
                            : proximo
                              ? estilos.seloProximo
                              : estilos.seloNormal)
                        }}
                      >
                        {abaixo
                          ? 'Abaixo'
                          : proximo
                            ? 'Próximo'
                            : 'Normal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
