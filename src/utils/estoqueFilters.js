const { ValidationError } = require('./queryParams');

const SITUACOES = ['todas', 'disponivel', 'baixo', 'indisponivel'];

// Filtros da consulta de estoque: texto, situação de disponibilidade e categoria.
function parseEstoqueFilters(query) {
  const busca = String(query.busca || '').trim().slice(0, 100);
  const categoria = String(query.categoria || '').trim().slice(0, 60);
  const situacao = String(query.situacao || 'todas').toLowerCase();

  if (!SITUACOES.includes(situacao)) {
    throw new ValidationError('situacao deve ser todas, disponivel, baixo ou indisponivel.');
  }

  return { busca, categoria, situacao };
}

module.exports = { parseEstoqueFilters, SITUACOES };
