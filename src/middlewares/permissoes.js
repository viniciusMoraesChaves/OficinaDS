const { exigirAutenticacao } = require('./authMiddleware');
const usuariosRepository = require('../repositories/usuariosRepository');

// Roda depois de exigirAutenticacao. Usa o id_usuario que veio dentro do
// token (JWT) para buscar o usuário completo, já com o nome do perfil.
async function carregarUsuarioLogado(req, res, next) {
  const idUsuario = req.usuario?.id_usuario;

  if (!idUsuario) {
    return res.status(401).json({
      erro: 'USUARIO_NAO_IDENTIFICADO',
      mensagem: 'Faça login para continuar.'
    });
  }

  const usuario = await usuariosRepository.buscarComPerfilPorId(idUsuario);

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({
      erro: 'USUARIO_INVALIDO',
      mensagem: 'Usuário não encontrado ou inativo.'
    });
  }

  req.usuarioLogado = usuario;
  next();
}

// Uso: router.get('/rota', carregarUsuarioLogado, permitirPerfis('Administrador'), handler)
function permitirPerfis(...perfisPermitidos) {
  return function verificarPerfil(req, res, next) {
    const usuario = req.usuarioLogado;

    if (!usuario) {
      return res.status(401).json({
        erro: 'USUARIO_NAO_IDENTIFICADO',
        mensagem: 'É necessário identificar o usuário antes de validar o perfil.'
      });
    }

    if (!perfisPermitidos.includes(usuario.perfil)) {
      return res.status(403).json({
        erro: 'PERMISSAO_NEGADA',
        mensagem: 'Este perfil não tem acesso a esta funcionalidade.'
      });
    }

    next();
  };
}

// Atalho que junta as três etapas: exigir login (JWT) + carregar o perfil +
// validar se o perfil pode acessar a rota.
// Uso: router.get('/rota', protegerRota('Administrador'), handler)
function protegerRota(...perfisPermitidos) {
  return [exigirAutenticacao, carregarUsuarioLogado, permitirPerfis(...perfisPermitidos)];
}

module.exports = { carregarUsuarioLogado, permitirPerfis, protegerRota };