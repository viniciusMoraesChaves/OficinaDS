const { ValidationError } = require('./queryParams');

// Prazo para pagar depois que o cliente aceita o orçamento.
const PRAZO_PAGAMENTO_DIAS = 15;

// Faixas de atraso, em dias corridos depois do vencimento.
const FAIXAS_ATRASO = Object.freeze({
  todas: null,
  ate30: { min: 1, max: 30 },
  de31a60: { min: 31, max: 60 },
  de61a90: { min: 61, max: 90 },
  acima90: { min: 91, max: null }
});

const ORDENACOES_COBRANCAS = [
  'maior_atraso',
  'menor_atraso',
  'maior_valor',
  'menor_valor',
  'cliente'
];

const ORDENACOES_CLIENTES = ['maior_valor', 'maior_atraso', 'mais_cobrancas', 'cliente'];

const VALOR_MAXIMO = 99999999.99;

function lerTexto(valor, limite) {
  return String(valor || '').trim().slice(0, limite);
}

// Aceita "1250", "1250.50" e "1250,50". Vazio significa "sem limite".
function lerValor(valor, campo) {
  const texto = String(valor ?? '').trim().replace(',', '.');

  if (texto === '') {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw new ValidationError(`${campo} deve ser um valor em reais, como 150 ou 150,50.`);
  }

  const numero = Number(texto);

  if (numero > VALOR_MAXIMO) {
    throw new ValidationError(`${campo} é maior do que o permitido.`);
  }

  return numero;
}

// Aceita só datas reais no formato AAAA-MM-DD (rejeita 2026-02-31, por exemplo).
function lerData(valor, campo) {
  const texto = String(valor ?? '').trim();

  if (texto === '') {
    return '';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new ValidationError(`${campo} deve estar no formato AAAA-MM-DD.`);
  }

  const data = new Date(`${texto}T00:00:00Z`);

  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto) {
    throw new ValidationError(`${campo} não é uma data válida.`);
  }

  return texto;
}

// Filtros da lista de cobranças vencidas.
function parseInadimplenciaFilters(query) {
  const busca = lerTexto(query.busca, 100);
  const faixaAtraso = String(query.faixaAtraso || 'todas');
  const ordenacao = String(query.ordenacao || 'maior_atraso').toLowerCase();

  if (!Object.hasOwn(FAIXAS_ATRASO, faixaAtraso)) {
    throw new ValidationError('faixaAtraso deve ser todas, ate30, de31a60, de61a90 ou acima90.');
  }

  if (!ORDENACOES_COBRANCAS.includes(ordenacao)) {
    throw new ValidationError(`ordenacao deve ser ${ORDENACOES_COBRANCAS.join(', ')}.`);
  }

  const valorMin = lerValor(query.valorMin, 'valorMin');
  const valorMax = lerValor(query.valorMax, 'valorMax');

  if (valorMin !== null && valorMax !== null && valorMin > valorMax) {
    throw new ValidationError('O valor mínimo não pode ser maior que o valor máximo.');
  }

  const vencimentoDe = lerData(query.vencimentoDe, 'vencimentoDe');
  const vencimentoAte = lerData(query.vencimentoAte, 'vencimentoAte');

  if (vencimentoDe && vencimentoAte && vencimentoDe > vencimentoAte) {
    throw new ValidationError('A data inicial do vencimento não pode ser depois da final.');
  }

  return { busca, faixaAtraso, valorMin, valorMax, vencimentoDe, vencimentoAte, ordenacao };
}

// Filtros da lista de clientes com valores em aberto.
function parseClientesInadimplentesFilters(query) {
  const busca = lerTexto(query.busca, 100);
  const ordenacao = String(query.ordenacao || 'maior_valor').toLowerCase();

  if (!ORDENACOES_CLIENTES.includes(ordenacao)) {
    throw new ValidationError(`ordenacao deve ser ${ORDENACOES_CLIENTES.join(', ')}.`);
  }

  return { busca, ordenacao };
}

module.exports = {
  PRAZO_PAGAMENTO_DIAS,
  FAIXAS_ATRASO,
  ORDENACOES_COBRANCAS,
  ORDENACOES_CLIENTES,
  parseInadimplenciaFilters,
  parseClientesInadimplentesFilters
};
