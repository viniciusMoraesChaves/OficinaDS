// Regras de negócio de agendamento e reagendamento.
// Todas as funções aqui são puras (não acessam banco nem relógio): quem chama
// informa "agora" e os horários já ocupados. Isso facilita testar cada regra.
//
// Datas e horas são tratadas como horário local da oficina, sem fuso:
//   data  -> 'AAAA-MM-DD'
//   hora  -> 'HH:mm'

const { ValidationError } = require('./queryParams');

const STATUS = Object.freeze({
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ATENDIMENTO: 'Em atendimento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado'
});

// Só estes status permitem reagendar.
const STATUS_REAGENDAVEIS = Object.freeze([STATUS.AGENDADO, STATUS.CONFIRMADO]);

// Estes status ocupam o horário do profissional, do veículo e da oficina.
const STATUS_QUE_OCUPAM_HORARIO = Object.freeze([
  STATUS.AGENDADO,
  STATUS.CONFIRMADO,
  STATUS.EM_ATENDIMENTO
]);

const REGRAS = Object.freeze({
  duracaoMinutos: 60,
  // Quanto tempo antes do horário ATUAL ainda é possível reagendar.
  antecedenciaReagendamentoHoras: 24,
  // Distância mínima entre "agora" e o NOVO horário escolhido.
  antecedenciaNovoHorarioHoras: 2,
  // Até quantos dias à frente é possível marcar.
  janelaMaximaDias: 60,
  // Quantos veículos a oficina atende ao mesmo tempo (boxes).
  capacidadeSimultanea: 3,
  // Expediente por dia da semana (Date#getDay: 0 = domingo). null = fechado.
  expediente: Object.freeze({
    0: null,
    1: ['08:00', '18:00'],
    2: ['08:00', '18:00'],
    3: ['08:00', '18:00'],
    4: ['08:00', '18:00'],
    5: ['08:00', '18:00'],
    6: ['08:00', '12:00']
  })
});

// Erro de regra de negócio. O errorHandler usa statusCode e codigo.
// 422 = a regra não permite; 409 = conflito com outro agendamento.
class RegraAgendamentoError extends Error {
  constructor(codigo, mensagem, statusCode = 422) {
    super(mensagem);
    this.name = 'RegraAgendamentoError';
    this.codigo = codigo;
    this.statusCode = statusCode;
  }
}

/* ---------- Conversão de datas ---------- */

function pad(numero) {
  return String(numero).padStart(2, '0');
}

