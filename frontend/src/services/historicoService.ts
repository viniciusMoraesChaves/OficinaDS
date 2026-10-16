import type {
  AtendimentoHistorico,
  FiltroPeriodo,
  HistoricoVeiculoResposta,
  VeiculoResumo,
} from '../types/historico';
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

async function buscar<T>(caminho: string, mensagemPadrao: string, signal?: AbortSignal): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${caminho}`, {
    signal,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));

    let mensagem = mensagemPadrao;
    try {
      const corpo = (await res.json()) as { mensagem?: string; erro?: string };
      mensagem = corpo.mensagem ?? corpo.erro ?? mensagem;
    } catch {
      /* corpo sem JSON: mantém a mensagem padrão */
    }
    throw new HistoricoError(mensagem, res.status);
  }

  return (await res.json()) as T;
}

// A API devolve o veículo e a lista de atendimentos em rotas separadas;
// a tela recebe os dois juntos.
export async function getHistoricoVeiculo(
  idVeiculo: number,
  filtro: FiltroPeriodo = {},
  signal?: AbortSignal,
): Promise<HistoricoVeiculoResposta> {
  const params = new URLSearchParams();
  if (filtro.inicio) params.set('inicio', filtro.inicio);
  if (filtro.fim) params.set('fim', filtro.fim);
  const qs = params.toString();

  const [veiculo, atendimentos] = await Promise.all([
    buscar<VeiculoResumo>(`/api/veiculos/${idVeiculo}`, 'Não foi possível carregar o veículo.', signal),
    buscar<AtendimentoHistorico[]>(
      `/api/veiculos/${idVeiculo}/historico${qs ? `?${qs}` : ''}`,
      'Não foi possível carregar o histórico do veículo.',
      signal,
    ),
  ]);

  return { veiculo, atendimentos };
}
