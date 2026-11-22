import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  apiFetch,
  getToken,
  setToken,
  clearToken,
  getPerfil,
  setPerfil,
  clearPerfil,
  EVENTO_SESSAO_EXPIRADA
} from '../services/api';
import { PERFIS, type Perfil } from '../types/perfil';

type AuthContextValue = {
  autenticado: boolean;
  // true enquanto o perfil real (vindo do servidor) ainda está sendo confirmado
  carregando: boolean;
  perfil: Perfil | null;
  login: (token: string, perfil: Perfil) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function perfilValido(valor: string | null): Perfil | null {
  return Object.values(PERFIS).includes(valor as Perfil) ? (valor as Perfil) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(() => Boolean(getToken()));
  const [perfil, setPerfilState] = useState<Perfil | null>(() => perfilValido(getPerfil()));
  // Com token salvo, o perfil guardado no navegador é só um palpite: o servidor decide.
  const [carregando, setCarregando] = useState(() => Boolean(getToken()));

  function login(token: string, perfilRecebido: Perfil) {
    setToken(token);
    setPerfil(perfilRecebido);
    setAutenticado(true);
    setPerfilState(perfilRecebido);
    setCarregando(false);
  }

  function logout() {
    clearToken();
    clearPerfil();
    setAutenticado(false);
    setPerfilState(null);
    setCarregando(false);
  }

  // Ao abrir/recarregar a página, confirma o perfil real no servidor.
  useEffect(() => {
    if (!getToken()) return;

    let cancelado = false;

    apiFetch<{ dados: { perfil: string } }>('/api/me')
      .then(({ dados }) => {
        if (cancelado) return;
        const real = perfilValido(dados.perfil);
        if (!real) {
          logout();
          return;
        }
        setPerfil(real);
        setPerfilState(real);
      })
      .catch(() => {
        // 401 já é tratado pelo evento de sessão expirada; em falha de rede
        // mantém o último perfil conhecido.
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    function aoExpirar() {
      logout();
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  return (
    <AuthContext.Provider value={{ autenticado, carregando, perfil, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}
