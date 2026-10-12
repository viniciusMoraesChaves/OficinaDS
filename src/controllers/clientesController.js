const clientesRepository = require('../repositories/clientesRepository');
const {
  parsePagination,
  parseId,
  parseClientFilters,
  buildPagination
} = require('../utils/queryParams');

async function list(req, res) {
  const pagination = parsePagination(req.query);
  const filters = parseClientFilters(req.query);
  const result = await clientesRepository.findAll({
    ...pagination,
    ...filters
  });

  res.json({
    dados: result.rows,
    filtros: filters,
    paginacao: buildPagination(
      pagination.pagina,
      pagination.limite,
      result.total
    )
  });
}

async function detail(req, res) {
  const id = parseId(req.params.id);
  const client = await clientesRepository.findById(id);

  if (!client) {
    return res.status(404).json({
      erro: 'CLIENTE_NAO_ENCONTRADO',
      mensagem: 'Cliente não encontrado.'
    });
  }

  return res.json({ dados: client });
}

module.exports = { list, detail };
