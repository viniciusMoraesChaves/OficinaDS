import type { FiltroPeriodo, HistoricoVeiculoResposta } from '../types/historico';
import { getToken, EVENTO_SESSAO_EXPIRADA } from './api';

// Mesma origem por padrão (Express servindo o build, ou proxy do Vite para /api).
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class HistoricoError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'HistoricoError';
    this.status = status;
  }
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  const token = getToken();
  return fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
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
    if (res.status === 401 && getToken()) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));

    let mensagem = 'Não foi possível carregar o histórico do veículo.';
    try {
      const corpo = (await res.json()) as { mensagem?: string; erro?: string };
      mensagem = corpo.mensagem ?? corpo.erro ?? mensagem;
    } catch {
      /* corpo sem JSON: mantém a mensagem padrão */
    }
    throw new HistoricoError(mensagem, res.status);
  }

  return (await res.json()) as HistoricoVeiculoResposta;
}
