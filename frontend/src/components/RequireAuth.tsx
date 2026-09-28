import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Perfil } from '../types/perfil';

type RequireAuthProps = {
  children: ReactNode;
  // Se informado, só libera a página para esses perfis. Sem esta prop,
  // basta estar logado (qualquer perfil).
  perfis?: Perfil[];
};

export function RequireAuth({ children, perfis }: RequireAuthProps) {
  const { autenticado, perfil } = useAuth();

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (perfis && (!perfil || !perfis.includes(perfil))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}