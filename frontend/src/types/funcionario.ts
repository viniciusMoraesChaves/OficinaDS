import type { Paginacao } from './cliente';

export type Funcionario = {
  id: number;
  nome: string;
  email: string;
  cargo: string;
  cpf: string;
  telefone: string;
  dataAdmissao: string;
  ativo: boolean | number;
};

export type StatusFiltro = 'todos' | 'ativos' | 'inativos';

export type ListaFuncionariosResponse = {
  dados: Funcionario[];
  paginacao: Paginacao;
};