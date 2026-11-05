import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';

interface Notificacao {
  id: string;
  titulo: string;
  detalhe: string;
  tipo: 'danger' | 'warning';
  destino: string;
}

const INTERVALO_MS = 60_000;

const s: Record<string, CSSProperties> = {
  raiz: { position: 'relative' },
  botao: {
    position: 'relative',
    width: 40,
    height: 40,
    display: 'grid',
    placeItems: 'center',
    border: '1px solid var(--border)',
    borderRadius: 9,
    background: 'var(--surface)',
    color: 'var(--text)',
    cursor: 'pointer'
  },
  ponto: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    background: 'var(--accent)',
    color: '#231d0f',
    fontSize: 10,
    fontWeight: 800
  },
  painel: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    zIndex: 30,
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.16)',
    overflow: 'hidden'
  },
  cabecalho: {
    padding: '14px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 14,
    fontWeight: 700
  },
  lista: { maxHeight: 360, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' },
  item: {
    display: 'flex',
    gap: 12,
    width: '100%',
    padding: '12px 16px',
    border: 0,
    borderBottom: '1px solid var(--border)',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    font: 'inherit'
  },
  marca: { flex: '0 0 auto', width: 8, height: 8, marginTop: 6, borderRadius: '50%' },
  titulo: { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  detalhe: { display: 'block', marginTop: 3, fontSize: 12, color: 'var(--text-muted)' },
  vazio: {
    margin: 0,
    padding: '28px 16px',
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-muted)'
  }
};

export function NotificacoesMenu() {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const raizRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await apiFetch<{ dados: Notificacao[] }>('/api/notificacoes');
      setItens(r.dados);
    } catch {
      setItens([]);
    }
  }, []);

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return;

    function fora(e: MouseEvent) {
      if (!raizRef.current?.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  function abrirItem(destino: string) {
    setAberto(false);
    navigate(destino);
  }

  return (
    <div ref={raizRef} style={s.raiz}>
      <button
        type="button"
        style={s.botao}
        aria-label={`Notificações${itens.length ? `, ${itens.length} novas` : ''}`}
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => {
          if (!aberto) carregar();
          setAberto((v) => !v);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {itens.length > 0 && <span style={s.ponto}>{itens.length}</span>}
      </button>

      {aberto && (
        <div style={s.painel} role="dialog" aria-label="Central de notificações">
          <div style={s.cabecalho}>Notificações</div>

          {itens.length === 0 ? (
            <p style={s.vazio}>Tudo em dia. Nenhuma notificação.</p>
          ) : (
            <ul style={s.lista}>
              {itens.map((n) => (
                <li key={n.id}>
                  <button type="button" style={s.item} onClick={() => abrirItem(n.destino)}>
                    <span
                      style={{
                        ...s.marca,
                        background: n.tipo === 'danger' ? 'var(--danger)' : 'var(--accent)'
                      }}
                    />
                    <span>
                      <strong style={s.titulo}>{n.titulo}</strong>
                      <small style={s.detalhe}>{n.detalhe}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}