const { DadosInvalidosError } = require('./erros');

function textoObrigatorio(valor, campo, tamanhoMaximo) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > tamanhoMaximo) {
    throw new DadosInvalidosError(`${campo} deve ter entre 1 e ${tamanhoMaximo} caracteres.`);
  }
  return valor.trim();
}

function textoOpcional(valor, campo, tamanhoMaximo) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || valor.trim().length > tamanhoMaximo) {
    throw new DadosInvalidosError(`${campo} deve ter no máximo ${tamanhoMaximo} caracteres.`);
  }
  return valor.trim() || null;
}

function parseNovoVeiculo(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DadosInvalidosError('Informe os dados do veículo.');
  }

  const clienteId = Number(body.clienteId);
  if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
    throw new DadosInvalidosError('Selecione um cliente válido.');
  }

  if (typeof body.placa !== 'string') {
    throw new DadosInvalidosError('Informe uma placa válida.');
  }

  const placa = body.placa.trim().toUpperCase().replace(/[\s-]/g, '');
  // Padrão antigo (ABC1234) e Mercosul (ABC1D23).
  if (!/^[A-Z]{3}(?:[0-9]{4}|[0-9][A-Z][0-9]{2})$/.test(placa)) {
    throw new DadosInvalidosError('Informe uma placa válida (ABC1234 ou ABC1D23).');
  }

  const marca = textoObrigatorio(body.marca, 'Marca', 60);
  const modelo = textoObrigatorio(body.modelo, 'Modelo', 80);
  const ano = Number(body.ano);
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) {
    throw new DadosInvalidosError('O ano do veículo deve estar entre 1900 e 2200.');
  }

  const cor = textoOpcional(body.cor, 'Cor', 40);
  const chassiInformado = textoOpcional(body.chassi, 'Chassi', 30);
  const chassi = chassiInformado ? chassiInformado.toUpperCase() : null;

  return { clienteId, placa, marca, modelo, ano, cor, chassi };
}

module.exports = { parseNovoVeiculo };
