const funcionariosRepository = require('../repositories/funcionariosRepository');
const {
  parsePagination,
  parseEmployeeFilters,
  buildPagination
} = require('../utils/queryParams');

async function search(req, res) {
  const pagination = parsePagination(req.query);
  const filters = parseEmployeeFilters(req.query);
  const result = await funcionariosRepository.search({
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

module.exports = { search };
