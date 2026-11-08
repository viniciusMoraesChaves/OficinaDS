import type { StatusAgendamento } from '../types/agendamento';

const CLASSE_POR_STATUS: Record<StatusAgendamento, string> = {
  Agendado: 'is-scheduled',
  Confirmado: 'is-active',
  'Em atendimento': 'is-progress',
  Concluído: 'is-done',
  Cancelado: 'is-inactive',
};

export function AgendamentoStatusBadge({ status }: { status: StatusAgendamento }) {
  return (
    <span className={`status-badge ${CLASSE_POR_STATUS[status] ?? 'is-done'}`}>
      {status}
    </span>
  );
}
