export interface VeiculoLista {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cliente: string;
  ultimoServico: string | null; // ISO 8601, ou null se nunca foi atendido
}