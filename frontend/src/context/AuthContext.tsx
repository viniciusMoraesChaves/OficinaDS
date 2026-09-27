import { createContext, useContext, useState, type ReactNode } from 'react';
import { getToken, setToken, clearToken } from '../services/api';

type AuthContextValue = {
  autenticado: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(() => Boolean(getToken()));

  function login(token: string) {
    setToken(token);
    setAutenticado(true);
  }

  function logout() {
    clearToken();
    setAutenticado(false);
  }

  return (
    <AuthContext.Provider value={{ autenticado, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}