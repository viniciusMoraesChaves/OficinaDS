const cobrancasRepository = require('../repositories/cobrancasRepository');
const {
  parsePagination,
  buildPagination
} = require('../utils/queryParams');
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

module.exports = { listar, listarClientes, resumo };
