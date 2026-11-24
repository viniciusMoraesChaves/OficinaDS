const { DadosInvalidosError } = require('./erros');

const NOTA_MINIMA = 1;
const NOTA_MAXIMA = 5;

// Aceita 4 ou "4". Rejeita 0, 6, 4.5, "", null, true, "abc" e qualquer coisa que
// não seja um inteiro de 1 a 5.
function lerNota(valor) {
  const ehInteiro =
    (typeof valor === 'number' && Number.isInteger(valor)) ||
    (typeof valor === 'string' && /^\d+$/.test(valor.trim()));

  const nota = ehInteiro ? Number(valor) : NaN;

  if (!Number.isInteger(nota) || nota < NOTA_MINIMA || nota > NOTA_MAXIMA) {
    throw new DadosInvalidosError(
      `A nota deve ser um número inteiro de ${NOTA_MINIMA} a ${NOTA_MAXIMA} estrelas.`
    );
  }

  return nota;
}

// Um atendimento só pode ser avaliado depois de concluído: ou a oficina já o
// encerrou (status concluido) ou o serviço chegou à etapa "Concluída".
// Atendimento cancelado nunca pode ser avaliado.
function atendimentoConcluido({ status, etapaAtual }) {
  if (status === 'cancelado') {
    return false;
  }

  return status === 'concluido' || etapaAtual === 'Concluída';
}

// Média com uma casa decimal, arredondando metade para cima (4,25 vira 4,3).
// Usa só aritmética de inteiros para não errar por causa de ponto flutuante.
// Sem nenhuma avaliação, devolve media null.
function resumirAvaliacoes(soma, total) {
  const somaNotas = Number(soma);
  const quantidade = Number(total);

  if (!Number.isFinite(somaNotas) || !Number.isFinite(quantidade) || quantidade <= 0) {
    return { media: null, total: 0 };
  }

  return {
    media: Math.round((somaNotas * 10) / quantidade) / 10,
    total: quantidade
  };
}

// Atalho para uma lista de notas: calcularMedia([5, 4, 4]) => { media: 4.3, total: 3 }
function calcularMedia(notas) {
  const soma = notas.reduce((acumulado, nota) => acumulado + nota, 0);

  return resumirAvaliacoes(soma, notas.length);
}

module.exports = {
  NOTA_MINIMA,
  NOTA_MAXIMA,
  lerNota,
  atendimentoConcluido,
  resumirAvaliacoes,
  calcularMedia
};
