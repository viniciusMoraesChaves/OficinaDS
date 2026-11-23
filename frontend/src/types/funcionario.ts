import type { Paginacao } from './cliente';

export type Funcionario = {
  id: number;
  nome: string;
  email: string;
  cargoId: number;
  cargo: string;
  cpf: string;
  telefone: string;
  dataAdmissao: string;
  ativo: boolean | number;
  // Média das notas dos clientes (null enquanto ninguém avaliou) e quantas notas foram.
  avaliacaoMedia?: number | null;
  totalAvaliacoes?: number;
};

export type StatusFiltro = 'todos' | 'ativos' | 'inativos';

export type ListaFuncionariosResponse = {
  dados: Funcionario[];
  paginacao: Paginacao;
};

export type FuncionarioOpcao = {
  id: number;
  nome: string;
  cargo: string;
};

export type ServicoFuncionario = {
  referencia: string;
  tipo: 'Agendamento' | 'Atendimento';
  servico: string;
  dataHora: string;
  status: string;
  veiculo: string;
};

export type FuncionarioDetalhado = Funcionario & {
  servicos: ServicoFuncionario[];
};
