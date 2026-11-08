const STATUS_ORCAMENTO = Object.freeze({
  RASCUNHO: 'rascunho',
  ENVIADO: 'enviado',
  ACEITO: 'aceito',
  RECUSADO: 'recusado'
});

const DECISOES_VALIDAS = Object.freeze([
  STATUS_ORCAMENTO.ACEITO,
  STATUS_ORCAMENTO.RECUSADO
]);

// DM-178: só é possível decidir (aceitar/recusar) um orçamento que já foi
// enviado ao cliente e que ainda não teve decisão registrada.
function validarDecisao(orcamento, decisao) {
  if (!orcamento) {
    const erro = new Error('Orçamento não encontrado.');
    erro.statusCode = 404;
    throw erro;
  }

  if (!DECISOES_VALIDAS.includes(decisao)) {
    const erro = new Error('Decisão inválida. Use "aceito" ou "recusado".');
    erro.statusCode = 400;
    throw erro;
  }

  if (orcamento.status !== STATUS_ORCAMENTO.ENVIADO) {
    const erro = new Error(
      orcamento.status === STATUS_ORCAMENTO.RASCUNHO
        ? 'Este orçamento ainda não foi enviado ao cliente.'
        : 'Este orçamento já teve uma decisão registrada.'
    );
    erro.statusCode = 409;
    throw erro;
  }

  return true;
}

module.exports = { STATUS_ORCAMENTO, DECISOES_VALIDAS, validarDecisao };