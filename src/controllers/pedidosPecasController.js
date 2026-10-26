const pedidosPecasRepository = require('../repositories/pedidosPecasRepository');
const funcionariosRepository = require('../repositories/funcionariosRepository');
const regras = require('../utils/pedidosPecas');
const { PERFIS } = require('../utils/perfis');
const {
  ValidationError,
  parseId,
  parsePagination,
  buildPagination
} = require('../utils/queryParams');

function ehAdministrador(req) {
  return req.usuarioLogado.perfil === PERFIS.ADMINISTRADOR;
}

// Todo funcionário da oficina tem um registro em "funcionario" ligado ao login.
async function funcionarioDoUsuario(req) {
  return funcionariosRepository.findByUsuarioId(req.usuarioLogado.id);
}

function comPermissoes(pedido, req, funcionario) {
  return {
    ...pedido,
    permissoes: regras.permissoes(pedido, {
      administrador: ehAdministrador(req),
      funcionarioId: funcionario ? funcionario.id : null
    })
  };
}

function naoEncontrado(res) {
  return res.status(404).json({
    erro: 'PEDIDO_NAO_ENCONTRADO',
    mensagem: 'Pedido de peças não encontrado.'
  });
}

// Administrador vê todos os pedidos. Funcionario vê só os que ele criou.
async function list(req, res) {
  const pagination = parsePagination(req.query);
  const { status } = regras.parseFiltroStatus(req.query);
  const administrador = ehAdministrador(req);
  const funcionario = await funcionarioDoUsuario(req);

  if (!administrador && !funcionario) {
    return res.json({
      dados: [],
      resumo: { total: 0, rascunho: 0, enviado: 0, aprovado: 0, rejeitado: 0 },
      paginacao: buildPagination(pagination.pagina, pagination.limite, 0)
    });
  }

  const escopo = administrador ? null : funcionario.id;

  const [resultado, resumo] = await Promise.all([
    pedidosPecasRepository.findAll({ ...pagination, status, funcionarioId: escopo }),
    pedidosPecasRepository.resumoPorStatus({ funcionarioId: escopo })
  ]);

  return res.json({
    dados: resultado.rows.map((pedido) => comPermissoes(pedido, req, funcionario)),
    resumo,
    paginacao: buildPagination(pagination.pagina, pagination.limite, resultado.total)
  });
}

async function options(req, res) {
  const dados = await pedidosPecasRepository.findOptions();
  res.json({ dados });
}

async function obter(req, res) {
  const id = parseId(req.params.id);
  const funcionario = await funcionarioDoUsuario(req);
  const pedido = await pedidosPecasRepository.findById(id);

  // Funcionario não enxerga pedido de outra pessoa (responde como "não existe").
  const semAcesso =
    pedido && !ehAdministrador(req) && (!funcionario || pedido.funcionarioId !== funcionario.id);

  if (!pedido || semAcesso) {
    return naoEncontrado(res);
  }

  const itens = await pedidosPecasRepository.findItens(id);

  return res.json({ dados: { ...comPermissoes(pedido, req, funcionario), itens } });
}

async function create(req, res) {
  const payload = regras.parsePedido(req.body);
  const funcionario = await funcionarioDoUsuario(req);

  if (!funcionario) {
    throw new regras.RegraPedidoError(
      'USUARIO_SEM_FUNCIONARIO',
      'Seu usuário não está vinculado a um funcionário, então não pode solicitar peças.',
      403
    );
  }

  const idsPecas = payload.itens.map((item) => item.pecaId);
  const encontradas = await pedidosPecasRepository.findPecasAtivas(idsPecas);

  if (encontradas.length !== idsPecas.length) {
    throw new ValidationError('Uma ou mais peças não existem ou estão inativas.');
  }

  if (payload.atendimentoId !== null) {
    const atendimento = await pedidosPecasRepository.atendimentoAberto(payload.atendimentoId);

    if (!atendimento) {
      throw new ValidationError('Selecione um atendimento em andamento.');
    }
  }

  const criado = await pedidosPecasRepository.criar({
    funcionarioId: funcionario.id,
    atendimentoId: payload.atendimentoId,
    observacao: payload.observacao,
    itens: payload.itens,
    enviar: payload.enviar
  });

  const itens = await pedidosPecasRepository.findItens(criado.id);

  return res.status(201).json({
    mensagem: payload.enviar
      ? 'Pedido enviado ao superior.'
      : 'Pedido salvo como rascunho.',
    dados: { ...comPermissoes(criado, req, funcionario), itens }
  });
}

async function enviar(req, res) {
  const id = parseId(req.params.id);
  const funcionario = await funcionarioDoUsuario(req);
  const pedido = await pedidosPecasRepository.findById(id);

  if (!pedido) {
    return naoEncontrado(res);
  }

  regras.exigirPodeEnviar(pedido, funcionario ? funcionario.id : null);

  const enviado = await pedidosPecasRepository.enviar(id, funcionario.id);

  if (!enviado) {
    throw new regras.RegraPedidoError(
      'STATUS_NAO_PERMITIDO',
      'Só pedidos em rascunho podem ser enviados ao superior.',
      409
    );
  }

  const atualizado = await pedidosPecasRepository.findById(id);
  const itens = await pedidosPecasRepository.findItens(id);

  return res.json({
    mensagem: 'Pedido enviado ao superior.',
    dados: { ...comPermissoes(atualizado, req, funcionario), itens }
  });
}

// Aprovar ou rejeitar: rota restrita ao Administrador (o superior).
async function decidir(req, res) {
  const id = parseId(req.params.id);
  const { decisao, motivo } = regras.parseDecisao(req.body);
  const funcionario = await funcionarioDoUsuario(req);
  const pedido = await pedidosPecasRepository.findById(id);

  if (!pedido) {
    return naoEncontrado(res);
  }

  regras.exigirPodeDecidir(pedido, funcionario ? funcionario.id : null);

  const decidido = await pedidosPecasRepository.decidir(id, {
    status: decisao,
    motivo,
    usuarioId: req.usuarioLogado.id
  });

  if (!decidido) {
    throw new regras.RegraPedidoError(
      'STATUS_NAO_PERMITIDO',
      'Este pedido já foi decidido por outra pessoa. Atualize a lista.',
      409
    );
  }

  const atualizado = await pedidosPecasRepository.findById(id);
  const itens = await pedidosPecasRepository.findItens(id);

  return res.json({
    mensagem: decisao === regras.STATUS.APROVADO ? 'Pedido aprovado.' : 'Pedido rejeitado.',
    dados: { ...comPermissoes(atualizado, req, funcionario), itens }
  });
}

module.exports = { list, options, obter, create, enviar, decidir };
