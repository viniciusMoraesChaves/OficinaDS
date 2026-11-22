const { DadosInvalidosError } = require('./erros');

const URGENCIAS = Object.freeze(['baixa', 'media', 'alta']);

function validarUrgencia(valor, padrao = 'media') {
  const urgencia = String(valor || padrao).trim().toLowerCase();
  if (!URGENCIAS.includes(urgencia)) {
    throw new DadosInvalidosError('Urgência inválida. Use baixa, media ou alta.');
  }
  return urgencia;
}

function normalizarFiltroUrgencia(valor) {
  if (!valor || valor === 'todas') return '';
  return validarUrgencia(valor);
}

function validarOrdenacaoUrgencia(valor) {
  const ordenacao = String(valor || 'prioridade').trim().toLowerCase();
  if (!['prioridade', 'recentes'].includes(ordenacao)) {
    throw new DadosInvalidosError('Ordenação inválida. Use prioridade ou recentes.');
  }
  return ordenacao;
}

module.exports = {
  URGENCIAS,
  validarUrgencia,
  normalizarFiltroUrgencia,
  validarOrdenacaoUrgencia
};
