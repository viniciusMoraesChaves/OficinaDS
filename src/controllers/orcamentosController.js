const orcamentosRepository = require('../repositories/orcamentosRepository');
const clientesRepository = require('../repositories/clientesRepository');
const funcionariosRepository = require('../repositories/funcionariosRepository');
const { parseId } = require('../utils/queryParams');
const { validarDecisao } = require('../utils/statusOrcamento');

async function criarAtendimento(req, res) {
  const idCliente = Number(req.body.idCliente);
  const idVeiculo = Number(req.body.idVeiculo);

  if (!Number.isInteger(idCliente) || idCliente <= 0) {
    return res.status(400).json({ mensagem: 'Cliente inválido.' });
  }
  if (!Number.isInteger(idVeiculo) || idVeiculo <= 0) {
    return res.status(400).json({ mensagem: 'Veículo inválido.' });
  }

  const cliente = await clientesRepository.findById(idCliente);
  if (!cliente) {
    return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
  }

  const pertence = await orcamentosRepository.veiculoPertenceAoCliente(idVeiculo, idCliente);
  if (!pertence) {
    return res.status(400).json({ mensagem: 'Este veículo não pertence ao cliente informado.' });
  }

  // Quem não tem registro de funcionário (ex.: Administrador criado direto no
  // banco) pode abrir atendimentos; o responsável fica em branco.
  const funcionario = await funcionariosRepository.findByUsuarioId(req.usuarioLogado.id);

  const atendimento = await orcamentosRepository.criarAtendimento({
    idCliente,
    idVeiculo,
    idFuncionario: funcionario ? funcionario.id : null
  });

  res.status(201).json({ dados: atendimento });
}

async function listarAtendimentos(req, res) {
  const atendimentos = await orcamentosRepository.listarAtendimentosAbertos();
  res.json({ dados: atendimentos });
}

async function removerAtendimento(req, res) {
  const idAtendimento = parseId(req.params.id);
  const atendimento = await orcamentosRepository.buscarAtendimentoPorId(idAtendimento);

  if (!atendimento) {
    return res.status(404).json({ mensagem: 'Atendimento não encontrado.' });
  }

  const cancelado = await orcamentosRepository.cancelarAtendimento(idAtendimento);
  if (!cancelado) {
    return res.status(409).json({ mensagem: 'Este atendimento já foi encerrado.' });
  }

  res.json({ mensagem: 'Cliente removido do atendimento.' });
}

async function criarOrcamento(req, res) {
  const idAtendimento = parseId(req.params.id);
  const { situacaoVeiculo, itens } = req.body;

  if (!situacaoVeiculo || typeof situacaoVeiculo !== 'string' || !situacaoVeiculo.trim()) {
    return res.status(400).json({ mensagem: 'Descreva a situação do veículo.' });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ mensagem: 'Adicione ao menos um item de custo.' });
  }

  const itensValidados = [];
  for (const item of itens) {
    const descricao = String(item.descricao || '').trim();
    const valor = Number(item.valor);

    if (!descricao) {
      return res.status(400).json({ mensagem: 'Todo item precisa de uma descrição.' });
    }
    if (!Number.isFinite(valor) || valor < 0) {
      return res.status(400).json({ mensagem: 'Todo item precisa de um valor válido (maior ou igual a zero).' });
    }

    itensValidados.push({ descricao, valor });
  }

  const atendimento = await orcamentosRepository.buscarAtendimentoPorId(idAtendimento);
  if (!atendimento) {
    return res.status(404).json({ mensagem: 'Atendimento não encontrado.' });
  }

  const orcamento = await orcamentosRepository.criarOrcamento({
    idAtendimento,
    situacaoVeiculo: situacaoVeiculo.trim(),
    itens: itensValidados
  });

  res.status(201).json({ dados: orcamento });
}

async function obterOrcamento(req, res) {
  const idOrcamento = parseId(req.params.id);
  const orcamento = await orcamentosRepository.buscarPorId(idOrcamento);

  if (!orcamento) {
    return res.status(404).json({ mensagem: 'Orçamento não encontrado.' });
  }

  if (req.usuarioLogado.perfil === 'Cliente') {
    const cliente = await clientesRepository.findByUsuarioId(req.usuarioLogado.id);
    if (!cliente || cliente.id !== orcamento.idCliente) {
      return res.status(403).json({ mensagem: 'Você não tem acesso a este orçamento.' });
    }
  }

  res.json({ dados: orcamento });
}

async function listarTodos(req, res) {
  const orcamentos = await orcamentosRepository.listarParaEquipe();
  res.json({ dados: orcamentos });
}

async function listarMeus(req, res) {
  const cliente = await clientesRepository.findByUsuarioId(req.usuarioLogado.id);
  if (!cliente) {
    return res.json({ dados: [] });
  }

  const orcamentos = await orcamentosRepository.listarPorCliente(cliente.id);
  res.json({ dados: orcamentos });
}

async function enviarOrcamento(req, res) {
  const idOrcamento = parseId(req.params.id);
  const enviado = await orcamentosRepository.marcarComoEnviado(idOrcamento);

  if (!enviado) {
    return res.status(409).json({ mensagem: 'Este orçamento não pode ser enviado (já foi enviado ou não existe).' });
  }

  res.json({ mensagem: 'Orçamento enviado ao cliente.' });
}

async function decidirOrcamento(req, res) {
  const idOrcamento = parseId(req.params.id);
  const decisao = String(req.body.decisao || '').trim().toLowerCase();

  const cliente = await clientesRepository.findByUsuarioId(req.usuarioLogado.id);
  const orcamento = await orcamentosRepository.buscarPorId(idOrcamento);

  if (!orcamento || !cliente || cliente.id !== orcamento.idCliente) {
    return res.status(404).json({ mensagem: 'Orçamento não encontrado.' });
  }

  validarDecisao(orcamento, decisao);

  const atualizado = await orcamentosRepository.registrarDecisao(idOrcamento, decisao);
  if (!atualizado) {
    return res.status(409).json({ mensagem: 'Este orçamento já teve uma decisão registrada.' });
  }

  res.json({ mensagem: decisao === 'aceito' ? 'Orçamento aceito.' : 'Orçamento recusado.' });
}

module.exports = {
  criarAtendimento,
  listarAtendimentos,
  removerAtendimento,
  criarOrcamento,
  obterOrcamento,
  listarMeus,
  listarTodos,
  enviarOrcamento,
  decidirOrcamento
};
