function notFoundApi(req, res) {
  res.status(404).json({
    erro: 'ROTA_NAO_ENCONTRADA',
    mensagem: `A rota ${req.method} ${req.originalUrl} não existe.`
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      erro: error.name === 'ValidationError' ? 'PARAMETRO_INVALIDO' : 'ERRO',
      mensagem: error.message
    });
  }

  console.error(error);

  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      erro: 'BANCO_INDISPONIVEL',
      mensagem: 'Não foi possível conectar ao MySQL. Confirme se o serviço está iniciado e se o arquivo .env está correto.'
    });
  }

  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({
      erro: 'ACESSO_BANCO_NEGADO',
      mensagem: 'O MySQL recusou o usuário ou a senha informados no arquivo .env.'
    });
  }

  if (error.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({
      erro: 'BANCO_NAO_ENCONTRADO',
      mensagem: 'O banco oficina_ds não existe. Execute os scripts da pasta database.'
    });
  }

  return res.status(500).json({
    erro: 'ERRO_INTERNO',
    mensagem: 'Ocorreu um erro inesperado no servidor.'
  });
}

module.exports = { notFoundApi, errorHandler };
