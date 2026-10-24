// Regras de montagem do painel inicial. Funções puras (sem banco), para testar fácil.
// Um valor `null` significa "dado indisponível" (ex.: tabela ainda não criada) e o
// cartão ou lista correspondente simplesmente não aparece.

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function veiculo(item) {
  return `${item.marca} ${item.modelo} • ${item.placa}`;
}

function indicadoresEquipe(contagens, { administrador = false } = {}) {
  const indisponiveis = Number(contagens.estoqueIndisponivel || 0);

  const itens = [
    {
      chave: 'atendimentos',
      rotulo: 'Atendimentos em andamento',
      valor: contagens.atendimentosAbertos,
      ajuda: 'Clientes sendo atendidos agora',
      link: '/atendimentos',
      atencao: false
    },
    {
      chave: 'orcamentos',
      rotulo: 'Orçamentos aguardando o cliente',
      valor: contagens.orcamentosAguardando,
      ajuda: 'Enviados e ainda sem resposta',
      link: '/atendimentos',
      atencao: true
    },
    {
      chave: 'diagnosticos',
      rotulo: 'Atendimentos sem diagnóstico',
      valor: contagens.semDiagnostico,
      ajuda: 'Falta registrar o diagnóstico técnico',
      link: '/diagnosticos',
      atencao: true
    },
    {
      chave: 'estoque',
      rotulo: 'Peças para repor',
      valor: contagens.estoqueAtencao,
      ajuda: indisponiveis > 0 ? `${indisponiveis} sem estoque` : 'Abaixo do estoque mínimo',
      link: '/estoque',
      atencao: true
    }
  ];

  if (administrador) {
    itens.push({
      chave: 'equipe',
      rotulo: 'Funcionários ativos',
      valor: contagens.funcionariosAtivos,
      ajuda: 'Equipe cadastrada na oficina',
      link: '/funcionarios',
      atencao: false
    });
  }

  return itens
    .filter((item) => item.valor !== null && item.valor !== undefined)
    .map((item) => ({ ...item, valor: Number(item.valor), atencao: item.atencao && Number(item.valor) > 0 }));
}

function pendenciasEquipe(listas) {
  const secoes = [];

  if (listas.orcamentos) {
    secoes.push({
      chave: 'orcamentos',
      titulo: 'Orçamentos aguardando resposta',
      link: '/atendimentos',
      vazio: 'Nenhum orçamento aguardando resposta do cliente.',
      itens: listas.orcamentos.map((o) => ({
        id: o.id,
        titulo: o.cliente,
        detalhe: `${veiculo(o)} • ${moeda(o.valorTotal)}`,
        data: o.enviadoEm
      }))
    });
  }

  if (listas.semDiagnostico) {
    secoes.push({
      chave: 'diagnosticos',
      titulo: 'Atendimentos sem diagnóstico',
      link: '/diagnosticos',
      vazio: 'Todos os atendimentos abertos já têm diagnóstico.',
      itens: listas.semDiagnostico.map((a) => ({
        id: a.id,
        titulo: a.cliente,
        detalhe: veiculo(a),
        data: a.criadoEm
      }))
    });
  }

  if (listas.estoque) {
    secoes.push({
      chave: 'estoque',
      titulo: 'Peças para repor',
      link: '/estoque',
      vazio: 'Nenhuma peça abaixo do estoque mínimo.',
      itens: listas.estoque.map((p) => ({
        id: p.id,
        titulo: p.nome,
        detalhe: `${p.codigo} • ${p.localizacao} • ${
          Number(p.quantidade) === 0
            ? 'sem estoque'
            : `${p.quantidade} un. (mínimo ${p.quantidadeMinima})`
        }`,
        data: null
      }))
    });
  }

  return secoes;
}

function indicadoresCliente(contagens) {
  return [
    {
      chave: 'orcamentos',
      rotulo: 'Orçamentos aguardando sua decisão',
      valor: contagens.orcamentosAguardando,
      ajuda: 'Aceite ou recuse na página de orçamentos',
      link: '/meus-orcamentos',
      atencao: true
    },
    {
      chave: 'atendimentos',
      rotulo: 'Veículos em atendimento',
      valor: contagens.atendimentosAbertos,
      ajuda: 'Seus veículos que estão na oficina',
      link: '/meus-orcamentos',
      atencao: false
    }
  ]
    .filter((item) => item.valor !== null && item.valor !== undefined)
    .map((item) => ({ ...item, valor: Number(item.valor), atencao: item.atencao && Number(item.valor) > 0 }));
}

function pendenciasCliente(listas) {
  if (!listas.orcamentos) return [];

  return [
    {
      chave: 'orcamentos',
      titulo: 'Orçamentos aguardando sua decisão',
      link: '/meus-orcamentos',
      vazio: 'Você não tem orçamentos aguardando decisão.',
      itens: listas.orcamentos.map((o) => ({
        id: o.id,
        titulo: veiculo(o),
        detalhe: `Valor total ${moeda(o.valorTotal)}`,
        data: o.enviadoEm
      }))
    }
  ];
}

module.exports = {
  moeda,
  indicadoresEquipe,
  pendenciasEquipe,
  indicadoresCliente,
  pendenciasCliente
};
