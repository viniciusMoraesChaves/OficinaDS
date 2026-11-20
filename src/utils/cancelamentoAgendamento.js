const { DadosInvalidosError } = require('./erros');

const STATUS_CANCELAVEIS = ['Agendado', 'Confirmado'];
const MOTIVO_MINIMO = 5;
const MOTIVO_MAXIMO = 500;

class CancelamentoNaoPermitidoError extends Error {
  constructor(message, codigo = 'CANCELAMENTO_NAO_PERMITIDO') {
    super(message);
    this.name = 'CancelamentoNaoPermitidoError';
    this.statusCode = 422;
    this.codigo = codigo;
  }
}

function parseMotivo(valor) {
  const motivo = String(valor ?? '').trim();

  if (motivo.length < MOTIVO_MINIMO) {
    throw new DadosInvalidosError(
      `Informe o motivo do cancelamento com pelo menos ${MOTIVO_MINIMO} caracteres.`
    );
  }

  if (motivo.length > MOTIVO_MAXIMO) {
    throw new DadosInvalidosError(
      `O motivo do cancelamento deve ter no máximo ${MOTIVO_MAXIMO} caracteres.`
    );
  }

  return motivo;
}

function parseInicio(dataHora) {
  if (dataHora instanceof Date) return dataHora;
  return new Date(String(dataHora).replace(' ', 'T'));
}

function avaliarCancelamento(agendamento, agora = new Date()) {
  if (!STATUS_CANCELAVEIS.includes(agendamento.status)) {
    return {
      permitido: false,
      motivo: 'Somente agendamentos com status Agendado ou Confirmado podem ser cancelados.'
    };
  }

  const inicio = parseInicio(agendamento.dataHora);

  if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= agora.getTime()) {
    return {
      permitido: false,
      motivo: 'Não é possível cancelar um serviço que já começou ou cujo horário já passou.'
    };
  }

  return { permitido: true, motivo: null };
}

function exigirPodeCancelar(agendamento, agora = new Date()) {
  const resultado = avaliarCancelamento(agendamento, agora);

  if (!resultado.permitido) {
    throw new CancelamentoNaoPermitidoError(resultado.motivo);
  }
}

function regrasPublicas() {
  return {
    statusCancelaveis: [...STATUS_CANCELAVEIS],
    motivoMinimo: MOTIVO_MINIMO,
    motivoMaximo: MOTIVO_MAXIMO
  };
}

module.exports = {
  STATUS_CANCELAVEIS,
  MOTIVO_MINIMO,
  MOTIVO_MAXIMO,
  parseMotivo,
  avaliarCancelamento,
  exigirPodeCancelar,
  regrasPublicas
};
