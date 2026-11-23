const repository = require('../repositories/danosChegadaRepository');
const { parseId, ValidationError } = require('../utils/queryParams');
const { PERFIS } = require('../utils/perfis');

function validarDescricao(body) {
  const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() : '';
  if (descricao.length < 10 || descricao.length > 1000) {
    throw new ValidationError('Descreva o dano com 10 a 1000 caracteres.');
  }
  return descricao;
}

async function listar(req, res) {
  const idAtendimento = parseId(req.params.id);
  const atendimento = await repository.buscarAtendimento(idAtendimento);
  if (!atendimento) {
    return res.status(404).json({ erro: 'ATENDIMENTO_NAO_ENCONTRADO', mensagem: 'Atendimento não encontrado.' });
  }
  return res.json({ dados: await repository.listar(idAtendimento) });
}

async function registrar(req, res) {
  const idAtendimento = parseId(req.params.id);
  const descricao = validarDescricao(req.body);
  const usuario = req.usuarioLogado;

  // Funcionarios ativos ou administradores podem registrar; identifica-se
  // sempre a conta autenticada, jamais um id informado no corpo do pedido.
  if (usuario.perfil !== PERFIS.ADMINISTRADOR) {
    const funcionario = await repository.buscarFuncionarioDoUsuario(usuario.id);
    if (!funcionario) {
      return res.status(403).json({ erro: 'FUNCIONARIO_NAO_VINCULADO', mensagem: 'Sua conta precisa de um cadastro de funcionário ativo.' });
    }
  }

  const atendimento = await repository.buscarAtendimento(idAtendimento);
  if (!atendimento) {
    return res.status(404).json({ erro: 'ATENDIMENTO_NAO_ENCONTRADO', mensagem: 'Atendimento não encontrado.' });
  }
  if (atendimento.status !== 'aberto') {
    return res.status(409).json({ erro: 'ATENDIMENTO_ENCERRADO', mensagem: 'Não é possível registrar danos em um atendimento encerrado.' });
  }

  const id = await repository.registrar(idAtendimento, usuario.id, descricao);
  if (!id) {
    return res.status(409).json({ erro: 'ATENDIMENTO_ENCERRADO', mensagem: 'O atendimento foi encerrado antes do registro.' });
  }
  return res.status(201).json({ mensagem: 'Dano registrado com sucesso.', dados: { id } });
}

module.exports = { listar, registrar, validarDescricao };
