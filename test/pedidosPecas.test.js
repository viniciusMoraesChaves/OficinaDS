const test = require('node:test');
const assert = require('node:assert/strict');

const regras = require('../src/utils/pedidosPecas');

function pedido(status, funcionarioId = 2) {
  return { id: 1, status, funcionarioId };
}

/* ---------- Itens e quantidades ---------- */

test('parseItens aceita peças e quantidades válidas, inclusive em texto', () => {
  assert.deepEqual(
    regras.parseItens([
      { pecaId: 3, quantidade: 2 },
      { pecaId: '5', quantidade: '10' }
    ]),
    [
      { pecaId: 3, quantidade: 2 },
      { pecaId: 5, quantidade: 10 }
    ]
  );
});

test('parseItens recusa lista vazia ou que não é lista', () => {
  assert.throws(() => regras.parseItens([]), /pelo menos uma peça/);
  assert.throws(() => regras.parseItens(undefined), /pelo menos uma peça/);
  assert.throws(() => regras.parseItens('abc'), /pelo menos uma peça/);
});

test('parseItens recusa quantidade zero, negativa, decimal ou acima do limite', () => {
  for (const quantidade of [0, -1, 1.5, '1,5', 'abc', '', null, 1000]) {
    assert.throws(
      () => regras.parseItens([{ pecaId: 1, quantidade }]),
      /quantidade/i,
      `quantidade ${quantidade}`
    );
  }
});

test('parseItens recusa peça inválida e peça repetida', () => {
  assert.throws(() => regras.parseItens([{ pecaId: 0, quantidade: 1 }]), /inteiro positivo/);
  assert.throws(() => regras.parseItens([{ quantidade: 1 }]), /inteiro positivo/);
  assert.throws(
    () =>
      regras.parseItens([
        { pecaId: 1, quantidade: 1 },
        { pecaId: 1, quantidade: 2 }
      ]),
    /mais de uma vez/
  );
});

test('parseItens limita a quantidade de peças diferentes', () => {
  const muitos = Array.from({ length: 21 }, (_, indice) => ({ pecaId: indice + 1, quantidade: 1 }));
  assert.throws(() => regras.parseItens(muitos), /no máximo 20/);
});

/* ---------- Pedido ---------- */

test('parsePedido limpa observação, atendimento opcional e flag de envio', () => {
  const itens = [{ pecaId: 1, quantidade: 2 }];

  assert.deepEqual(
    regras.parsePedido({ itens, observacao: '  Revisão  ', atendimentoId: '7', enviar: true }),
    { itens, observacao: 'Revisão', atendimentoId: 7, enviar: true }
  );

  assert.deepEqual(regras.parsePedido({ itens, observacao: '   ', atendimentoId: '' }), {
    itens,
    observacao: null,
    atendimentoId: null,
    enviar: false
  });
});

test('parsePedido só considera enviar quando é verdadeiro de fato', () => {
  const itens = [{ pecaId: 1, quantidade: 2 }];
  assert.equal(regras.parsePedido({ itens, enviar: 'true' }).enviar, false);
  assert.equal(regras.parsePedido({ itens, enviar: true }).enviar, true);
});

test('parsePedido recusa observação longa demais e atendimento inválido', () => {
  const itens = [{ pecaId: 1, quantidade: 2 }];
  assert.throws(() => regras.parsePedido({ itens, observacao: 'x'.repeat(256) }), /no máximo 255/);
  assert.throws(() => regras.parsePedido({ itens, atendimentoId: 'abc' }), /inteiro positivo/);
});

/* ---------- Filtro e decisão ---------- */

test('parseFiltroStatus aceita os status do pedido e recusa os demais', () => {
  assert.deepEqual(regras.parseFiltroStatus({}), { status: 'todos' });
  assert.deepEqual(regras.parseFiltroStatus({ status: 'ENVIADO' }), { status: 'enviado' });
  assert.throws(() => regras.parseFiltroStatus({ status: 'cancelado' }), /status deve ser/);
});

