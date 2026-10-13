export type StatusOrcamento = 'rascunho' | 'enviado' | 'aceito' | 'recusado';

export type ItemOrcamento = {
  id: number;
  descricao: string;
  valor: number | string;
};

export type ItemOrcamentoForm = {
  descricao: string;
  valor: number;
};

export type AtendimentoAberto = {
  id: number;
  status: string;
  criadoEm: string;
  idCliente: number;
  clienteNome: string;
  idVeiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  idFuncionario: number | null;
  funcionarioNome: string;
};

export type Atendimento = {
  id: number;
  idCliente: number;
  idVeiculo: number;
  idFuncionario: number;
  status: string;
};

export type Orcamento = {
  id: number;
  idAtendimento: number;
  situacaoVeiculo: string;
  valorTotal: number | string;
  status: StatusOrcamento;
  enviadoEm: string | null;
  decididoEm: string | null;
  idCliente: number;
  idVeiculo: number;
  idFuncionario: number;
  itens: ItemOrcamento[];
};

export type OrcamentoResumo = {
  id: number;
  valorTotal: number | string;
  status: StatusOrcamento;
  enviadoEm: string | null;
  decididoEm: string | null;
  placa: string;
  marca: string;
  modelo: string;
};

export type OrcamentoEquipe = OrcamentoResumo & {
  clienteNome: string;
};
