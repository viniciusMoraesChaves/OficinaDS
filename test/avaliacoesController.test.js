const test = require('node:test');
const assert = require('node:assert/strict');

function simular(caminho, exports) {
  const resolvido = require.resolve(caminho);
  require.cache[resolvido] = { id: resolvido, filename: resolvido, loaded: true, exports };
}

const chamadas = [];
let cliente = { id: 5 };
let atendimento = { id: 3, idCliente: 5, idFuncionario: 2, status: 'aberto', etapaAtual: 'Concluída', nota: null };

simular('../src/repositories/clientesRepository', {
  async findByUsuarioId() {
    return cliente;
  }
});

simular('../src/repositories/avaliacoesRepository', {
  async buscarAtendimento(id) {
    chamadas.push(['buscarAtendimento', id]);
    return atendimento;
  },
  async registrar(dados) {
    chamadas.push(['registrar', dados]);
    return 41;
  },
  async listarDoCliente(id) {
    chamadas.push(['listarDoCliente', id]);
    return [{ id: 3, funcionarioNome: 'Carlos', nota: null }];
  }
});

const { registrar, listarMinhas } = require('../src/controllers/avaliacoesController');

function resposta() {
  const res = { statusCode: 200 };
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (corpo) => {
    res.corpo = corpo;
    return res;
  };
  return res;
}

const requisicao = (body) => ({ body, usuarioLogado: { id: 30 } });

test('registra a avaliação de um atendimento concluído do próprio cliente', async () => {
  chamadas.length = 0;
  const res = resposta();

  await registrar(requisicao({ idAtendimento: 3, nota: 5 }), res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(chamadas[1], ['registrar', { idAtendimento: 3, idFuncionario: 2, idCliente: 5, nota: 5 }]);
  assert.deepEqual(res.corpo.dados, { id: 41, idAtendimento: 3, idFuncionario: 2, nota: 5 });
});

test('o funcionário avaliado é sempre o responsável pelo atendimento', async () => {
  chamadas.length = 0;

  await registrar(requisicao({ idAtendimento: 3, nota: 4, idFuncionario: 99 }), resposta());

  assert.equal(chamadas[1][1].idFuncionario, 2);
});

test('aceita id e nota como texto', async () => {
  chamadas.length = 0;
  const res = resposta();

  await registrar(requisicao({ idAtendimento: '3', nota: '4' }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(chamadas[1][1].nota, 4);
});

test('nota inválida responde 400 e não consulta nem grava nada', async () => {
  for (const nota of [0, 6, 4.5, 'abc', '', null, undefined]) {
    chamadas.length = 0;

    await assert.rejects(
      () => registrar(requisicao({ idAtendimento: 3, nota }), resposta()),
      { statusCode: 400 },
      String(nota)
    );
    assert.equal(chamadas.length, 0, String(nota));
  }
});

test('atendimento inválido ou ausente responde 400', async () => {
  for (const corpo of [{ nota: 5 }, { idAtendimento: 'abc', nota: 5 }, { idAtendimento: 0, nota: 5 }, undefined]) {
    await assert.rejects(() => registrar(requisicao(corpo), resposta()), { statusCode: 400 });
  }
});

test('atendimento inexistente responde 404', async () => {
  const anterior = atendimento;
  atendimento = null;
  const res = resposta();

  await registrar(requisicao({ idAtendimento: 99, nota: 5 }), res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.corpo.erro, 'ATENDIMENTO_NAO_ENCONTRADO');
  atendimento = anterior;
});

test('atendimento de outro cliente responde 404, igual a inexistente', async () => {
  const anterior = atendimento;
  atendimento = { ...anterior, idCliente: 77 };
  chamadas.length = 0;
  const res = resposta();

  await registrar(requisicao({ idAtendimento: 3, nota: 5 }), res);

  assert.equal(res.statusCode, 404);
  assert.equal(chamadas.some(([nome]) => nome === 'registrar'), false);
  atendimento = anterior;
});

test('atendimento já avaliado responde 409', async () => {
  const anterior = atendimento;
  atendimento = { ...anterior, nota: 4 };

  await assert.rejects(
    () => registrar(requisicao({ idAtendimento: 3, nota: 5 }), resposta()),
    { statusCode: 409, message: 'Este atendimento já foi avaliado.' }
  );
  atendimento = anterior;
});

test('atendimento ainda em andamento ou cancelado responde 409', async () => {
  const anterior = atendimento;

  for (const parcial of [{ status: 'aberto', etapaAtual: 'Em serviço' }, { status: 'cancelado', etapaAtual: 'Concluída' }]) {
    atendimento = { ...anterior, ...parcial };
    chamadas.length = 0;

    await assert.rejects(
      () => registrar(requisicao({ idAtendimento: 3, nota: 5 }), resposta()),
      { statusCode: 409 }
    );
    assert.equal(chamadas.some(([nome]) => nome === 'registrar'), false);
  }
  atendimento = anterior;
});

test('atendimento sem funcionário responsável responde 409, sem gravar', async () => {
  const anterior = atendimento;
  atendimento = { ...anterior, idFuncionario: null };
  chamadas.length = 0;

  await assert.rejects(
    () => registrar(requisicao({ idAtendimento: 3, nota: 5 }), resposta()),
    { statusCode: 409, message: /funcionário responsável/ }
  );
  assert.equal(chamadas.some(([nome]) => nome === 'registrar'), false);
  atendimento = anterior;
});

test('quem não é cliente (como o Administrador) recebe 403', async () => {
  const anterior = cliente;
  cliente = null;
  chamadas.length = 0;
  const res = resposta();

  await registrar(requisicao({ idAtendimento: 3, nota: 5 }), res);
  assert.equal(res.statusCode, 403);

  const lista = resposta();
  await listarMinhas(requisicao(), lista);
  assert.equal(lista.statusCode, 403);

  assert.equal(chamadas.length, 0);
  cliente = anterior;
});

test('listarMinhas devolve os atendimentos do cliente logado', async () => {
  chamadas.length = 0;
  const res = resposta();

  await listarMinhas(requisicao(), res);

  assert.deepEqual(chamadas, [['listarDoCliente', 5]]);
  assert.equal(res.corpo.dados[0].funcionarioNome, 'Carlos');
});