test('parseDecisao aprova com ou sem observação', () => {
  assert.deepEqual(regras.parseDecisao({ decisao: 'aprovado' }), {
    decisao: 'aprovado',
    motivo: null
  });
  assert.equal(regras.parseDecisao({ decisao: 'aprovado', motivo: ' ok ' }).motivo, 'ok');
});

test('parseDecisao exige motivo para rejeitar', () => {
  assert.throws(() => regras.parseDecisao({ decisao: 'rejeitado' }), /motivo da rejeição/);
  assert.throws(() => regras.parseDecisao({ decisao: 'rejeitado', motivo: 'ab' }), /motivo da rejeição/);
  assert.equal(
    regras.parseDecisao({ decisao: 'rejeitado', motivo: 'Já temos em estoque' }).decisao,
    'rejeitado'
  );
});

test('parseDecisao recusa decisão desconhecida', () => {
  assert.throws(() => regras.parseDecisao({ decisao: 'talvez' }), /aprovado ou rejeitado/);
  assert.throws(() => regras.parseDecisao({}), /aprovado ou rejeitado/);
});

/* ---------- Envio ---------- */

test('exigirPodeEnviar permite o dono enviar o próprio rascunho', () => {
  assert.doesNotThrow(() => regras.exigirPodeEnviar(pedido('rascunho', 2), 2));
});

test('exigirPodeEnviar recusa quem não é o dono', () => {
  assert.throws(
    () => regras.exigirPodeEnviar(pedido('rascunho', 2), 3),
    (erro) => erro.codigo === 'SOMENTE_O_SOLICITANTE' && erro.statusCode === 403
  );
  assert.throws(
    () => regras.exigirPodeEnviar(pedido('rascunho', 2), null),
    (erro) => erro.codigo === 'SOMENTE_O_SOLICITANTE'
  );
});

test('exigirPodeEnviar recusa pedido que não está em rascunho', () => {
  for (const status of ['enviado', 'aprovado', 'rejeitado']) {
    assert.throws(
      () => regras.exigirPodeEnviar(pedido(status, 2), 2),
      (erro) => erro.codigo === 'STATUS_NAO_PERMITIDO' && erro.statusCode === 422,
      status
    );
  }
});

/* ---------- Decisão ---------- */

test('exigirPodeDecidir permite decidir pedido enviado de outra pessoa', () => {
  assert.doesNotThrow(() => regras.exigirPodeDecidir(pedido('enviado', 2), 9));
  assert.doesNotThrow(() => regras.exigirPodeDecidir(pedido('enviado', 2), null));
});

test('exigirPodeDecidir recusa pedido fora do status enviado', () => {
  for (const status of ['rascunho', 'aprovado', 'rejeitado']) {
    assert.throws(
      () => regras.exigirPodeDecidir(pedido(status, 2), 9),
      (erro) => erro.codigo === 'STATUS_NAO_PERMITIDO',
      status
    );
  }
});

test('exigirPodeDecidir não deixa decidir o próprio pedido', () => {
  assert.throws(
    () => regras.exigirPodeDecidir(pedido('enviado', 2), 2),
    (erro) => erro.codigo === 'PROPRIO_PEDIDO' && erro.statusCode === 403
  );
});

/* ---------- Permissões para a tela ---------- */

test('permissoes indica as ações disponíveis para cada situação', () => {
  assert.deepEqual(
    regras.permissoes(pedido('rascunho', 2), { administrador: false, funcionarioId: 2 }),
    { podeEnviar: true, podeDecidir: false }
  );

  assert.deepEqual(
    regras.permissoes(pedido('enviado', 2), { administrador: true, funcionarioId: 9 }),
    { podeEnviar: false, podeDecidir: true }
  );

  assert.deepEqual(
    regras.permissoes(pedido('enviado', 2), { administrador: true, funcionarioId: 2 }),
    { podeEnviar: false, podeDecidir: false }
  );

  assert.deepEqual(
    regras.permissoes(pedido('enviado', 2), { administrador: false, funcionarioId: 3 }),
    { podeEnviar: false, podeDecidir: false }
  );

  assert.deepEqual(
    regras.permissoes(pedido('aprovado', 2), { administrador: true, funcionarioId: 9 }),
    { podeEnviar: false, podeDecidir: false }
  );
});
