const test = require('node:test');
const assert = require('node:assert/strict');

// Troca os repositories reais (que acessam o MySQL) por dublês em memória.
const repositoryPath = require.resolve('../src/repositories/pedidosPecasRepository');
const funcionariosPath = require.resolve('../src/repositories/funcionariosRepository');

const estado = {
  funcionario: { id: 2, nome: 'Carlos' },
  pedido: null,
  itens: [],
  pecasAtivas: [1, 2],
  atendimentoAberto: { id: 7 },
  chamadas: [],
  enviarFunciona: true,
  decidirFunciona: true
};

function registrar(nome, argumentos) {
  estado.chamadas.push({ nome, argumentos });
}

require.cache[repositoryPath] = {
  id: repositoryPath,
  filename: repositoryPath,
  loaded: true,
  exports: {
    async findAll(parametros) {
      registrar('findAll', parametros);
      return { rows: estado.pedido ? [estado.pedido] : [], total: estado.pedido ? 1 : 0 };
    },
    async resumoPorStatus(parametros) {
      registrar('resumoPorStatus', parametros);
      return { total: 1, rascunho: 1, enviado: 0, aprovado: 0, rejeitado: 0 };
    },
    async findById() {
      return estado.pedido;
    },
    async findItens() {
      return estado.itens;
    },
    async findOptions() {
      return { pecas: [{ id: 1 }], atendimentos: [{ id: 7 }] };
    },
    async findPecasAtivas() {
      return estado.pecasAtivas;
    },
    async atendimentoAberto() {
      return estado.atendimentoAberto;
    },
    async criar(dados) {
      registrar('criar', dados);
      return { id: 50, status: dados.enviar ? 'enviado' : 'rascunho', funcionarioId: dados.funcionarioId };
    },
    async enviar(id, funcionarioId) {
      registrar('enviar', { id, funcionarioId });
      return estado.enviarFunciona;
    },
    async decidir(id, dados) {
      registrar('decidir', { id, ...dados });
      return estado.decidirFunciona;
    }
  }
};

require.cache[funcionariosPath] = {
  id: funcionariosPath,
  filename: funcionariosPath,
  loaded: true,
  exports: {
    async findByUsuarioId() {
      return estado.funcionario;
    }
  }
};

const controller = require('../src/controllers/pedidosPecasController');

function criarRespostaFake() {
  const res = {};
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

function req({ perfil = 'Funcionario', usuarioId = 10, params = {}, query = {}, body = {} } = {}) {
  return { usuarioLogado: { id: usuarioId, perfil }, params, query, body };
}

function preparar(sobrescritas = {}) {
  Object.assign(
    estado,
    {
      funcionario: { id: 2, nome: 'Carlos' },
      pedido: { id: 5, status: 'rascunho', funcionarioId: 2 },
      itens: [{ id: 1, pecaId: 1, quantidade: 2 }],
      pecasAtivas: [1, 2],
      atendimentoAberto: { id: 7 },
      chamadas: [],
      enviarFunciona: true,
      decidirFunciona: true
    },
    sobrescritas
  );
}

const PEDIDO_VALIDO = { itens: [{ pecaId: 1, quantidade: 2 }, { pecaId: 2, quantidade: 1 }] };

/* ---------- Criar ---------- */

test('create salva como rascunho por padrão, ligado ao funcionário logado', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.create(req({ body: { ...PEDIDO_VALIDO, observacao: ' Revisão ' } }), res);

  assert.equal(res.statusCode, 201);
  assert.match(res.corpo.mensagem, /rascunho/);

  const gravado = estado.chamadas.find((chamada) => chamada.nome === 'criar').argumentos;
  assert.equal(gravado.funcionarioId, 2);
  assert.equal(gravado.enviar, false);
  assert.equal(gravado.observacao, 'Revisão');
  assert.deepEqual(gravado.itens, PEDIDO_VALIDO.itens);
});

test('create com enviar=true já envia ao superior', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.create(req({ body: { ...PEDIDO_VALIDO, enviar: true } }), res);

  assert.match(res.corpo.mensagem, /enviado ao superior/);
  assert.equal(estado.chamadas.find((c) => c.nome === 'criar').argumentos.enviar, true);
});

test('create usa o funcionário do login, ignorando o que vier no corpo', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.create(req({ body: { ...PEDIDO_VALIDO, funcionarioId: 99 } }), res);

  assert.equal(estado.chamadas.find((c) => c.nome === 'criar').argumentos.funcionarioId, 2);
});

