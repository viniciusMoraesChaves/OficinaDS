
// Mantém os nomes dos perfis em um único lugar (evita strings soltas pelo código).

const PERFIS = Object.freeze({
  ADMINISTRADOR: 'Administrador',
  FUNCIONARIO: 'Funcionario'
});

module.exports = { PERFIS };