import type { Paginacao } from './cliente';

export type FaixaAtraso = 'todas' | 'ate30' | 'de31a60' | 'de61a90' | 'acima90';

export type OrdenacaoCobrancas =
  | 'maior_atraso'
  | 'menor_atraso'
  | 'maior_valor'
  | 'menor_valor'
  | 'cliente';

export type OrdenacaoClientes = 'maior_valor' | 'maior_atraso' | 'mais_cobrancas' | 'cliente';

export type Inadimplencia = {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
  idOrcamento: number | null;
  idCliente: number;
  clienteNome: string;
  clienteCpf: string;
  clienteTelefone: string | null;
  idVeiculo: number | null;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
};

export type ClienteInadimplente = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string;
  quantidadeCobrancas: number;
  valorEmAberto: number;
  vencimentoMaisAntigo: string;
  maiorAtrasoDias: number;
};

export type ResumoInadimplencia = {
  valorVencido: number;
  cobrancasVencidas: number;
  clientesInadimplentes: number;
  maiorAtrasoDias: number;
  valorAVencer: number;
};

export type ListaInadimplenciasResponse = {
  dados: Inadimplencia[];
  valorFiltrado: number;
  paginacao: Paginacao;
};

export type ListaClientesInadimplentesResponse = {
  dados: ClienteInadimplente[];
  paginacao: Paginacao;
};
