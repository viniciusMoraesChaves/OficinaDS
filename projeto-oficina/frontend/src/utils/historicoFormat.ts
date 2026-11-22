import type { AtendimentoHistorico, StatusAtendimento } from '../types/historico';

export const brl = (valor: number): string =>
  (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function partesData(iso?: string) {
  if (!iso) {
    return { dia: '--', mes: '---', ano: 0, hora: '--:--', completa: '---' };
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return { dia: '--', mes: '---', ano: 0, hora: '--:--', completa: '---' };
  }
  return {
    dia: String(d.getDate()).padStart(2, '0'),
    mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
    ano: d.getFullYear(),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    completa: d.toLocaleDateString('pt-BR'),
  };
}

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Hoje", "Ontem", "Há 12 dias" ou a data completa. */
export function dataRelativa(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  const dias = Math.round((inicioDoDia(new Date()) - inicioDoDia(d)) / 86_400_000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias < 30) return `Há ${dias} dias`;
  return d.toLocaleDateString('pt-BR');
}

export function chaveMes(iso?: string): string {
  if (!iso) return 'sem-data';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'sem-data';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function rotuloMes(iso?: string): string {
  if (!iso) return 'Data indefinida';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Data inválida';

  const texto = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  if (!texto) return '—';
  
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Data local no formato AAAA-MM-DD. */
export function paraISODataLocal(d: Date): string {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Minúsculas e sem acentos, para busca. */
export const normalizar = (texto?: string): string =>
  (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const totalServicos = (a: AtendimentoHistorico): number =>
  (a.servicos ?? []).reduce((soma, s) => soma + (s.valor ?? 0), 0);

export const totalPecas = (a: AtendimentoHistorico): number =>
  (a.pecas ?? []).reduce((soma, p) => soma + (p.quantidade ?? 0) * (p.valorUnitario ?? 0), 0);

export const totalAtendimento = (a: AtendimentoHistorico): number => totalServicos(a) + totalPecas(a);

export type ChaveStatus = 'ok' | 'prog' | 'wait' | 'open' | 'cancel';

export function chaveStatus(status: StatusAtendimento): ChaveStatus {
  switch (status) {
    case 'Concluído': return 'ok';
    case 'Em andamento': return 'prog';
    case 'Aguardando peças': return 'wait';
    case 'Cancelado': return 'cancel';
    default: return 'open';
  }
}