import type { Paginacao } from './cliente';

export type StatusPedido = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado';

export type FiltroStatusPedido = 'todos' | StatusPedido;

export type PermissoesPedido = {
  podeEnviar: boolean;
  podeDecidir: boolean;
};

export type PedidoPeca = {
  id: number;
  status: StatusPedido;
  observacao: string | null;
  motivoDecisao: string | null;
  funcionarioId: number;
  solicitante: string;
  atendimentoId: number | null;
  cliente: string | null;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  criadoEm: string;
  enviadoEm: string | null;
  decididoEm: string | null;
  decididoPor: string | null;
  totalItens: number;
  totalUnidades: number;
  permissoes: PermissoesPedido;
};

export type ItemPedido = {
  id: number;
  pecaId: number;
  codigo: string;
  nome: string;
  categoria: string;
  quantidade: number;
  estoque: number;
};

export type PedidoPecaDetalhe = PedidoPeca & {
  itens: ItemPedido[];
};

export type ResumoPedidos = {
  total: number;
  rascunho: number;
  enviado: number;
  aprovado: number;
  rejeitado: number;
};

export type ListaPedidosResponse = {
  dados: PedidoPeca[];
  resumo: ResumoPedidos;
  paginacao: Paginacao;
};

export type PecaOpcao = {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  quantidade: number;
  localizacao: string;
};

export type AtendimentoOpcao = {
  id: number;
  cliente: string;
  placa: string;
  marca: string;
  modelo: string;
};

export type OpcoesPedido = {
  pecas: PecaOpcao[];
  atendimentos: AtendimentoOpcao[];
};

// Linha do pedido que está sendo montado na tela (antes de salvar).
export type ItemNovoPedido = {
  pecaId: number;
  quantidade: number;
};
