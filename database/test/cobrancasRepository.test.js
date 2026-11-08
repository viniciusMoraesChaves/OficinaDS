const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const calls = [];
let resultadoInsert = { affectedRows: 1 };
let resultadoUpdate = { affectedRows: 1 };
let statusAtual = [];

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    pool: {
      async execute(sql, params = []) {
        calls.push({ sql, params });

        if (sql.includes('INSERT INTO cobranca')) return [resultadoInsert];
        if (sql.includes('UPDATE cobranca')) return [resultadoUpdate];
        if (sql.includes('SELECT status FROM cobranca')) return [statusAtual];
        if (sql.includes('COUNT(DISTINCT c.id_cliente) AS total')) return [[{ total: 1 }]];
        if (sql.includes('GROUP BY cl.id_cliente')) {
          return [[{
            id: 4,
            nome: 'Patrícia Nunes',
            quantidadeCobrancas: '2',
            valorEmAberto: '860.50',
            vencimentoMaisAntigo: '2026-08-01',
            maiorAtrasoDias: '97'
          }]];
        }
        if (sql.includes('COUNT(*) AS total, COALESCE(SUM(c.valor), 0) AS valorTotal')) {
          return [[{ total: 2, valorTotal: '1730.00' }]];
        }
        if (sql.includes('AS valorVencido')) {
          return [[{
            valorVencido: '2500.00',
            cobrancasVencidas: 5,
            clientesInadimplentes: 3,
            maiorAtrasoDias: 100,
            valorAVencer: '90.00'
          }]];
        }
        if (sql.includes('AS quantidade')) return [[{ quantidade: 5, valor: '2500.00' }]];

        return [[{ id: 1, valor: '480.00', diasAtraso: '75', clienteNome: 'Ricardo Melo' }]];
      }
    }
  }
};

const cobrancasRepository = require('../src/repositories/cobrancasRepository');

test('montarFiltro sempre limita a cobranças pendentes e já vencidas', () => {
  const { where, parametros } = cobrancasRepository.montarFiltro({});

  assert.match(where, /c\.status = 'pendente'/);
  assert.match(where, /c\.data_vencimento < CURDATE\(\)/);
  assert.deepEqual(parametros, []);
});

test('montarFiltro combina busca, faixa, valores e datas nos parâmetros', () => {
  const { where, parametros } = cobrancasRepository.montarFiltro({
    busca: 'abc-1d23',
    faixaAtraso: 'de31a60',
    valorMin: 100,
    valorMax: 900.5,
    vencimentoDe: '2026-01-01',
    vencimentoAte: '2026-02-01'
  });

  assert.match(where, /cl\.nome LIKE \?/);
  assert.match(where, /REPLACE\(v\.placa, '-', ''\) LIKE \?/);
  assert.doesNotMatch(where, /cl\.cpf LIKE/, 'busca sem dígitos não procura CPF');
  assert.match(where, /DATEDIFF\(CURDATE\(\), c\.data_vencimento\) >= \?/);
  assert.match(where, /DATEDIFF\(CURDATE\(\), c\.data_vencimento\) <= \?/);
  assert.deepEqual(parametros, [
    '%abc-1d23%', '%abc1d23%', 31, 60, 100, 900.5, '2026-01-01', '2026-02-01'
  ]);
});

test('faixa "acima90" só define o limite inferior', () => {
  const { where, parametros } = cobrancasRepository.montarFiltro({ faixaAtraso: 'acima90' });

  assert.match(where, />= \?/);
  assert.doesNotMatch(where, /<= \?/);
  assert.deepEqual(parametros, [91]);
});

test('busca com dígitos também procura o CPF sem pontuação', () => {
  const { where, parametros } = cobrancasRepository.montarFiltro({ busca: '111.222.333-44' });

  assert.match(where, /cl\.cpf LIKE \?/);
  assert.ok(parametros.includes('%11122233344%'));
});

test('findInadimplentes pagina, ordena e converte números', async () => {
  calls.length = 0;

  const resultado = await cobrancasRepository.findInadimplentes({
    limite: 10,
    offset: 20,
    ordenacao: 'maior_valor',
    faixaAtraso: 'todas'
  });

  assert.equal(calls.length, 2);
  assert.match(calls[1].sql, /ORDER BY c\.valor DESC, c\.id_cobranca ASC/);
  assert.deepEqual(calls[1].params, [10, 20]);
  assert.equal(resultado.total, 2);
  assert.equal(resultado.valorTotal, 1730);
  assert.equal(resultado.rows[0].valor, 480);
  assert.equal(resultado.rows[0].diasAtraso, 75);
});

test('findInadimplentes ignora ordenação desconhecida (nada vai direto para o SQL)', async () => {
  calls.length = 0;

  await cobrancasRepository.findInadimplentes({
    limite: 8,
    offset: 0,
    ordenacao: 'c.valor; DROP TABLE cobranca'
  });

  assert.match(calls[1].sql, /ORDER BY c\.data_vencimento ASC, c\.id_cobranca ASC/);
  assert.doesNotMatch(calls[1].sql, /DROP/);
});

