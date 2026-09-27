import { createContext, useContext, useState, type ReactNode } from 'react';
import { getToken, setToken, clearToken, getPerfil, setPerfil, clearPerfil } from '../services/api';
import type { Perfil } from '../types/perfil';

type AuthContextValue = {
  autenticado: boolean;
  perfil: Perfil | null;
  login: (token: string, perfil: Perfil) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(() => Boolean(getToken()));
  const [perfil, setPerfilState] = useState<Perfil | null>(() => getPerfil() as Perfil | null);

  function login(token: string, perfilRecebido: Perfil) {
    setToken(token);
    setPerfil(perfilRecebido);
    setAutenticado(true);
    setPerfilState(perfilRecebido);
  }

  function logout() {
    clearToken();
    clearPerfil();
    setAutenticado(false);
    setPerfilState(null);
  }

  return (
    <AuthContext.Provider value={{ autenticado, perfil, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}