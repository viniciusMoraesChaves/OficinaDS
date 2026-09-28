export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`status-badge ${active ? 'is-active' : 'is-inactive'}`}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}