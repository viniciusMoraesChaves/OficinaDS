import type { StatusPedido } from '../types/pedidoPeca';

const VISUAL_POR_STATUS: Record<StatusPedido, { classe: string; rotulo: string }> = {
  rascunho: { classe: 'is-done', rotulo: 'Rascunho' },
  enviado: { classe: 'is-scheduled', rotulo: 'Aguardando decisão' },
  aprovado: { classe: 'is-active', rotulo: 'Aprovado' },
  rejeitado: { classe: 'is-inactive', rotulo: 'Rejeitado' },
};

export function PedidoStatusBadge({ status }: { status: StatusPedido }) {
  const visual = VISUAL_POR_STATUS[status] ?? { classe: 'is-done', rotulo: status };

  return <span className={`status-badge ${visual.classe}`}>{visual.rotulo}</span>;
}