function formatarData(data) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function formatarHora(data) {
  return `${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function formatarDataHoraSql(data) {
  return `${formatarData(data)} ${formatarHora(data)}:00`;
}

function parseData(valor) {
  const erro = new ValidationError(
    'A data deve estar no formato AAAA-MM-DD e ser uma data válida.'
  );
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? '').trim());

  if (!partes) {
    throw erro;
  }

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia);

  // Rejeita datas que o JavaScript "corrige" sozinho, como 31/02.
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw erro;
  }

  return data;
}

function parseHora(valor) {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(valor ?? '').trim());

  if (!partes) {
    throw new ValidationError('A hora deve estar no formato HH:mm, por exemplo 09:00.');
  }

  return { horas: Number(partes[1]), minutos: Number(partes[2]) };
}

function montarInicio(dataTexto, horaTexto) {
  const inicio = parseData(dataTexto);
  const { horas, minutos } = parseHora(horaTexto);
  inicio.setHours(horas, minutos, 0, 0);
  return inicio;
}

// Aceita 'AAAA-MM-DDTHH:mm:ss', 'AAAA-MM-DD HH:mm:ss' ou um Date.
function parseInicioBanco(valor) {
  if (valor instanceof Date) {
    return valor;
  }

  const partes = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(valor));

  if (!partes) {
    throw new Error(`Data e hora inválidas: ${valor}`);
  }

  return new Date(
    Number(partes[1]),
    Number(partes[2]) - 1,
    Number(partes[3]),
    Number(partes[4]),
    Number(partes[5]),
    Number(partes[6] || 0)
  );
}

/* ---------- Expediente e horários ---------- */

function paraMinutos(horaTexto) {
  const [horas, minutos] = horaTexto.split(':').map(Number);
  return horas * 60 + minutos;
}

function expedienteDoDia(data) {
  const faixa = REGRAS.expediente[data.getDay()];
  return faixa ? { abre: paraMinutos(faixa[0]), fecha: paraMinutos(faixa[1]) } : null;
}

// Horários de início possíveis no dia, de hora em hora, de modo que o
// atendimento termine até o fechamento. Domingo devolve lista vazia.
function gerarHorariosDoDia(dataTexto) {
  const expediente = expedienteDoDia(parseData(dataTexto));

  if (!expediente) {
    return [];
  }

  const horarios = [];

  for (
    let minuto = expediente.abre;
    minuto + REGRAS.duracaoMinutos <= expediente.fecha;
    minuto += REGRAS.duracaoMinutos
  ) {
    horarios.push(`${pad(Math.floor(minuto / 60))}:${pad(minuto % 60)}`);
  }

  return horarios;
}

/* ---------- Regras (devolvem null ou { codigo, mensagem }) ---------- */

function problemaParaReagendar(agendamento, agora) {
  if (!STATUS_REAGENDAVEIS.includes(agendamento.status)) {
    return {
      codigo: 'STATUS_NAO_PERMITIDO',
      mensagem:
        `Agendamentos com status "${agendamento.status}" não podem ser reagendados. ` +
        'Só é possível reagendar agendamentos "Agendado" ou "Confirmado".'
    };
  }

  const horasRestantes =
    (parseInicioBanco(agendamento.dataHora).getTime() - agora.getTime()) / 3_600_000;

  if (horasRestantes < REGRAS.antecedenciaReagendamentoHoras) {
    return {
      codigo: 'ANTECEDENCIA_INSUFICIENTE',
      mensagem:
        `O reagendamento exige pelo menos ${REGRAS.antecedenciaReagendamentoHoras} horas ` +
        'de antecedência em relação ao horário atual do agendamento.'
    };
  }

  return null;
}

function problemaNoNovoInicio(inicio, agora) {
  const horariosDoDia = gerarHorariosDoDia(formatarData(inicio));

  if (horariosDoDia.length === 0) {
    return {
      codigo: 'FORA_DO_EXPEDIENTE',
      mensagem: 'A oficina não atende neste dia. Escolha uma data de segunda a sábado.'
    };
  }

  if (!horariosDoDia.includes(formatarHora(inicio))) {
    return {
      codigo: 'FORA_DO_EXPEDIENTE',
      mensagem: 'Horário fora do expediente da oficina.'
    };
  }

  const limiteMinimo = agora.getTime() + REGRAS.antecedenciaNovoHorarioHoras * 3_600_000;

  if (inicio.getTime() < limiteMinimo) {
    return {
      codigo: 'ANTECEDENCIA_INSUFICIENTE',
      mensagem:
        `O novo horário precisa ter pelo menos ${REGRAS.antecedenciaNovoHorarioHoras} ` +
        'horas de antecedência.'
    };
  }

  const limiteMaximo = agora.getTime() + REGRAS.janelaMaximaDias * 86_400_000;

  if (inicio.getTime() > limiteMaximo) {
    return {
      codigo: 'JANELA_EXCEDIDA',
      mensagem: `Só é possível agendar até ${REGRAS.janelaMaximaDias} dias à frente.`
    };
  }

  return null;
}

function sobrepoe(inicioA, duracaoA, inicioB, duracaoB) {
  const fimA = inicioA.getTime() + duracaoA * 60_000;
  const fimB = inicioB.getTime() + duracaoB * 60_000;
  return inicioA.getTime() < fimB && inicioB.getTime() < fimA;
}

// "ocupados" são agendamentos ativos do dia: { id, funcionarioId, veiculoId,
// dataHora, duracaoMinutos }. Encostar (um termina às 10h e outro começa às
// 10h) não é conflito.
function encontrarConflito(
  { inicio, duracaoMinutos = REGRAS.duracaoMinutos, funcionarioId, veiculoId, ignorarId = null },
  ocupados
) {
  const concorrentes = ocupados.filter(
    (outro) =>
      outro.id !== ignorarId &&
      sobrepoe(
        inicio,
        duracaoMinutos,
        parseInicioBanco(outro.dataHora),
        outro.duracaoMinutos ?? REGRAS.duracaoMinutos
      )
  );

  if (concorrentes.some((outro) => outro.funcionarioId === funcionarioId)) {
    return {
      codigo: 'CONFLITO_PROFISSIONAL',
      mensagem: 'O profissional já possui outro atendimento neste horário.'
    };
  }

  if (veiculoId && concorrentes.some((outro) => outro.veiculoId === veiculoId)) {
    return {
      codigo: 'CONFLITO_VEICULO',
      mensagem: 'Este veículo já possui outro agendamento neste horário.'
    };
  }

  if (concorrentes.length >= REGRAS.capacidadeSimultanea) {
    return {
      codigo: 'OFICINA_LOTADA',
      mensagem: 'A oficina atingiu o limite de atendimentos simultâneos neste horário.'
    };
  }

  return null;
}

/* ---------- Versões que lançam erro (usadas pelo controller) ---------- */

function lancar(problema, statusCode) {
  throw new RegraAgendamentoError(problema.codigo, problema.mensagem, statusCode);
}

function exigirPodeReagendar(agendamento, agora) {
  const problema = problemaParaReagendar(agendamento, agora);
  if (problema) lancar(problema, 422);
}

function exigirNovoInicioValido(inicio, agora) {
  const problema = problemaNoNovoInicio(inicio, agora);
  if (problema) lancar(problema, 422);
}

function exigirSemConflito(parametros, ocupados) {
  const problema = encontrarConflito(parametros, ocupados);
  if (problema) lancar(problema, 409);
}

/* ---------- Consultas para a interface ---------- */

function avaliarReagendamento(agendamento, agora) {
  const problema = problemaParaReagendar(agendamento, agora);
  return { permitido: problema === null, motivo: problema ? problema.mensagem : null };
}

// Lista os horários do dia e diz, para cada um, se está livre e por quê não.
// "inicioAtual" (opcional) é o horário que o agendamento já tem: ele aparece
// como indisponível para não "reagendar" para o mesmo horário.
function listarHorarios({
  data,
  ocupados,
  funcionarioId,
  veiculoId,
  ignorarId = null,
  inicioAtual = null,
  agora
}) {
  const horarios = gerarHorariosDoDia(data);

  return {
    data,
    fechado: horarios.length === 0,
    horarios: horarios.map((hora) => {
      const inicio = montarInicio(data, hora);
      let problema = problemaNoNovoInicio(inicio, agora);

      if (!problema && inicioAtual && inicio.getTime() === inicioAtual.getTime()) {
        problema = {
          codigo: 'HORARIO_ATUAL',
          mensagem: 'Este já é o horário atual do agendamento.'
        };
      }

      if (!problema) {
        problema = encontrarConflito({ inicio, funcionarioId, veiculoId, ignorarId }, ocupados);
      }

      return { hora, disponivel: problema === null, motivo: problema ? problema.mensagem : null };
    })
  };
}

// Resumo das regras para mostrar na tela.
function regrasPublicas() {
  return {
    duracaoMinutos: REGRAS.duracaoMinutos,
    antecedenciaReagendamentoHoras: REGRAS.antecedenciaReagendamentoHoras,
    antecedenciaNovoHorarioHoras: REGRAS.antecedenciaNovoHorarioHoras,
    janelaMaximaDias: REGRAS.janelaMaximaDias,
    capacidadeSimultanea: REGRAS.capacidadeSimultanea,
    statusReagendaveis: [...STATUS_REAGENDAVEIS],
    expediente: 'Segunda a sexta, das 08h às 18h; sábado, das 08h às 12h; domingo fechado.'
  };
}

module.exports = {
  STATUS,
  STATUS_REAGENDAVEIS,
  STATUS_QUE_OCUPAM_HORARIO,
  REGRAS,
  RegraAgendamentoError,
  formatarData,
  formatarHora,
  formatarDataHoraSql,
  parseData,
  parseHora,
  montarInicio,
  parseInicioBanco,
  gerarHorariosDoDia,
  problemaParaReagendar,
  problemaNoNovoInicio,
  encontrarConflito,
  exigirPodeReagendar,
  exigirNovoInicioValido,
  exigirSemConflito,
  avaliarReagendamento,
  listarHorarios,
  regrasPublicas
};
