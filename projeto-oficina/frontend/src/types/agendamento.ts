export type StatusAgendamento =
  | 'Agendado'
  | 'Confirmado'
  | 'Em atendimento'
  | 'Concluído'
  | 'Cancelado';

export type PermissaoReagendamento = {
  permitido: boolean;
  motivo: string | null;
};

export type Agendamento = {
  id: number;
  servico: string;
  dataHora: string;
  duracaoMinutos: number;
  status: StatusAgendamento;
  qtdReagendamentos: number;
  reagendadoEm: string | null;
  veiculoId: number;
  funcionarioId: number;
  cliente: string;
  placa: string;
  marca: string;
  modelo: string;
  funcionario: string;
  reagendamento: PermissaoReagendamento;
};

export type VeiculoOpcao = {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  cliente: string;
};

export type FuncionarioAgendamentoOpcao = {
  id: number;
  nome: string;
  cargo: string;
};

export type RegrasAgendamento = {
  duracaoMinutos: number;
  antecedenciaReagendamentoHoras: number;
  antecedenciaNovoHorarioHoras: number;
  janelaMaximaDias: number;
  capacidadeSimultanea: number;
  statusReagendaveis: string[];
  expediente: string;
};

export type OpcoesAgendamento = {
  veiculos: VeiculoOpcao[];
  funcionarios: FuncionarioAgendamentoOpcao[];
  regras: RegrasAgendamento;
};

export type HorarioDisponivel = {
  hora: string;
  disponivel: boolean;
  motivo: string | null;
};

export type HorariosDoDia = {
  data: string;
  fechado: boolean;
  horarios: HorarioDisponivel[];
};

// O que o Cliente enxerga dos próprios agendamentos (somente leitura).
export type AgendamentoCliente = {
  id: number;
  servico: string;
  dataHora: string;
  duracaoMinutos: number;
  status: StatusAgendamento;
  qtdReagendamentos: number;
  reagendadoEm: string | null;
  placa: string;
  marca: string;
  modelo: string;
  funcionario: string;
};
