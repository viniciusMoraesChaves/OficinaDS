const { ValidationError } = require('./queryParams');

const TIPOS = ['entrada', 'saida'];

// Categorias aceitas em cada tipo de lançamento.
const CATEGORIAS = {
  entrada: ['Serviços', 'Venda de peças', 'Outras entradas'],
  saida: [
    'Compra de peças',
    'Salários',
    'Aluguel',
    'Água, luz e internet',
    'Impostos',
    'Manutenção',
    'Outras saídas'
  ]
};

const FORMAS_PAGAMENTO = [
  'dinheiro',
  'pix',
  'cartao_debito',
  'cartao_credito',
  'boleto',
  'transferencia'
];

const VALOR_MAXIMO = 9999999.99;

function doisDigitos(numero) {
  return String(numero).padStart(2, '0');
}

// Data de hoje no fuso da aplicação, no formato AAAA-MM-DD.
function hojeIso(agora = new Date()) {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;

  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

function arredondar(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

// Aceita 150, "150.5", "150,50" e "1.234,56".
function parseValor(bruto) {
  let texto = String(bruto ?? '').trim();

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw new ValidationError('Informe um valor válido, com no máximo 2 casas decimais.');
  }

  const valor = Number(texto);

  if (valor <= 0) {
    throw new ValidationError('O valor deve ser maior que zero.');
  }

  if (valor > VALOR_MAXIMO) {
    throw new ValidationError('O valor informado é maior que o permitido.');
  }

  return valor;
}

// Valida o corpo de POST /movimentacoes. Lançamento é algo que já aconteceu:
// a data não pode ser futura.
function parseMovimentacao(body = {}, agora = new Date()) {
  const tipo = String(body.tipo || '').toLowerCase();

  if (!TIPOS.includes(tipo)) {
    throw new ValidationError('Informe se o lançamento é uma entrada ou uma saída.');
  }

  const categoria = String(body.categoria || '').trim();

  if (!CATEGORIAS[tipo].includes(categoria)) {
    throw new ValidationError('Escolha uma categoria válida para este tipo de lançamento.');
  }

  const descricao = String(body.descricao || '').trim();

  if (descricao.length < 3 || descricao.length > 150) {
    throw new ValidationError('A descrição deve ter entre 3 e 150 caracteres.');
  }

  const valor = parseValor(body.valor);

  const data = String(body.data || '').trim();

  if (!dataValida(data)) {
    throw new ValidationError('Informe a data no formato AAAA-MM-DD.');
  }

  if (data > hojeIso(agora)) {
    throw new ValidationError('A data do lançamento não pode ser futura.');
  }

  const forma = String(body.formaPagamento || '').trim();

  if (forma && !FORMAS_PAGAMENTO.includes(forma)) {
    throw new ValidationError('Forma de pagamento inválida.');
  }

  return { tipo, categoria, descricao, valor, data, formaPagamento: forma || null };
}

// Filtros de GET /movimentacoes. Todos são opcionais.
function parseFiltrosMovimentacoes(query = {}) {
  const inicio = String(query.inicio || '').trim();
  const fim = String(query.fim || '').trim();

  for (const [nome, valor] of [['inicio', inicio], ['fim', fim]]) {
    if (valor && !dataValida(valor)) {
      throw new ValidationError(`${nome} deve estar no formato AAAA-MM-DD.`);
    }
  }

  if (inicio && fim && inicio > fim) {
    throw new ValidationError('inicio não pode ser depois de fim.');
  }

  const tipoBruto = String(query.tipo || 'todos').toLowerCase();

  if (tipoBruto !== 'todos' && !TIPOS.includes(tipoBruto)) {
    throw new ValidationError('tipo deve ser todos, entrada ou saida.');
  }

  return {
    inicio,
    fim,
    tipo: tipoBruto === 'todos' ? '' : tipoBruto,
    categoria: String(query.categoria || '').trim().slice(0, 60),
    busca: String(query.busca || '').trim().slice(0, 100)
  };
}

// Entradas, saídas e resultado (lucro se positivo, prejuízo se negativo).
function montarResumo({ entradas = 0, saidas = 0, quantidade = 0 } = {}) {
  const totalEntradas = arredondar(entradas);
  const totalSaidas = arredondar(saidas);

  return {
    entradas: totalEntradas,
    saidas: totalSaidas,
    resultado: arredondar(totalEntradas - totalSaidas),
    quantidade: Number(quantidade)
  };
}

module.exports = {
  TIPOS,
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  hojeIso,
  dataValida,
  arredondar,
  parseValor,
  parseMovimentacao,
  parseFiltrosMovimentacoes,
  montarResumo
};
