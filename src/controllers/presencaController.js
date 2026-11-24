const presencaRepository = require('../repositories/presencaRepository');
const { parseDataConsulta, parseIdFuncionario, resumirDia } = require('../utils/presenca');

// GET /api/presencas?data=AAAA-MM-DD
// Quem compareceu na data (hoje, se não informada), com o resumo do dia.
async function listar(req, res) {
  const data = parseDataConsulta(req.query);
  const presencas = await presencaRepository.listarPorData(data);

  res.json({ dados: presencas, data, resumo: resumirDia(presencas) });
}

// GET /api/presencas/presentes
// Quem está presente agora (entrou hoje e ainda não saiu).
async function presentes(req, res) {
  const lista = await presencaRepository.listarPresentes();

  res.json({ dados: lista, total: lista.length });
}

// GET /api/presencas/funcionarios
// Funcionários ativos e a situação de cada um hoje (presente, saiu ou ausente).
async function funcionarios(req, res) {
  const lista = await presencaRepository.listarFuncionariosComSituacao();

  res.json({ dados: lista });
}

// POST /api/presencas/entrada   { idFuncionario }
async function registrarEntrada(req, res) {
  const idFuncionario = parseIdFuncionario(req.body);
  const id = await presencaRepository.registrarEntrada(idFuncionario, req.usuarioLogado.id);

  res.status(201).json({ dados: { id, idFuncionario }, mensagem: 'Entrada registrada com sucesso.' });
}

// POST /api/presencas/saida   { idFuncionario }
async function registrarSaida(req, res) {
  const idFuncionario = parseIdFuncionario(req.body);
  const id = await presencaRepository.registrarSaida(idFuncionario, req.usuarioLogado.id);

  res.json({ dados: { id, idFuncionario }, mensagem: 'Saída registrada com sucesso.' });
}

module.exports = { listar, presentes, funcionarios, registrarEntrada, registrarSaida };
