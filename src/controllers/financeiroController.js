const movimentacoesRepository = require('../repositories/movimentacoesRepository');
const { parseFiltrosMovimentacoes } = require('../utils/financeiro');

// GET /api/financeiro/resumo?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
// Entradas, saídas e resultado (lucro ou prejuízo) do período. Sem período, considera tudo.
async function resumo(req, res) {
  const filtros = parseFiltrosMovimentacoes(req.query);
  const dados = await movimentacoesRepository.resumo(filtros);

  res.json({
    dados: {
      ...dados,
      periodo: { inicio: filtros.inicio || null, fim: filtros.fim || null }
    }
  });
}

module.exports = { resumo };
