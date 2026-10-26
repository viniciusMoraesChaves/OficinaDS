const pecasRepository = require('../repositories/pecasRepository');
const { parsePagination, buildPagination } = require('../utils/queryParams');
const { parseEstoqueFilters } = require('../utils/estoqueFilters');
const { parseId } = require('../utils/queryParams');
const { parseBaixaPeca } = require('../utils/baixaPeca');

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

async function baixar(req, res) {
  const idPeca = parseId(req.params.id);
  const { quantidade, motivo } = parseBaixaPeca(req.body);

  const baixa = await pecasRepository.darBaixa({
    idPeca,
    quantidade,
    motivo,
    idUsuario: req.usuarioLogado.id
  });

  if (!baixa) {
    return res.status(404).json({ mensagem: 'Peça não encontrada.' });
  }

  res.status(201).json({ mensagem: 'Baixa registrada.', dados: baixa });
}

async function listarBaixas(req, res) {
  const baixas = await pecasRepository.listarBaixasRecentes();
  res.json({ dados: baixas });
}

module.exports = { list, categorias, baixar, listarBaixas };
