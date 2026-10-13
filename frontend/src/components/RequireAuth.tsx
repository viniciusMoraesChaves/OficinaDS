import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PERFIS, type Perfil } from '../types/perfil';

type RequireAuthProps = {
  children: ReactNode;
  // Se informado, só libera a página para esses perfis (o Administrador
  // sempre tem acesso). Sem esta prop, basta estar logado (qualquer perfil).
  perfis?: Perfil[];
};

export function RequireAuth({ children, perfis }: RequireAuthProps) {
  const { autenticado, carregando, perfil } = useAuth();

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  // Evita decidir permissão (e redirecionar) antes de saber o perfil real.
  if (carregando) {
    return <p className="feedback feedback--loading">Carregando sessão...</p>;
  }

  if (!perfil) {
    return <Navigate to="/login" replace />;
  }

  if (perfis && perfil !== PERFIS.ADMINISTRADOR && !perfis.includes(perfil)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
