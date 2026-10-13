import type { FiltroPeriodo, HistoricoVeiculoResposta } from '../types/historico';

// Por padrão usa a mesma origem (front servido pelo Express, ou proxy do Vite apontando /api para a API).
// Em desenvolvimento sem proxy, defina VITE_API_URL no .env do frontend (ex.: http://localhost:3000).
// Se o projeto já tem um helper com autenticação (usado em clientes/funcionários), troque só a função `request`.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class HistoricoError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'HistoricoError';
    this.status = status;
  }
}

function cabecalhosDeAutenticacao(): Record<string, string> {
  // O login guarda o JWT em "oficinaos:token" (localStorage ou sessionStorage).
  try {
    const token = localStorage.getItem('oficinaos:token') ?? sessionStorage.getItem('oficinaos:token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url, { signal, headers: { Accept: 'application/json', ...cabecalhosDeAutenticacao() } });
}

export async function getHistoricoVeiculo(
  idVeiculo: number,
  filtro: FiltroPeriodo = {},
  signal?: AbortSignal,
): Promise<HistoricoVeiculoResposta> {
  const params = new URLSearchParams();
  if (filtro.inicio) params.set('inicio', filtro.inicio);
  if (filtro.fim) params.set('fim', filtro.fim);
  const qs = params.toString();

  const res = await request(`${API_URL}/api/veiculos/${idVeiculo}/historico${qs ? `?${qs}` : ''}`, signal);

  if (!res.ok) {
    let mensagem = 'Não foi possível carregar o histórico do veículo.';
    try {
      const corpo = (await res.json()) as { erro?: string };
      if (corpo.erro) mensagem = corpo.erro;
    } catch {
      /* corpo sem JSON: mantém a mensagem padrão */
    }
    throw new HistoricoError(mensagem, res.status);
  }

  return (await res.json()) as HistoricoVeiculoResposta;
}