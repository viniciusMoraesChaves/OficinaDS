const avaliacoesRepository = require('../repositories/avaliacoesRepository');
const clientesRepository = require('../repositories/clientesRepository');
const { parseId } = require('../utils/queryParams');
const { ConflitoError } = require('../utils/erros');
const { lerNota, atendimentoConcluido } = require('../utils/avaliacoes');

// Só o cliente avalia. O Administrador passa pela permissão, mas não tem cadastro de
// cliente, então não consegue avaliar em nome de ninguém.
async function buscarClienteLogado(req, res) {
  const cliente = await clientesRepository.findByUsuarioId(req.usuarioLogado.id);

  if (!cliente) {
    res.status(403).json({
      erro: 'CLIENTE_NAO_ENCONTRADO',
      mensagem: 'Somente clientes podem avaliar atendimentos.'
    });
  }

  return cliente;
}

// GET /api/avaliacoes/meus
async function listarMinhas(req, res) {
  const cliente = await buscarClienteLogado(req, res);
  if (!cliente) return;

  const dados = await avaliacoesRepository.listarDoCliente(cliente.id);

  res.json({ dados });
}

// POST /api/avaliacoes   { idAtendimento, nota }
async function registrar(req, res) {
  const cliente = await buscarClienteLogado(req, res);
  if (!cliente) return;

  const corpo = req.body ?? {};
  const idAtendimento = parseId(corpo.idAtendimento);
  const nota = lerNota(corpo.nota);

  const atendimento = await avaliacoesRepository.buscarAtendimento(idAtendimento);

  // Atendimento de outro cliente responde igual a "não existe", para não revelar nada.
  if (!atendimento || atendimento.idCliente !== cliente.id) {
    return res.status(404).json({
      erro: 'ATENDIMENTO_NAO_ENCONTRADO',
      mensagem: 'Atendimento não encontrado.'
    });
  }

  if (atendimento.nota !== null) {
    throw new ConflitoError('Este atendimento já foi avaliado.');
  }

  if (!atendimentoConcluido(atendimento)) {
    throw new ConflitoError(
      'Você só pode avaliar o atendimento depois que o serviço for concluído.'
    );
  }

  // O atendimento pode ter sido criado sem profissional responsável (script 12).
  if (!atendimento.idFuncionario) {
    throw new ConflitoError('Este atendimento não tem um funcionário responsável para ser avaliado.');
  }

  const id = await avaliacoesRepository.registrar({
    idAtendimento: atendimento.id,
    idFuncionario: atendimento.idFuncionario,
    idCliente: cliente.id,
    nota
  });

  res.status(201).json({
    mensagem: 'Avaliação registrada. Obrigado!',
    dados: { id, idAtendimento: atendimento.id, idFuncionario: atendimento.idFuncionario, nota }
  });
}

module.exports = { listarMinhas, registrar };