test('findClientesInadimplentes agrupa por cliente e soma o valor em aberto', async () => {
  calls.length = 0;

  const resultado = await cobrancasRepository.findClientesInadimplentes({
    limite: 8,
    offset: 0,
    busca: 'patricia',
    ordenacao: 'maior_atraso'
  });

  assert.match(calls[1].sql, /GROUP BY cl\.id_cliente/);
  assert.match(calls[1].sql, /ORDER BY maiorAtrasoDias DESC/);
  assert.doesNotMatch(calls[1].sql, /v\.placa/);
  assert.equal(resultado.total, 1);
  assert.deepEqual(resultado.rows[0], {
    id: 4,
    nome: 'Patrícia Nunes',
    quantidadeCobrancas: 2,
    valorEmAberto: 860.5,
    vencimentoMaisAntigo: '2026-08-01',
    maiorAtrasoDias: 97
  });
});

test('resumoFinanceiro devolve números', async () => {
  assert.deepEqual(await cobrancasRepository.resumoFinanceiro(), {
    valorVencido: 2500,
    cobrancasVencidas: 5,
    clientesInadimplentes: 3,
    maiorAtrasoDias: 100,
    valorAVencer: 90
  });
});

test('criarParaOrcamentoAceito só cria para orçamento aceito e sem cobrança', async () => {
  calls.length = 0;
  resultadoInsert = { affectedRows: 1 };

  assert.equal(await cobrancasRepository.criarParaOrcamentoAceito(7, 15), true);
  assert.match(calls[0].sql, /o\.status = 'aceito'/);
  assert.match(calls[0].sql, /NOT EXISTS/);
  assert.match(calls[0].sql, /INTERVAL 15 DAY/);
  assert.deepEqual(calls[0].params, [7]);

  resultadoInsert = { affectedRows: 0 };
  assert.equal(await cobrancasRepository.criarParaOrcamentoAceito(7, 15), false);
});

test('criarParaOrcamentoAceito aceita prazo negativo (cobrança já nasce vencida)', async () => {
  calls.length = 0;
  resultadoInsert = { affectedRows: 1 };

  assert.equal(await cobrancasRepository.criarParaOrcamentoAceito(7, -1), true);
  assert.match(calls[0].sql, /INTERVAL -1 DAY/);
});

test('criarParaOrcamentoAceito rejeita prazo inválido', async () => {
  await assert.rejects(() => cobrancasRepository.criarParaOrcamentoAceito(1, '1; DROP'), RangeError);
  await assert.rejects(() => cobrancasRepository.criarParaOrcamentoAceito(1, 1.5), RangeError);
  await assert.rejects(() => cobrancasRepository.criarParaOrcamentoAceito(1, -366), RangeError);
  await assert.rejects(() => cobrancasRepository.criarParaOrcamentoAceito(1, 366), RangeError);
});

test('registrarPagamento só altera cobrança pendente', async () => {
  calls.length = 0;
  resultadoUpdate = { affectedRows: 1 };

  assert.deepEqual(await cobrancasRepository.registrarPagamento(12), {
    registrado: true,
    status: 'pago'
  });
  assert.match(calls[0].sql, /SET status = 'pago', data_pagamento = NOW\(\)/);
  assert.match(calls[0].sql, /status = 'pendente'/);
  assert.deepEqual(calls[0].params, [12]);
  assert.equal(calls.length, 1);
});

test('registrarPagamento informa a situação quando nada foi alterado', async () => {
  resultadoUpdate = { affectedRows: 0 };

  statusAtual = [{ status: 'pago' }];
  assert.deepEqual(await cobrancasRepository.registrarPagamento(12), { registrado: false, status: 'pago' });

  statusAtual = [{ status: 'cancelado' }];
  assert.deepEqual(await cobrancasRepository.registrarPagamento(12), { registrado: false, status: 'cancelado' });

  statusAtual = [];
  assert.deepEqual(await cobrancasRepository.registrarPagamento(99), { registrado: false, status: null });
});

test('registrarPagamentoDoCliente quita só as cobranças vencidas do cliente', async () => {
  calls.length = 0;
  resultadoUpdate = { affectedRows: 3 };

  assert.equal(await cobrancasRepository.registrarPagamentoDoCliente(4), 3);
  assert.match(calls[0].sql, /c\.id_cliente = \?/);
  assert.match(calls[0].sql, /c\.status = 'pendente'/);
  assert.match(calls[0].sql, /c\.data_vencimento < CURDATE\(\)/);
  assert.deepEqual(calls[0].params, [4]);
});

test('contagemVencidas resume a quantidade e o valor para o painel', async () => {
  assert.deepEqual(await cobrancasRepository.contagemVencidas(), { quantidade: 5, valor: 2500 });
});
