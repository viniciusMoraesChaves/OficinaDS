export type StatusAtendimento =
  | 'Aberto'
  | 'Em andamento'
  | 'Aguardando peças'
  | 'Concluído'
  | 'Cancelado';

export interface ServicoHistorico {
  descricao: string;
  valor: number;
}

export interface PecaHistorico {
  nome: string;
  quantidade: number;
  valorUnitario: number;
}

export interface AtendimentoHistorico {
  idAtendimento: number;
  data: string; // ISO 8601
  status: StatusAtendimento;
  problema: string;
  diagnostico: string | null;
  mecanico: string | null;
  servicos: ServicoHistorico[];
  pecas: PecaHistorico[];
}

export interface VeiculoResumo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string | null;
  cliente: string;
}

export interface HistoricoVeiculoResposta {
  veiculo: VeiculoResumo;
  atendimentos: AtendimentoHistorico[];
}

export interface FiltroPeriodo {
  inicio?: string; // AAAA-MM-DD
  fim?: string; // AAAA-MM-DD
}