test('create recusa usuário sem funcionário vinculado', async () => {
  preparar({ funcionario: null });

  await assert.rejects(
    controller.create(req({ body: PEDIDO_VALIDO }), criarRespostaFake()),
    (erro) => erro.codigo === 'USUARIO_SEM_FUNCIONARIO' && erro.statusCode === 403
  );
});

test('create recusa peça inexistente ou inativa', async () => {
  preparar({ pecasAtivas: [1] });

  await assert.rejects(
    controller.create(req({ body: PEDIDO_VALIDO }), criarRespostaFake()),
    /não existem ou estão inativas/
  );
  assert.equal(estado.chamadas.some((c) => c.nome === 'criar'), false);
});

test('create recusa atendimento que não está em andamento', async () => {
  preparar({ atendimentoAberto: null });

  await assert.rejects(
    controller.create(req({ body: { ...PEDIDO_VALIDO, atendimentoId: 7 } }), criarRespostaFake()),
    /atendimento em andamento/
  );
});

test('create recusa pedido sem peças', async () => {
  preparar();

  await assert.rejects(
    controller.create(req({ body: { itens: [] } }), criarRespostaFake()),
    /pelo menos uma peça/
  );
});

/* ---------- Consultar ---------- */

test('list: Funcionario vê só os próprios pedidos', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.list(req({ perfil: 'Funcionario' }), res);

  const consulta = estado.chamadas.find((c) => c.nome === 'findAll').argumentos;
  assert.equal(consulta.funcionarioId, 2);
  assert.equal(res.corpo.dados.length, 1);
  assert.deepEqual(res.corpo.dados[0].permissoes, { podeEnviar: true, podeDecidir: false });
});

test('list: Administrador vê todos os pedidos', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.list(req({ perfil: 'Administrador' }), res);

  assert.equal(estado.chamadas.find((c) => c.nome === 'findAll').argumentos.funcionarioId, null);
});

test('list: repassa o filtro de status e recusa status inválido', async () => {
  preparar();

  await controller.list(req({ query: { status: 'enviado' } }), criarRespostaFake());
  assert.equal(estado.chamadas.find((c) => c.nome === 'findAll').argumentos.status, 'enviado');

  await assert.rejects(
    controller.list(req({ query: { status: 'cancelado' } }), criarRespostaFake()),
    /status deve ser/
  );
});

test('list: Funcionario sem registro de funcionário recebe lista vazia', async () => {
  preparar({ funcionario: null });
  const res = criarRespostaFake();

  await controller.list(req({ perfil: 'Funcionario' }), res);

  assert.deepEqual(res.corpo.dados, []);
  assert.equal(estado.chamadas.length, 0);
});

test('obter: dono vê o pedido com os itens', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.obter(req({ params: { id: '5' } }), res);

  assert.equal(res.corpo.dados.id, 5);
  assert.equal(res.corpo.dados.itens.length, 1);
});

test('obter: Funcionario não vê pedido de outra pessoa (responde 404)', async () => {
  preparar({ pedido: { id: 5, status: 'enviado', funcionarioId: 3 } });
  const res = criarRespostaFake();

  await controller.obter(req({ params: { id: '5' } }), res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.corpo.erro, 'PEDIDO_NAO_ENCONTRADO');
});

test('obter: Administrador vê pedido de qualquer funcionário e pode decidir', async () => {
  preparar({ pedido: { id: 5, status: 'enviado', funcionarioId: 3 }, funcionario: { id: 9 } });
  const res = criarRespostaFake();

  await controller.obter(req({ perfil: 'Administrador', params: { id: '5' } }), res);

  assert.equal(res.statusCode, undefined);
  assert.equal(res.corpo.dados.permissoes.podeDecidir, true);
});

test('obter: pedido inexistente responde 404', async () => {
  preparar({ pedido: null });
  const res = criarRespostaFake();

  await controller.obter(req({ params: { id: '5' } }), res);

  assert.equal(res.statusCode, 404);
});

/* ---------- Enviar ---------- */

test('enviar: dono envia o próprio rascunho', async () => {
  preparar();
  const res = criarRespostaFake();

  await controller.enviar(req({ params: { id: '5' } }), res);

  assert.match(res.corpo.mensagem, /enviado ao superior/);
  assert.deepEqual(estado.chamadas.find((c) => c.nome === 'enviar').argumentos, {
    id: 5,
    funcionarioId: 2
  });
});

