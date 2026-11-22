const test = require('node:test');
const assert = require('node:assert/strict');

// Precisa ser definido antes de carregar o controller (a configuração é lida uma vez).
process.env.CADASTRO_OFICINA_PUBLICO = 'false';

const { cadastrar } = require('../src/controllers/authController');

function respostaFalsa() {
  return {
    statusCode: undefined,
    corpo: undefined,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(valor) {
      this.corpo = valor;
      return this;
    }
  };
}

test('com o cadastro de equipe desativado, tipoAcesso "oficina" responde 403 sem tocar no banco', async () => {
  const res = respostaFalsa();
  let erro;

  await cadastrar(
    { body: { tipoAcesso: 'oficina', nome: 'X', cpf: '12345678901', email: 'x@x.com', senha: '123456' } },
    res,
    (e) => {
      erro = e;
    }
  );

  assert.equal(erro, undefined);
  assert.equal(res.statusCode, 403);
  assert.equal(res.corpo.erro, 'CADASTRO_DESATIVADO');
});

test('sem tipoAcesso informado também é tratado como cadastro de equipe', async () => {
  const res = respostaFalsa();

  await cadastrar({ body: {} }, res, () => {});

  assert.equal(res.statusCode, 403);
});
