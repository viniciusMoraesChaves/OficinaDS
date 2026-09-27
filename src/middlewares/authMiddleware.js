const jwt = require('jsonwebtoken');
const env = require('../config/env');

function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: 'NAO_AUTENTICADO',
      mensagem: 'Faça login para continuar.'
    });
  }

  const token = cabecalho.slice('Bearer '.length);

  try {
    req.usuario = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    return res.status(401).json({
      erro: 'TOKEN_INVALIDO',
      mensagem: 'Sessão expirada. Faça login novamente.'
    });
  }
}

module.exports = { exigirAutenticacao };