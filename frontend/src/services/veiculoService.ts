import type { VeiculoLista } from '../types/veiculo';

// Estrutura enviada pela API com paginação
interface RespostaVeiculos {
  dados: VeiculoLista[];
  paginacao?: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
}

// Mesma origem por padrão (Express servindo o build, ou proxy do Vite para /api).
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

function cabecalhosDeAutenticacao(): Record<string, string> {
  try {
    const token = localStorage.getItem('oficinaos:token') ?? sessionStorage.getItem('oficinaos:token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function listarVeiculos(busca = '', signal?: AbortSignal): Promise<VeiculoLista[]> {
  const qs = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  const res = await fetch(`${API_URL}/api/veiculos${qs}`, {
    signal,
    headers: { Accept: 'application/json', ...cabecalhosDeAutenticacao() },
  });

  let corpo: unknown;
  try {
    corpo = await res.json();
  } catch {
    throw new Error('A API não respondeu como esperado. Confira se /api está apontando para o servidor da API.');
  }

  if (!res.ok) {
    const mensagem = (corpo as { erro?: string }).erro ?? 'Não foi possível carregar os veículos.';
    throw new Error(mensagem);
  }

  // Retorna apenas o array dentro da propriedade `dados`
  const resposta = corpo as RespostaVeiculos;
  return resposta.dados ?? [];
}