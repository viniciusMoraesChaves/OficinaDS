const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const registro = { poolCalls: [], conexaoCalls: [], eventos: [], afetadas: 1 };

const conexao = {
  async beginTransaction() { registro.eventos.push('begin'); },
  async commit() { registro.eventos.push('commit'); },
  async rollback() { registro.eventos.push('rollback'); },
  release() { registro.eventos.push('release'); },
  async execute(sql, params = []) {
    registro.conexaoCalls.push({ sql, params });
    return [{ affectedRows: 1, insertId: 77 }];
  }
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        registro.poolCalls.push({ sql, params });

        if (/UPDATE pedido_peca/.test(sql)) {
          return [{ affectedRows: registro.afetadas }];
        }

        if (/COUNT\(\*\) AS total FROM pedido_peca p/.test(sql) && !/GROUP BY/.test(sql)) {
          return [[{ total: 1 }]];
        }

        if (/GROUP BY p\.status/.test(sql)) {
          return [[{ status: 'enviado', total: 2 }, { status: 'aprovado', total: 1 }]];
        }

        return [[{ id: 77, totalItens: '2', totalUnidades: '6' }]];
      },
      async getConnection() {
        return conexao;
      }
    }
  }
};

const repository = require('../src/repositories/pedidosPecasRepository');

function reiniciar(afetadas = 1) {
  registro.poolCalls = [];
  registro.conexaoCalls = [];
  registro.eventos = [];
  registro.afetadas = afetadas;
}

test('criar grava o pedido e todos os itens numa transação', async () => {
  reiniciar();

  await repository.criar({
    funcionarioId: 2,
    atendimentoId: 7,
    observacao: 'Revisão',
    itens: [
      { pecaId: 1, quantidade: 2 },
      { pecaId: 3, quantidade: 5 }
    ],
    enviar: false
  });

  assert.deepEqual(registro.eventos, ['begin', 'commit', 'release']);

  const pedido = registro.conexaoCalls[0];
  assert.match(pedido.sql, /INSERT INTO pedido_peca\b/);
  assert.deepEqual(pedido.params, [2, 7, 'Revisão', 'rascunho']);
  assert.match(pedido.sql, /NULL\)/);

  const itens = registro.conexaoCalls.slice(1);
  assert.equal(itens.length, 2);
  assert.deepEqual(itens[0].params, [77, 1, 2]);
  assert.deepEqual(itens[1].params, [77, 3, 5]);
});

test('criar com envio grava status enviado e a data de envio', async () => {
  reiniciar();

  await repository.criar({
    funcionarioId: 2,
    atendimentoId: null,
    observacao: null,
    itens: [{ pecaId: 1, quantidade: 1 }],
    enviar: true
  });

  const pedido = registro.conexaoCalls[0];
  assert.deepEqual(pedido.params, [2, null, null, 'enviado']);
  assert.match(pedido.sql, /CURRENT_TIMESTAMP/);
});

test('criar desfaz tudo quando a gravação de um item falha', async () => {
  reiniciar();
  const original = conexao.execute;
  let chamadas = 0;

  conexao.execute = async (sql, params) => {
    chamadas += 1;
    if (chamadas === 2) throw new Error('falha no item');
    return original(sql, params);
  };

  try {
    await assert.rejects(
      repository.criar({
        funcionarioId: 2,
        atendimentoId: null,
        observacao: null,
        itens: [{ pecaId: 1, quantidade: 1 }],
        enviar: false
      }),
      /falha no item/
    );
  } finally {
    conexao.execute = original;
  }

  assert.deepEqual(registro.eventos, ['begin', 'rollback', 'release']);
});

test('enviar só atualiza rascunho do próprio funcionário e informa se funcionou', async () => {
  reiniciar(1);
  assert.equal(await repository.enviar(5, 2), true);

  const chamada = registro.poolCalls[0];
  assert.match(chamada.sql, /WHERE id_pedido = \? AND id_funcionario = \? AND status = \?/);
  assert.deepEqual(chamada.params, ['enviado', 5, 2, 'rascunho']);

  reiniciar(0);
  assert.equal(await repository.enviar(5, 2), false);
});

test('decidir só atualiza pedido ainda enviado e grava quem decidiu', async () => {
  reiniciar(1);
  const ok = await repository.decidir(5, { status: 'rejeitado', motivo: 'Sem verba', usuarioId: 1 });

  assert.equal(ok, true);
  const chamada = registro.poolCalls[0];
  assert.match(chamada.sql, /WHERE id_pedido = \? AND status = \?/);
  assert.deepEqual(chamada.params, ['rejeitado', 'Sem verba', 1, 5, 'enviado']);

  reiniciar(0);
  assert.equal(await repository.decidir(5, { status: 'aprovado', motivo: null, usuarioId: 1 }), false);
});

test('findAll monta o filtro por status e por funcionário e converte os totais', async () => {
  reiniciar();

  const resultado = await repository.findAll({
    limite: 8,
    offset: 0,
    status: 'enviado',
    funcionarioId: 2
  });

  const contagem = registro.poolCalls[0];
  assert.match(contagem.sql, /WHERE p\.status = \? AND p\.id_funcionario = \?/);
  assert.deepEqual(contagem.params, ['enviado', 2]);

  const listagem = registro.poolCalls[1];
  assert.match(listagem.sql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(listagem.params, ['enviado', 2, 8, 0]);

  assert.equal(resultado.total, 1);
  assert.strictEqual(resultado.rows[0].totalItens, 2);
  assert.strictEqual(resultado.rows[0].totalUnidades, 6);
});

test('findAll sem filtros não usa WHERE', async () => {
  reiniciar();

  await repository.findAll({ limite: 8, offset: 0, status: 'todos', funcionarioId: null });

  assert.doesNotMatch(registro.poolCalls[0].sql, /WHERE/);
  assert.deepEqual(registro.poolCalls[0].params, []);
});

test('resumoPorStatus soma os totais por situação', async () => {
  reiniciar();

  const resumo = await repository.resumoPorStatus({ funcionarioId: 2 });

  assert.deepEqual(resumo, { total: 3, rascunho: 0, enviado: 2, aprovado: 1, rejeitado: 0 });
  assert.deepEqual(registro.poolCalls[0].params, [2]);
});
