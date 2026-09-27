const usuariosRepository = require('../repositories/usuariosRepository');

// projeto n tem login/sessão ainda
// Enquanto isso não existe, o usuário logado é identificado pelo cabeçalho
// "x-usuario-id", que o front-end vai enviar depois de implementar o login.
// Quando a autenticação de verdade existir, troque essa função aqui.
async function identificarUsuario(req, res, next) {
  const idUsuario = req.header('x-usuario-id');

  if (!idUsuario) {
    return res.status(401).json({
      erro: 'USUARIO_NAO_IDENTIFICADO',
      mensagem: 'Envie o cabeçalho x-usuario-id com o usuário logado.'
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

// Uso: router.get('/rota', identificarUsuario, permitirPerfis('Administrador'), handler)
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

module.exports = { identificarUsuario, permitirPerfis };