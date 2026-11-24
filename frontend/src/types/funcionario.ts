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

export type DificuldadeDiagnostico = 'baixa' | 'media' | 'alta';

export type ServicoDesempenho = {
  idAtendimento: number;
  servico: string;
  tempoExecucaoMinutos: number;
  dificuldade: DificuldadeDiagnostico;
  criadoEm: string;
  finalizadoEm: string;
};

export type DesempenhoFuncionario = {
  id: number;
  nome: string;
  cargo: string;
  totalServicos: number;
  tempoTotalMinutos: number;
  tempoMedioMinutos: number;
  distribuicaoDificuldade: Record<DificuldadeDiagnostico, number>;
  pontuacaoBruta: number;
  indiceDesempenho: number;
  servicos: ServicoDesempenho[];
};

export type PontoGraficoSemanal = {
  dia: string;
  totalServicos: number;
  tempoMedioMinutos: number;
};

export type RelatorioDiarioDados = {
  dataReferencia: string;
  resumoGeral: {
    totalServicosDia: number;
    mediaDesempenhoEquipe: number;
  };
  funcionarios: DesempenhoFuncionario[];
  graficoSemanal: PontoGraficoSemanal[];
};

export type RelatorioDiarioResponse = {
  dados: RelatorioDiarioDados;
};