test('enviar: recusa pedido de outra pessoa e pedido que não é rascunho', async () => {
  preparar({ pedido: { id: 5, status: 'rascunho', funcionarioId: 3 } });
  await assert.rejects(
    controller.enviar(req({ params: { id: '5' } }), criarRespostaFake()),
    (erro) => erro.codigo === 'SOMENTE_O_SOLICITANTE'
  );

  preparar({ pedido: { id: 5, status: 'enviado', funcionarioId: 2 } });
  await assert.rejects(
    controller.enviar(req({ params: { id: '5' } }), criarRespostaFake()),
    (erro) => erro.codigo === 'STATUS_NAO_PERMITIDO'
  );
});

test('enviar: devolve 409 se o status mudou no meio do caminho', async () => {
  preparar({ enviarFunciona: false });

  await assert.rejects(
    controller.enviar(req({ params: { id: '5' } }), criarRespostaFake()),
    (erro) => erro.statusCode === 409
  );
});

/* ---------- Decidir ---------- */

test('decidir: Administrador aprova pedido enviado por outra pessoa', async () => {
  preparar({ pedido: { id: 5, status: 'enviado', funcionarioId: 3 }, funcionario: { id: 9 } });
  const res = criarRespostaFake();

  await controller.decidir(
    req({ perfil: 'Administrador', usuarioId: 1, params: { id: '5' }, body: { decisao: 'aprovado' } }),
    res
  );

  assert.match(res.corpo.mensagem, /aprovado/);
  assert.deepEqual(estado.chamadas.find((c) => c.nome === 'decidir').argumentos, {
    id: 5,
    status: 'aprovado',
    motivo: null,
    usuarioId: 1
  });
});

test('decidir: rejeição exige motivo e grava quem decidiu', async () => {
  preparar({ pedido: { id: 5, status: 'enviado', funcionarioId: 3 }, funcionario: { id: 9 } });

  await assert.rejects(
    controller.decidir(
      req({ perfil: 'Administrador', params: { id: '5' }, body: { decisao: 'rejeitado' } }),
      criarRespostaFake()
    ),
    /motivo da rejeição/
  );

  const res = criarRespostaFake();
  await controller.decidir(
    req({
      perfil: 'Administrador',
      usuarioId: 1,
      params: { id: '5' },
      body: { decisao: 'rejeitado', motivo: 'Sem verba neste mês' }
    }),
    res
  );

  assert.match(res.corpo.mensagem, /rejeitado/);
  assert.equal(estado.chamadas.find((c) => c.nome === 'decidir').argumentos.motivo, 'Sem verba neste mês');
});

test('decidir: não permite decidir o próprio pedido nem pedido que não foi enviado', async () => {
  preparar({ pedido: { id: 5, status: 'enviado', funcionarioId: 9 }, funcionario: { id: 9 } });
  await assert.rejects(
    controller.decidir(
      req({ perfil: 'Administrador', params: { id: '5' }, body: { decisao: 'aprovado' } }),
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'PROPRIO_PEDIDO'
  );

  preparar({ pedido: { id: 5, status: 'aprovado', funcionarioId: 3 }, funcionario: { id: 9 } });
  await assert.rejects(
    controller.decidir(
      req({ perfil: 'Administrador', params: { id: '5' }, body: { decisao: 'rejeitado', motivo: 'Não precisa' } }),
      criarRespostaFake()
    ),
    (erro) => erro.codigo === 'STATUS_NAO_PERMITIDO'
  );
  assert.equal(estado.chamadas.some((c) => c.nome === 'decidir'), false);
});

test('decidir: devolve 409 se outra pessoa decidiu primeiro', async () => {
  preparar({
    pedido: { id: 5, status: 'enviado', funcionarioId: 3 },
    funcionario: { id: 9 },
    decidirFunciona: false
  });

  await assert.rejects(
    controller.decidir(
      req({ perfil: 'Administrador', params: { id: '5' }, body: { decisao: 'aprovado' } }),
      criarRespostaFake()
    ),
    (erro) => erro.statusCode === 409
  );
});

test('decidir: pedido inexistente responde 404', async () => {
  preparar({ pedido: null });
  const res = criarRespostaFake();

  await controller.decidir(
    req({ perfil: 'Administrador', params: { id: '5' }, body: { decisao: 'aprovado' } }),
    res
  );

  assert.equal(res.statusCode, 404);
});
