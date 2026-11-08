function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

function agrupar(lista) {
  const mapa = new Map();
  for (const item of lista) {
    if (!mapa.has(item.id_atendimento)) mapa.set(item.id_atendimento, []);
    mapa.get(item.id_atendimento).push(item);
  }
  return mapa;
}

function criarHistoricoController(repo) {
  async function consultar(req, res) {
    try {
      const idVeiculo = Number(req.params.id);
      if (!Number.isInteger(idVeiculo) || idVeiculo <= 0) {
        return res.status(400).json({ erro: 'Id do veículo inválido.' });
      }

      const { inicio, fim } = req.query;
      for (const [nome, valor] of [['inicio', inicio], ['fim', fim]]) {
        if (valor !== undefined && (typeof valor !== 'string' || !dataValida(valor))) {
          return res.status(400).json({ erro: `Parâmetro "${nome}" inválido. Use o formato AAAA-MM-DD.` });
        }
      }
      if (inicio && fim && inicio > fim) {
        return res.status(400).json({ erro: 'Período inválido: "inicio" deve ser menor ou igual a "fim".' });
      }

      if (!(await repo.veiculoExiste(idVeiculo))) {
        return res.status(404).json({ erro: 'Veículo não encontrado.' });
      }

      const atendimentos = await repo.buscarAtendimentos(idVeiculo, { inicio, fim });
      const ids = atendimentos.map((a) => a.id_atendimento);
      const [servicos, pecas] = await Promise.all([repo.buscarServicos(ids), repo.buscarPecas(ids)]);
      const servicosPorAt = agrupar(servicos);
      const pecasPorAt = agrupar(pecas);

      const historico = atendimentos.map((a) => ({
        idAtendimento: a.id_atendimento,
        data: a.data_atendimento,
        status: a.status,
        problema: a.problema_relatado,
        diagnostico: a.diagnostico,
        mecanico: a.mecanico,
        servicos: (servicosPorAt.get(a.id_atendimento) || []).map((s) => ({
          descricao: s.descricao,
          valor: Number(s.valor),
        })),
        pecas: (pecasPorAt.get(a.id_atendimento) || []).map((p) => ({
          nome: p.nome_peca,
          quantidade: p.quantidade,
          valorUnitario: Number(p.valor_unitario),
        })),
      }));

      return res.status(200).json(historico);
    } catch (err) {
      console.error('Erro ao consultar histórico do veículo:', err);
      return res.status(500).json({ erro: 'Erro interno ao consultar o histórico.' });
    }
  }

  return { consultar };
}

module.exports = { criarHistoricoController };