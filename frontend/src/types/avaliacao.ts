// Atendimento concluído do cliente, com a nota dada ao funcionário responsável.
// nota é null enquanto o cliente ainda não avaliou.
export type AtendimentoAvaliavel = {
  id: number;
  criadoEm: string;
  idFuncionario: number;
  funcionarioNome: string;
  placa: string;
  marca: string;
  modelo: string;
  nota: number | null;
  avaliadoEm: string | null;
};
