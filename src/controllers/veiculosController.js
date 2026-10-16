const veiculosRepository = require('../repositories/veiculosRepository');
const {
  parsePagination,
  buildPagination
} = require('../utils/queryParams');

// A tela de veículos não pagina: sem "limite" informado, devolve até 500 veículos.
const LIMITE_SEM_PAGINACAO = 500;

async function list(req, res) {
  const semPaginacao = req.query.limite === undefined;
  const pagination = semPaginacao
    ? { pagina: 1, limite: LIMITE_SEM_PAGINACAO, offset: 0 }
    : parsePagination(req.query);

  const busca = typeof req.query.busca === 'string' ? req.query.busca.slice(0, 80) : '';
  const result = await veiculosRepository.findAll({ ...pagination, busca });

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

async function detail(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'Id do veículo inválido.' });
  }

  const veiculo = await veiculosRepository.findById(id);

  if (!veiculo) {
    return res.status(404).json({ erro: 'Veículo não encontrado.' });
  }

  return res.json(veiculo);
}

module.exports.detail = detail;
