import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

type LayoutProps = {
  title: string;
  subtitle: string;
  documentTitle: string;
  children: ReactNode;
};

const links = [
  { to: '/', label: 'Início', icon: '⌂', end: true },
  { to: '/clientes', label: 'Clientes', icon: '♙', end: false },
  { to: '/funcionarios', label: 'Funcionários', icon: '⚙', end: false },
];

export function Layout({ title, subtitle, documentTitle, children }: LayoutProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Menu principal">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand__mark" aria-hidden="true">⌕</span>
          <span className="brand__text">
            <strong>OficinaDS</strong>
            <small>Auto Repair Suite</small>
          </span>
        </Link>

        <p className="sidebar__section-label">Seu módulo</p>
        <nav className="sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="sidebar__icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="avatar">SO</span>
            <span className="sidebar__user-copy">
              <strong>Seu módulo</strong>
              <small>Sprint atual</small>
            </span>
          </div>
        </div>
      </aside>

      <div
        className={`sidebar-backdrop ${open ? 'is-visible' : ''}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <main className="page">
        <header className="topbar">
          <button
            className="menu-button"
            type="button"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="topbar__title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}