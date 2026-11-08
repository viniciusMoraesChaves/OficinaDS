const { DadosInvalidosError } = require('./erros');

function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function emailValido(email) {
  return typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email.trim());
}

function exigirTexto(valor, mensagem) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new DadosInvalidosError(mensagem);
  }
  return valor.trim();
}

function exigirCpf(valor) {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11) {
    throw new DadosInvalidosError('Informe um CPF válido com 11 dígitos.');
  }
  return cpf;
}

function exigirEmail(valor) {
  if (!emailValido(valor)) {
    throw new DadosInvalidosError('Informe um e-mail válido.');
  }
  return valor.trim().toLowerCase();
}

function exigirSenha(valor) {
  if (typeof valor !== 'string' || valor.length < 6) {
    throw new DadosInvalidosError('Informe uma senha com ao menos 6 caracteres.');
  }
  return valor;
}

module.exports = { apenasDigitos, emailValido, exigirTexto, exigirCpf, exigirEmail, exigirSenha };
