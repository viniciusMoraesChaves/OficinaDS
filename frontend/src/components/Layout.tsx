import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PERFIS, type Perfil } from '../types/perfil';

type LayoutProps = {
  title: string;
  subtitle: string;
  documentTitle: string;
  children: ReactNode;
};

type LinkItem = { to: string; label: string; icon: string; end?: boolean };
type Grupo = { titulo?: string; links: LinkItem[] };

const inicio: LinkItem = { to: '/', label: 'Início', icon: '⌂', end: true };

const operacao: Grupo = {
  titulo: 'Operação',
  links: [
    { to: '/atendimentos', label: 'Atendimentos', icon: '🔧' },
    { to: '/agendamentos', label: 'Agendamentos', icon: '◷' },
    { to: '/diagnosticos', label: 'Diagnósticos', icon: '⌕' }
  ]
};

const cadastros: Grupo = {
  titulo: 'Cadastros',
  links: [
    { to: '/clientes', label: 'Clientes', icon: '♙' },
    { to: '/veiculos', label: 'Veículos', icon: '🚗' },
    { to: '/estoque', label: 'Estoque', icon: '▤' }
  ]
};

const administracao: Grupo = {
  titulo: 'Administração',
  links: [
    { to: '/funcionarios', label: 'Funcionários', icon: '⚙' },
    { to: '/usuarios', label: 'Usuários', icon: '☺' },
    { to: '/financeiro', label: 'Financeiro', icon: '$' }
  ]
};

const gruposPorPerfil: Record<Perfil, Grupo[]> = {
  [PERFIS.ADMINISTRADOR]: [{ links: [inicio] }, operacao, cadastros, administracao],
  [PERFIS.FUNCIONARIO]: [{ links: [inicio] }, operacao, cadastros],
  [PERFIS.CLIENTE]: [
    { links: [inicio, { to: '/meus-orcamentos', label: 'Meus orçamentos', icon: '🧾' }] }
  ]
};

export function Layout({ title, subtitle, documentTitle, children }: LayoutProps) {
  const [open, setOpen] = useState(false);
  const { perfil, logout } = useAuth();
  const grupos = perfil ? gruposPorPerfil[perfil] : [];

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

        <nav className="sidebar__nav">
          {grupos.map((grupo, indice) => (
            <div key={grupo.titulo ?? `grupo-${indice}`}>
              {grupo.titulo && <p className="sidebar__section-label">{grupo.titulo}</p>}
              {grupo.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end ?? false}
                  className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="sidebar__icon" aria-hidden="true">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="avatar">{(perfil ?? '?').slice(0, 2).toUpperCase()}</span>
            <span className="sidebar__user-copy">
              <strong>{perfil ?? 'Sem perfil'}</strong>
            </span>
          </div>
          <button className="sidebar__logout" type="button" onClick={logout}>
            Sair
          </button>
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
