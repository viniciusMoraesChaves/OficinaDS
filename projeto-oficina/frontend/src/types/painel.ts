export type IndicadorPainel = {
  chave: string;
  rotulo: string;
  valor: number;
  ajuda: string;
  link: string;
  // true quando o número exige atenção (ex.: orçamentos sem resposta)
  atencao: boolean;
};

export type ItemPendencia = {
  id: number;
  titulo: string;
  detalhe: string;
  data: string | null;
};

export type SecaoPendencia = {
  chave: string;
  titulo: string;
  link: string;
  vazio: string;
  itens: ItemPendencia[];
};

export type PainelResponse = {
  dados: {
    usuario: { nome: string | null; perfil: string };
    indicadores: IndicadorPainel[];
    pendencias: SecaoPendencia[];
  };
};
