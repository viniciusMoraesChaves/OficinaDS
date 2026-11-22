import type { StatusAtendimento as Status } from '../types/historico';
import { chaveStatus } from '../utils/historicoFormat';

const ESTILOS = `
.hv-status {
  display: inline-flex; align-items: center; gap: 6px; flex: none;
  padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap;
  color: #374151; background: #e5e7eb;
}
.hv-status__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.hv-status--ok { color: #15803d; background: #dcfce7; }
.hv-status--prog { color: #1d4ed8; background: #dbeafe; }
.hv-status--wait { color: #6d28d9; background: #ede9fe; }
.hv-status--cancel { color: #b91c1c; background: #fee2e2; }
`;

export function EstilosStatusAtendimento() {
  return <style>{ESTILOS}</style>;
}

export default function StatusAtendimento({ status }: { status: Status }) {
  return (
    <span className={`hv-status hv-status--${chaveStatus(status)}`}>
      <span className="hv-status__dot" aria-hidden="true" />
      {status}
    </span>
  );
}