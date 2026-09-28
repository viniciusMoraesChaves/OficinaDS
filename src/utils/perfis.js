// DM-134 - Modelo de perfis de usuário
// Mantém os nomes dos perfis em um único lugar (evita strings soltas pelo código).

const PERFIS = Object.freeze({
  ADMINISTRADOR: 'Administrador',
  FUNCIONARIO: 'Funcionario',
  CLIENTE: 'Cliente'
});

module.exports = { PERFIS };