export type SituacaoPeriodo = 'presente' | 'saiu' | 'sem_saida';

export type SituacaoHoje = 'presente' | 'saiu' | 'ausente';

export type Presenca = {
  id: number;
  idFuncionario: number;
  nome: string;
  cargo: string;
  data: string; // AAAA-MM-DD
  entradaEm: string; // ISO 8601
  saidaEm: string | null;
  minutos: number | null;
  situacao: SituacaoPeriodo;
};

export type FuncionarioPresenca = {
  id: number;
  nome: string;
  cargo: string;
  presenteDesde: string | null;
  situacao: SituacaoHoje;
};

export type ResumoPresenca = {
  compareceram: number;
  registros: number;
  semSaida: number;
};

export type ListaPresencasResponse = {
  dados: Presenca[];
  data: string;
  resumo: ResumoPresenca;
};

export type PresentesResponse = {
  dados: Presenca[];
  total: number;
};

export type FuncionariosPresencaResponse = {
  dados: FuncionarioPresenca[];
};
