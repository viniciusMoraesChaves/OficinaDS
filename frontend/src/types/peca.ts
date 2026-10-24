import type { Paginacao } from './cliente';

export type SituacaoPeca = 'disponivel' | 'baixo' | 'indisponivel';

export type FiltroSituacao = 'todas' | SituacaoPeca;

export type Peca = {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacao: string;
  preco: number;
  situacao: SituacaoPeca;
};

export type ResumoEstoque = {
  total: number;
  disponivel: number;
  baixo: number;
  indisponivel: number;
};

export type ListaPecasResponse = {
  dados: Peca[];
  resumo: ResumoEstoque;
  paginacao: Paginacao;
};
