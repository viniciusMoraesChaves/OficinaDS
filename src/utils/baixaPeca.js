const { DadosInvalidosError } = require('./erros');

function parseBaixaPeca(body = {}) {
  const quantidade = Number(body.quantidade);
  const motivo = String(body.motivo || '').trim();

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new DadosInvalidosError('Informe uma quantidade inteira maior que zero.');
  }
  if (motivo.length < 5 || motivo.length > 255) {
    throw new DadosInvalidosError('Informe um motivo entre 5 e 255 caracteres.');
  }

  return { quantidade, motivo };
}

module.exports = { parseBaixaPeca };
