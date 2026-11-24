const { DadosInvalidosError } = require('./erros');

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

// Data consultada em GET /presencas. Sem data, é hoje; datas futuras não têm presença.
function parseDataConsulta(query = {}, agora = new Date()) {
  const hoje = hojeIso(agora);
  const data = String(query.data || '').trim() || hoje;

  if (!dataValida(data)) {
    throw new DadosInvalidosError('Informe a data no formato AAAA-MM-DD.');
  }

  if (data > hoje) {
    throw new DadosInvalidosError('Não há presença registrada em datas futuras.');
  }

  return data;
}

function parseIdFuncionario(body = {}) {
  const id = Number(body.idFuncionario);

  if (!Number.isInteger(id) || id <= 0) {
    throw new DadosInvalidosError('Selecione um funcionário.');
  }

  return id;
}

// Situação de um período de presença:
//   presente  = entrou hoje e ainda não saiu;
//   saiu      = tem saída registrada;
//   sem_saida = entrou em um dia anterior e a saída nunca foi registrada.
function situacaoDoPeriodo({ saidaEm, data }, hoje) {
  if (saidaEm) return 'saiu';
  return data === hoje ? 'presente' : 'sem_saida';
}

function montarPresenca(linha, hoje) {
  const situacao = situacaoDoPeriodo(linha, hoje);

  return {
    id: linha.id,
    idFuncionario: linha.idFuncionario,
    nome: linha.nome,
    cargo: linha.cargo,
    data: linha.data,
    entradaEm: linha.entradaEm,
    saidaEm: linha.saidaEm || null,
    // Período sem saída de um dia anterior não tem duração confiável.
    minutos: situacao === 'sem_saida' ? null : Number(linha.minutos),
    situacao
  };
}

// Situação do funcionário hoje, para os botões de entrada e saída.
function situacaoHoje({ presenteDesde, registrosHoje }) {
  if (presenteDesde) return 'presente';
  return Number(registrosHoje) > 0 ? 'saiu' : 'ausente';
}

function resumirDia(presencas) {
  return {
    compareceram: new Set(presencas.map((p) => p.idFuncionario)).size,
    registros: presencas.length,
    semSaida: presencas.filter((p) => p.situacao === 'sem_saida').length
  };
}

module.exports = {
  hojeIso,
  dataValida,
  parseDataConsulta,
  parseIdFuncionario,
  situacaoDoPeriodo,
  montarPresenca,
  situacaoHoje,
  resumirDia
};
