const movimentacoesRepository = require('../repositories/movimentacoesRepository');
const { parsePagination, buildPagination } = require('../utils/queryParams');
const {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  hojeIso,
  parseMovimentacao,
  parseFiltrosMovimentacoes
} = require('../utils/financeiro');
const { definirGranularidade, montarSerie } = require('../utils/graficoFinanceiro');

// GET /api/financeiro/movimentacoes
// Lista paginada e o resumo (entradas, saídas e resultado) para os mesmos filtros.
async function listar(req, res) {
  const pagination = parsePagination(req.query);
  const filtros = parseFiltrosMovimentacoes(req.query);

  const [resultado, resumo] = await Promise.all([
    movimentacoesRepository.listar(filtros, pagination),
    movimentacoesRepository.resumo(filtros)
  ]);

  res.json({
    dados: resultado.rows,
    filtros,
    resumo,
    paginacao: buildPagination(pagination.pagina, pagination.limite, resultado.total)
  });
}

// POST /api/financeiro/movimentacoes
async function criar(req, res) {
  const lancamento = parseMovimentacao(req.body);

  const id = await movimentacoesRepository.criar({
    ...lancamento,
    idUsuario: req.usuarioLogado.id
  });

  res.status(201).json({
    dados: { id: `M${id}`, origem: 'manual', ...lancamento },
    mensagem: 'Lançamento registrado com sucesso.'
  });
}

// GET /api/financeiro/movimentacoes/categorias
function categorias(req, res) {
  res.json({ dados: { categorias: CATEGORIAS, formasPagamento: FORMAS_PAGAMENTO } });
}

// GET /api/financeiro/movimentacoes/grafico
// Entradas e saídas por dia (períodos de até 31 dias) ou por mês, com os mesmos filtros da listagem.
async function grafico(req, res) {
  const filtros = parseFiltrosMovimentacoes(req.query);
  const hoje = hojeIso();
  const granularidade = definirGranularidade(filtros, hoje);

  const linhas = await movimentacoesRepository.serie(filtros, granularidade);
  const serie = montarSerie(linhas, { granularidade, inicio: filtros.inicio, fim: filtros.fim, hoje });

  res.json({ dados: { granularidade, serie }, filtros });
}

module.exports = { listar, criar, categorias, grafico };
