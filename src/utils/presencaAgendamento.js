// Regras de presença e não comparecimento em agendamentos (funções puras).
//   compareceu      -> status passa a "Em atendimento"
//   nao_compareceu  -> status passa a "Não compareceu" (libera o horário)
const { ValidationError } = require('./queryParams');
const { STATUS, RegraAgendamentoError, parseInicioBanco } = require('./regrasAgendamento');

const RESULTADOS = Object.freeze({
  compareceu: STATUS.EM_ATENDIMENTO,
  nao_compareceu: STATUS.NAO_COMPARECEU
});

// Só quem ainda não foi atendido nem cancelado pode ter presença registrada.
const STATUS_REGISTRAVEIS = Object.freeze([STATUS.AGENDADO, STATUS.CONFIRMADO]);

function parseResultado(valor) {
  const resultado = String(valor ?? '').trim();

  if (!Object.prototype.hasOwnProperty.call(RESULTADOS, resultado)) {
    throw new ValidationError('Informe o resultado: "compareceu" ou "nao_compareceu".');
  }

  return resultado;
}

function problemaParaRegistrar(agendamento, agora) {
  if (!STATUS_REGISTRAVEIS.includes(agendamento.status)) {
    return new RegraAgendamentoError(
      'STATUS_NAO_PERMITIDO',
      `Não é possível registrar presença em agendamento com status "${agendamento.status}".`
    );
  }

  if (parseInicioBanco(agendamento.dataHora).getTime() > agora.getTime()) {
    return new RegraAgendamentoError(
      'ANTES_DO_HORARIO',
      'A presença só pode ser registrada a partir do horário do agendamento.'
    );
  }

  return null;
}

function exigirPodeRegistrar(agendamento, agora) {
  const problema = problemaParaRegistrar(agendamento, agora);
  if (problema) throw problema;
}

function avaliarPresenca(agendamento, agora) {
  const problema = problemaParaRegistrar(agendamento, agora);
  return { permitido: problema === null, motivo: problema ? problema.message : null };
}

module.exports = {
  RESULTADOS,
  STATUS_REGISTRAVEIS,
  parseResultado,
  exigirPodeRegistrar,
  avaliarPresenca
};
