import type { Paginacao } from './cliente';

export type TipoMovimentacao = 'entrada' | 'saida';

export type FiltroTipo = 'todos' | TipoMovimentacao;

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'boleto'
  | 'transferencia';

export type Movimentacao = {
  // "M12" = lançamento manual; "C5" = cobrança paga (entrada automática)
  id: string;
  origem: 'manual' | 'cobranca';
  tipo: TipoMovimentacao;
  categoria: string;
  descricao: string;
  valor: number;
  data: string; // AAAA-MM-DD
  formaPagamento: FormaPagamento | null;
};

export type ResumoFinanceiro = {
  entradas: number;
  saidas: number;
  resultado: number;
  quantidade: number;
};

export type ListaMovimentacoesResponse = {
  dados: Movimentacao[];
  resumo: ResumoFinanceiro;
  paginacao: Paginacao;
};

export type CategoriasResponse = {
  dados: {
    categorias: Record<TipoMovimentacao, string[]>;
    formasPagamento: FormaPagamento[];
  };
};
