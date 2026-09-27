export type Cargo = {
  id: number;
  nome: string;
  descricao: string | null;
};

export type ListaCargosResponse = {
  dados: Cargo[];
};