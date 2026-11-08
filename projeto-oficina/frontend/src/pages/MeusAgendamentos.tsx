import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Feedback } from '../components/Feedback';
import { AgendamentoStatusBadge } from '../components/AgendamentoStatusBadge';
import { apiFetch } from '../services/api';
import { formatDateTime } from '../utils/format';
import type { AgendamentoCliente } from '../types/agendamento';

export default function MeusAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    apiFetch<{ dados: AgendamentoCliente[] }>('/api/agendamentos/meus')
      .then((res) => setAgendamentos(res.dados))
      .catch((err) =>
        setErro(err instanceof Error ? err.message : 'Erro ao carregar seus agendamentos.')
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout
      title="Meus agendamentos"
      subtitle="Acompanhe os serviços agendados para o seu veículo"
      documentTitle="OficinaDS | Meus agendamentos"
    >
      <section className="intro">
        <div>
          <span className="story-label">Agendamentos</span>
          <h2>Seus serviços agendados</h2>
          <p>
            Veja a data, o horário e a situação de cada serviço. Para marcar ou alterar um
            horário, fale com a oficina.
          </p>
        </div>
      </section>

      <section className="panel" aria-labelledby="meus-agendamentos-title">
        <header className="panel__header">
          <div>
            <h3 id="meus-agendamentos-title">Agendamentos</h3>
            <p>
              {agendamentos.length} registro{agendamentos.length === 1 ? '' : 's'} no total
            </p>
          </div>
        </header>

        {loading && <Feedback type="loading" message="Carregando seus agendamentos..." />}
        {erro && <Feedback type="error" message={erro} />}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Serviço / veículo</th>
                <th scope="col">Data e hora</th>
                <th scope="col">Responsável</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !erro && agendamentos.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={4}>
                    Você ainda não tem agendamentos.
                  </td>
                </tr>
              )}

              {agendamentos.map((agendamento) => (
                <tr key={agendamento.id}>
                  <td>
                    <span className="order-code">AG-{agendamento.id}</span>
                    <strong className="table-primary">{agendamento.servico}</strong>
                    <small className="table-secondary">
                      {agendamento.marca} {agendamento.modelo} • {agendamento.placa}
                    </small>
                  </td>
                  <td className="nowrap">
                    {formatDateTime(agendamento.dataHora)}
                    {agendamento.qtdReagendamentos > 0 && (
                      <small className="table-secondary">
                        Reagendado {agendamento.qtdReagendamentos}x
                      </small>
                    )}
                  </td>
                  <td>{agendamento.funcionario}</td>
                  <td>
                    <AgendamentoStatusBadge status={agendamento.status} />
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
