import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { EstrelasFixas, EstrelasSeletor } from '../components/EstrelasNota';
import { apiFetch, apiPost } from '../services/api';
import { formatDateTime } from '../utils/format';
import type { AtendimentoAvaliavel } from '../types/avaliacao';
import '../styles/avaliacoes.css';

export default function MinhasAvaliacoes() {
  const [atendimentos, setAtendimentos] = useState<AtendimentoAvaliavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Nota escolhida em cada atendimento ainda não enviado (id do atendimento -> nota).
  const [notas, setNotas] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState<number | null>(null);

  function carregarLista() {
    setLoading(true);
    setErro('');

    apiFetch<{ dados: AtendimentoAvaliavel[] }>('/api/avaliacoes/meus')
      .then((res) => setAtendimentos(res.dados))
      .catch((err) => setErro(err instanceof Error ? err.message : 'Erro ao carregar atendimentos.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    carregarLista();
  }, []);

  async function enviarAvaliacao(atendimento: AtendimentoAvaliavel) {
    const nota = notas[atendimento.id];
    if (!nota) return;

    setEnviando(atendimento.id);
    setErro('');
    setSucesso('');

    try {
      await apiPost('/api/avaliacoes', { idAtendimento: atendimento.id, nota });
      setSucesso(`Avaliação de ${atendimento.funcionarioNome} registrada. Obrigado!`);
      carregarLista();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar a avaliação.');
    } finally {
      setEnviando(null);
    }
  }

  const pendentes = atendimentos.filter((a) => a.nota === null).length;

  return (
    <Layout
      title="Minhas avaliações"
      subtitle="Avalie o funcionário que cuidou do seu atendimento"
      documentTitle="OficinaDS | Minhas avaliações"
    >
      <section className="intro">
        <div>
          <h2>Avalie seus atendimentos</h2>
          <p>
            Depois que o serviço é concluído, dê de 1 a 5 estrelas ao funcionário responsável.
            A avaliação não pode ser alterada depois de enviada.
          </p>
        </div>
      </section>

      {loading && <Feedback type="loading" message="Carregando atendimentos..." />}
      {erro && <Feedback type="error" message={erro} />}
      {sucesso && <Feedback type="success" message={sucesso} />}

      <section className="panel" aria-labelledby="avaliacoes-titulo">
        <header className="panel__header">
          <div>
            <h3 id="avaliacoes-titulo">Atendimentos concluídos</h3>
            <p className="search-summary">
              {pendentes > 0
                ? `${pendentes} aguardando a sua avaliação`
                : 'Nenhuma avaliação pendente'}
            </p>
          </div>
        </header>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Atendimento</th>
                <th scope="col">Veículo</th>
                <th scope="col">Funcionário</th>
                <th scope="col">Sua avaliação</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !erro && atendimentos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={4}>
                    Nenhum atendimento concluído para avaliar ainda. Quando a oficina concluir um
                    serviço, ele aparece aqui.
                  </td>
                </tr>
              )}

              {atendimentos.map((atendimento) => (
                <tr key={atendimento.id}>
                  <td className="nowrap">{formatDateTime(atendimento.criadoEm)}</td>
                  <td>
                    <span className="person-cell__identity">
                      <strong>{atendimento.placa}</strong>
                      <small>
                        {atendimento.marca} {atendimento.modelo}
                      </small>
                    </span>
                  </td>
                  <td>{atendimento.funcionarioNome}</td>
                  <td>
                    {atendimento.nota !== null ? (
                      <span className="avaliacao-enviada">
                        <EstrelasFixas valor={atendimento.nota} tamanho={20} />
                        <small>
                          {atendimento.avaliadoEm
                            ? `Avaliado em ${formatDateTime(atendimento.avaliadoEm)}`
                            : 'Avaliado'}
                        </small>
                      </span>
                    ) : (
                      <div className="avaliacao-form">
                        <EstrelasSeletor
                          legenda={`Nota para ${atendimento.funcionarioNome}`}
                          valor={notas[atendimento.id] ?? null}
                          disabled={enviando !== null}
                          onChange={(nota) =>
                            setNotas((atuais) => ({ ...atuais, [atendimento.id]: nota }))
                          }
                        />
                        <button
                          className="button button--primary button--small"
                          type="button"
                          disabled={!notas[atendimento.id] || enviando !== null}
                          onClick={() => enviarAvaliacao(atendimento)}
                        >
                          {enviando === atendimento.id ? 'Enviando...' : 'Enviar avaliação'}
                        </button>
                      </div>
                    )}
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
