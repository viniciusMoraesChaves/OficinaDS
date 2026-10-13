const veiculosRepository = require('../repositories/veiculosRepository');
const {
  parsePagination,
  buildPagination
} = require('../utils/queryParams');

async function list(req, res) {
  const pagination = parsePagination(req.query);
  const result = await veiculosRepository.findAll(pagination);

  return res.json({
    dados: result.rows,
    paginacao: buildPagination(
      pagination.pagina,
      pagination.limite,
      result.total
    )
  });
}

module.exports = { list };  