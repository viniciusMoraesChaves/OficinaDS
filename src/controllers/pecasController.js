const pecasRepository = require('../repositories/pecasRepository');
const { parsePagination, buildPagination } = require('../utils/queryParams');
const { parseEstoqueFilters } = require('../utils/estoqueFilters');

async function list(req, res) {
  const pagination = parsePagination(req.query);
  const filters = parseEstoqueFilters(req.query);

  const [result, resumo] = await Promise.all([
    pecasRepository.findAll({ ...pagination, ...filters }),
    pecasRepository.resumoPorSituacao()
  ]);

  res.json({
    dados: result.rows,
    filtros: filters,
    resumo,
    paginacao: buildPagination(pagination.pagina, pagination.limite, result.total)
  });
}

async function categorias(req, res) {
  const lista = await pecasRepository.listarCategorias();
  res.json({ dados: lista });
}

module.exports = { list, categorias };
