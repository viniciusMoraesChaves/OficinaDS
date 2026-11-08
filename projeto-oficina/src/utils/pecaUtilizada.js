const { DadosInvalidosError } = require('./erros');

function validarQuantidadePeca(valor) {
  const quantidade = Number(valor);

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new DadosInvalidosError('Informe uma quantidade inteira maior que zero.');
  }

  return quantidade;
}

module.exports = { validarQuantidadePeca };
