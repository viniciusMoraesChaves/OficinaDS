export type Diagnostico = {
  id: number;
  ordemId: number;
  funcionarioId: number;
  descricao: string;
  dataHora: string;
  ordemStatus: string;
  problemaRelatado: string;
  cliente: string;
  placa: string;
  marca: string;
  modelo: string;
  funcionario: string;
};

export type OrdemOpcao = {
  id: number;
  atendimentoId: number | null;
  status: string;
  problemaRelatado: string;
  cliente: string;
  placa: string;
  marca: string;
  modelo: string;
};

export type FuncionarioOpcao = {
  id: number;
  nome: string;
  cargo: string;
};

export type OpcoesDiagnostico = {
  ordens: OrdemOpcao[];
  funcionarios: FuncionarioOpcao[];
};
