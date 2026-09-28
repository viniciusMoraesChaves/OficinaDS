export type Veiculo = {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor?: string | null;
};

export type ClienteResumo = {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  quantidadeVeiculos: number | string;
  ativo: boolean | number;
};

export type ClienteDetalhe = {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  ativo: boolean | number;
  endereco?: string | null;
  veiculos: Veiculo[];
};

export type Paginacao = {
  pagina: number;
  totalPaginas: number;
  total: number;
};

export type ListaClientesResponse = {
  dados: ClienteResumo[];
  paginacao: Paginacao;
};