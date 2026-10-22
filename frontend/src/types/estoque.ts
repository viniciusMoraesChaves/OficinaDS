
export type SituacaoEstoque = 'ABAIXO' | 'PROXIMO' | 'NORMAL';

export interface PecaAlerta {
  id_peca: number;
  nome: string;
  quantidade: number;
  estoque_minimo: number;
  situacao: SituacaoEstoque;
}

export interface AlertasEstoqueResponse {
  dados: PecaAlerta[];
  resumo: {
    total: number;
    abaixo: number;
    proximo: number;
  };
}

export interface TodasPecasEstoqueResponse {
  dados: PecaAlerta[];
}
