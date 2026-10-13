import type { VeiculoLista } from '../types/veiculo';
import { getToken, EVENTO_SESSAO_EXPIRADA } from './api';

interface RespostaVeiculos {
  dados: VeiculoLista[];
}

// Mesma origem por padrão (Express servindo o build, ou proxy do Vite para /api).
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export async function listarVeiculos(busca = '', signal?: AbortSignal): Promise<VeiculoLista[]> {
  const qs = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  const token = getToken();

  const res = await fetch(`${API_URL}/api/veiculos${qs}`, {
    signal,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let corpo: unknown;
  try {
    corpo = await res.json();
  } catch {
    throw new Error('A API não respondeu como esperado. Confira se /api está apontando para o servidor da API.');
  }

  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    const { mensagem } = corpo as { mensagem?: string };
    throw new Error(mensagem ?? 'Não foi possível carregar os veículos.');
  }

  return (corpo as RespostaVeiculos).dados ?? [];
}
