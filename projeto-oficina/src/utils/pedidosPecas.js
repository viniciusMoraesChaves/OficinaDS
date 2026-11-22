// Regras do pedido de peças ao superior. Funções puras (sem banco), para testar fácil.
//
// Fluxo:  rascunho --enviar--> enviado --decisão--> aprovado | rejeitado
//   - quem solicita é o funcionário (o Administrador também pode criar pedidos);
//   - só o dono do pedido envia o próprio rascunho;
//   - só o Administrador (o "superior") aprova ou rejeita, e nunca o próprio pedido.

const { ValidationError, parseId } = require('./queryParams');

const STATUS = Object.freeze({
  RASCUNHO: 'rascunho',
  ENVIADO: 'enviado',
  APROVADO: 'aprovado',
  REJEITADO: 'rejeitado'
});

const STATUS_LISTA = Object.freeze(Object.values(STATUS));

const LIMITES = Object.freeze({
  maxItens: 20,
  maxQuantidade: 999,
  maxTexto: 255,
  minMotivo: 3
});

// Erro de regra de negócio. O errorHandler usa statusCode e codigo.
class RegraPedidoError extends Error {
  constructor(codigo, mensagem, statusCode = 422) {
    super(mensagem);
    this.name = 'RegraPedidoError';
    this.codigo = codigo;
    this.statusCode = statusCode;
  }
}

function textoOpcional(valor, rotulo) {
  const texto = String(valor ?? '').trim();

  if (texto.length > LIMITES.maxTexto) {
    throw new ValidationError(`${rotulo} deve ter no máximo ${LIMITES.maxTexto} caracteres.`);
  }

  return texto === '' ? null : texto;
}

function parseFiltroStatus(query = {}) {
  const status = String(query.status || 'todos').toLowerCase();

  if (status !== 'todos' && !STATUS_LISTA.includes(status)) {
    throw new ValidationError('status deve ser todos, rascunho, enviado, aprovado ou rejeitado.');
  }

  return { status };
}

function parseQuantidade(valor) {
  if (!/^\d+$/.test(String(valor ?? '').trim())) {
    throw new ValidationError('A quantidade deve ser um número inteiro maior que zero.');
  }

  const quantidade = Number.parseInt(valor, 10);

  if (quantidade < 1 || quantidade > LIMITES.maxQuantidade) {
    throw new ValidationError(
      `A quantidade de cada peça deve ficar entre 1 e ${LIMITES.maxQuantidade}.`
    );
  }

  return quantidade;
}

function parseItens(valor) {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new ValidationError('Informe pelo menos uma peça no pedido.');
  }

  if (valor.length > LIMITES.maxItens) {
    throw new ValidationError(`Um pedido pode ter no máximo ${LIMITES.maxItens} peças diferentes.`);
  }

  const vistas = new Set();

  return valor.map((item) => {
    const pecaId = parseId(item?.pecaId);
    const quantidade = parseQuantidade(item?.quantidade);

    if (vistas.has(pecaId)) {
      throw new ValidationError(
        'A mesma peça aparece mais de uma vez. Some as quantidades em uma linha só.'
      );
    }

    vistas.add(pecaId);
    return { pecaId, quantidade };
  });
}

function parsePedido(body = {}) {
  const atendimentoBruto = body.atendimentoId;
  const semAtendimento =
    atendimentoBruto === undefined || atendimentoBruto === null || atendimentoBruto === '';

  return {
    itens: parseItens(body.itens),
    observacao: textoOpcional(body.observacao, 'A observação'),
    atendimentoId: semAtendimento ? null : parseId(atendimentoBruto),
    enviar: body.enviar === true
  };
}

function parseDecisao(body = {}) {
  const decisao = String(body.decisao || '').toLowerCase();

  if (decisao !== STATUS.APROVADO && decisao !== STATUS.REJEITADO) {
    throw new ValidationError('decisao deve ser aprovado ou rejeitado.');
  }

  const motivo = textoOpcional(body.motivo, 'O motivo');

  if (decisao === STATUS.REJEITADO && (!motivo || motivo.length < LIMITES.minMotivo)) {
    throw new ValidationError(
      `Informe o motivo da rejeição (pelo menos ${LIMITES.minMotivo} caracteres).`
    );
  }

  return { decisao, motivo };
}

function exigirPodeEnviar(pedido, funcionarioId) {
  if (funcionarioId == null || pedido.funcionarioId !== funcionarioId) {
    throw new RegraPedidoError(
      'SOMENTE_O_SOLICITANTE',
      'Só quem criou o pedido pode enviá-lo ao superior.',
      403
    );
  }

  if (pedido.status !== STATUS.RASCUNHO) {
    throw new RegraPedidoError(
      'STATUS_NAO_PERMITIDO',
      'Só pedidos em rascunho podem ser enviados ao superior.'
    );
  }
}

function exigirPodeDecidir(pedido, funcionarioDecisorId) {
  if (pedido.status !== STATUS.ENVIADO) {
    throw new RegraPedidoError(
      'STATUS_NAO_PERMITIDO',
      'Só pedidos enviados ao superior podem ser aprovados ou rejeitados.'
    );
  }

  if (funcionarioDecisorId != null && pedido.funcionarioId === funcionarioDecisorId) {
    throw new RegraPedidoError(
      'PROPRIO_PEDIDO',
      'Você não pode aprovar ou rejeitar um pedido que você mesmo criou.',
      403
    );
  }
}

// O que a tela pode mostrar como ação para quem está olhando o pedido.
function permissoes(pedido, { administrador, funcionarioId }) {
  const dono = funcionarioId != null && pedido.funcionarioId === funcionarioId;

  return {
    podeEnviar: dono && pedido.status === STATUS.RASCUNHO,
    podeDecidir: Boolean(administrador) && pedido.status === STATUS.ENVIADO && !dono
  };
}

module.exports = {
  STATUS,
  STATUS_LISTA,
  LIMITES,
  RegraPedidoError,
  parseFiltroStatus,
  parseQuantidade,
  parseItens,
  parsePedido,
  parseDecisao,
  exigirPodeEnviar,
  exigirPodeDecidir,
  permissoes
};
