// Erros de negócio com código HTTP. O errorHandler converte em JSON.

class ConflitoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflitoError';
    this.statusCode = 409;
    this.codigo = 'CONFLITO';
  }
}

class DadosInvalidosError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DadosInvalidosError';
    this.statusCode = 400;
    this.codigo = 'PARAMETRO_INVALIDO';
  }
}

module.exports = { ConflitoError, DadosInvalidosError };
