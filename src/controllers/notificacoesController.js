const { listarAlertas } = require('../repositories/pecasRepository');
const {
  resumoOrcamentosAguardando,
  resumoAtendimentosParados
} = require('../repositories/notificacoesRepository');

function plural(qtd, singular, pluralTxt) {
  return `${qtd} ${qtd === 1 ? singular : pluralTxt}`;
}

async function listar(req, res, next) {
  try {
    const [pecas, orcamentos, atendimentos] = await Promise.all([
      listarAlertas(),
      resumoOrcamentosAguardando(),
      resumoAtendimentosParados()
    ]);

    const dados = [];

    // Estoque
    const abaixo = pecas.filter((p) => p.situacao === 'ABAIXO').length;
    const proximo = pecas.length - abaixo;

    if (abaixo > 0) {
      dados.push({
        id: 'estoque-abaixo',
        titulo: `${plural(abaixo, 'peça abaixo', 'peças abaixo')} do mínimo`,
        detalhe: 'Reposição urgente',
        tipo: 'danger',
        destino: '/estoque'
      });
    }

    if (proximo > 0) {
      dados.push({
        id: 'estoque-proximo',
        titulo: `${plural(proximo, 'peça próxima', 'peças próximas')} do mínimo`,
        detalhe: 'Programe a reposição',
        tipo: 'warning',
        destino: '/estoque'
      });
    }

    // Orçamentos aguardando o cliente
    if (orcamentos.total > 0) {
      const { total, parados, dias } = orcamentos;
      dados.push({
        id: 'orcamentos-aguardando',
        titulo: `${plural(total, 'orçamento aguardando', 'orçamentos aguardando')} resposta`,
        detalhe:
          parados > 0
            ? `${plural(parados, 'parado', 'parados')} há ${dias} dias ou mais`
            : 'Acompanhe com o cliente',
        tipo: parados > 0 ? 'danger' : 'warning',
        destino: '/atendimentos' // AJUSTE: rota do front onde ficam os orçamentos
      });
    }

    // Atendimentos abertos há muito tempo
    if (atendimentos.total > 0) {
      dados.push({
        id: 'atendimentos-parados',
        titulo: `${plural(atendimentos.total, 'atendimento aberto', 'atendimentos abertos')} há ${atendimentos.dias} dias ou mais`,
        detalhe: 'Verifique o andamento do serviço',
        tipo: 'warning',
        destino: '/atendimentos'
      });
    }

    res.json({ dados, total: dados.length });
  } catch (error) {
    next(error);
  }
}

module.exports = { listar };