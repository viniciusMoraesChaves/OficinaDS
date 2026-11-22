const test = require('node:test');
const assert = require('node:assert/strict');
const { indicadoresEquipe } = require('../src/utils/painel');

const base = {
  atendimentosAbertos: 1,
  orcamentosAguardando: 0,
  semDiagnostico: 0,
  estoqueAtencao: 0,
  estoqueIndisponivel: 0,
  funcionariosAtivos: 4
};

test('Administrador vê o cartão de cobranças em atraso, antes do cartão da equipe', () => {
  const itens = indicadoresEquipe(
    { ...base, inadimplencias: { quantidade: 3, valor: 1250.5 } },
    { administrador: true }
  );

  const chaves = itens.map((i) => i.chave);
  const cartao = itens.find((i) => i.chave === 'inadimplencias');

  assert.equal(chaves.at(-1), 'equipe');
  assert.equal(cartao.valor, 3);
  assert.equal(cartao.atencao, true);
  assert.equal(cartao.link, '/financeiro/inadimplencias');
  assert.match(cartao.ajuda, /em aberto/);
});

test('sem cobrança vencida o cartão não pede atenção', () => {
  const itens = indicadoresEquipe(
    { ...base, inadimplencias: { quantidade: 0, valor: 0 } },
    { administrador: true }
  );
  const cartao = itens.find((i) => i.chave === 'inadimplencias');

  assert.equal(cartao.atencao, false);
  assert.equal(cartao.ajuda, 'Nenhuma cobrança vencida');
});

test('Funcionario nunca vê o cartão financeiro', () => {
  const itens = indicadoresEquipe({ ...base, inadimplencias: { quantidade: 3, valor: 10 } });

  assert.equal(itens.some((i) => i.chave === 'inadimplencias'), false);
});

test('financeiro indisponível (tabela ainda não criada) some do painel', () => {
  const itens = indicadoresEquipe({ ...base, inadimplencias: null }, { administrador: true });

  assert.equal(itens.some((i) => i.chave === 'inadimplencias'), false);
});
