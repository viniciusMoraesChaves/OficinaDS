const cobrancasRepository = require('../repositories/cobrancasRepository');
const {
  parsePagination,
  buildPagination,
  parseId
} = require('../utils/queryParams');
const { ConflitoError } = require('../utils/erros');
const {
  parseInadimplenciaFilters,
  parseClientesInadimplentesFilters
} = require('../utils/inadimplencias');

// GET /api/financeiro/inadimplencias
async function listar(req, res) {
  const pagination = parsePagination(req.query);
  const filtros = parseInadimplenciaFilters(req.query);

  const resultado = await cobrancasRepository.findInadimplentes({ ...pagination, ...filtros });

  res.json({
    dados: resultado.rows,
    filtros,
    valorFiltrado: resultado.valorTotal,
    paginacao: buildPagination(pagination.pagina, pagination.limite, resultado.total)
  });
}

// GET /api/financeiro/inadimplencias/clientes
async function listarClientes(req, res) {
  const pagination = parsePagination(req.query);
  const filtros = parseClientesInadimplentesFilters(req.query);

  const resultado = await cobrancasRepository.findClientesInadimplentes({
    ...pagination,
    ...filtros
  });

  res.json({
    dados: resultado.rows,
    filtros,
    paginacao: buildPagination(pagination.pagina, pagination.limite, resultado.total)
  });
}

// GET /api/financeiro/inadimplencias/resumo
async function resumo(req, res) {
  const dados = await cobrancasRepository.resumoFinanceiro();

  res.json({ dados });
}

// PATCH /api/financeiro/inadimplencias/:id/pagamento
async function registrarPagamento(req, res) {
  const idCobranca = parseId(req.params.id);
  const resultado = await cobrancasRepository.registrarPagamento(idCobranca);

  if (resultado.registrado) {
    return res.json({ mensagem: 'Pagamento registrado.' });
  }

  if (resultado.status === null) {
    return res.status(404).json({
      erro: 'COBRANCA_NAO_ENCONTRADA',
      mensagem: 'Cobrança não encontrada.'
    });
  }

  throw new ConflitoError(
    resultado.status === 'pago'
      ? 'Esta cobrança já está paga.'
      : 'Esta cobrança foi cancelada e não pode ser paga.'
  );
}

// PATCH /api/financeiro/inadimplencias/clientes/:id/pagamento
async function registrarPagamentoCliente(req, res) {
  const idCliente = parseId(req.params.id);
  const quantidade = await cobrancasRepository.registrarPagamentoDoCliente(idCliente);

  if (quantidade === 0) {
    throw new ConflitoError('Este cliente não tem cobranças vencidas em aberto.');
  }

  res.json({
    mensagem: quantidade === 1
      ? 'Pagamento de 1 cobrança registrado.'
      : `Pagamento de ${quantidade} cobranças registrado.`,
    quantidade
  });
}

module.exports = {
  listar,
  listarClientes,
  resumo,
  registrarPagamento,
  registrarPagamentoCliente
};
