const test = require('node:test');
const assert = require('node:assert/strict');
const {
  indicadoresEquipe,
  pendenciasEquipe,
  indicadoresCliente,
  pendenciasCliente
} = require('../src/utils/painel');

const contagens = {
  atendimentosAbertos: 3,
  orcamentosAguardando: 2,
  semDiagnostico: 0,
  estoqueAtencao: 4,
  estoqueIndisponivel: 2,
  funcionariosAtivos: 9
};

test('indicadoresEquipe do Funcionario não inclui a equipe', () => {
  const chaves = indicadoresEquipe(contagens).map((i) => i.chave);

  assert.deepEqual(chaves, ['atendimentos', 'orcamentos', 'diagnosticos', 'estoque']);
});

test('indicadoresEquipe do Administrador inclui funcionários ativos', () => {
  const itens = indicadoresEquipe(contagens, { administrador: true });

  assert.equal(itens.at(-1).chave, 'equipe');
  assert.equal(itens.at(-1).valor, 9);
});

test('indicador só pede atenção quando há pendência', () => {
  const porChave = Object.fromEntries(
    indicadoresEquipe(contagens).map((i) => [i.chave, i])
  );

  assert.equal(porChave.orcamentos.atencao, true);
  assert.equal(porChave.diagnosticos.atencao, false);
  assert.equal(porChave.atendimentos.atencao, false);
  assert.equal(porChave.estoque.ajuda, '2 sem estoque');
});

test('indicador de módulo indisponível (null) é omitido', () => {
  const itens = indicadoresEquipe({ ...contagens, estoqueAtencao: null, semDiagnostico: null });
  const chaves = itens.map((i) => i.chave);

  assert.equal(chaves.includes('estoque'), false);
  assert.equal(chaves.includes('diagnosticos'), false);
});

test('pendenciasEquipe monta as listas e omite as indisponíveis', () => {
  const secoes = pendenciasEquipe({
    orcamentos: [
      { id: 1, cliente: 'Argur Moraes', placa: 'ABC1D23', marca: 'Ford', modelo: 'Transit', valorTotal: 80, enviadoEm: '2026-10-12T22:38:00.000Z' }
    ],
    semDiagnostico: null,
    estoque: [
      { id: 9, codigo: 'IGN-CAB-002', nome: 'Jogo de cabos', quantidade: 0, quantidadeMinima: 3, localizacao: 'C1-P2' },
      { id: 3, codigo: 'FLT-AR-002', nome: 'Filtro de ar', quantidade: 6, quantidadeMinima: 8, localizacao: 'A1-P4' }
    ]
  });

  assert.deepEqual(secoes.map((s) => s.chave), ['orcamentos', 'estoque']);
  assert.equal(secoes[0].itens[0].titulo, 'Argur Moraes');
  assert.match(secoes[0].itens[0].detalhe, /Ford Transit • ABC1D23 • R\$/);
  assert.match(secoes[1].itens[0].detalhe, /sem estoque/);
  assert.match(secoes[1].itens[1].detalhe, /6 un\. \(mínimo 8\)/);
});

test('seção sem itens mantém a mensagem de vazio', () => {
  const [secao] = pendenciasEquipe({ orcamentos: [], semDiagnostico: null, estoque: null });

  assert.deepEqual(secao.itens, []);
  assert.match(secao.vazio, /Nenhum orçamento/);
});

test('painel do Cliente mostra só os orçamentos dele', () => {
  const indicadores = indicadoresCliente({ orcamentosAguardando: 1, atendimentosAbertos: 0 });
  const secoes = pendenciasCliente({
    orcamentos: [{ id: 5, placa: 'XYZ9K88', marca: 'Fiat', modelo: 'Argo', valorTotal: 1200, enviadoEm: null }]
  });

  assert.deepEqual(indicadores.map((i) => i.chave), ['orcamentos', 'atendimentos']);
  assert.equal(indicadores[0].atencao, true);
  assert.equal(secoes[0].link, '/meus-orcamentos');
  assert.equal(secoes[0].itens[0].titulo, 'Fiat Argo • XYZ9K88');
  assert.deepEqual(pendenciasCliente({ orcamentos: null }), []);
});
