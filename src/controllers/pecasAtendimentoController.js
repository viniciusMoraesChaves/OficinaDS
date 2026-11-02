const pecasAtendimentoRepository = require('../repositories/pecasAtendimentoRepository');
const { parseId } = require('../utils/queryParams');
const { validarQuantidadePeca } = require('../utils/pecaUtilizada');

async function listar(req, res) {
  const idAtendimento = parseId(req.params.id);
  const pecas = await pecasAtendimentoRepository.listar(idAtendimento);
  res.json({ dados: pecas });
}

async function adicionar(req, res) {
  const idAtendimento = parseId(req.params.id);
  const idPeca = parseId(req.body.idPeca);
  const quantidade = validarQuantidadePeca(req.body.quantidade);

  const peca = await pecasAtendimentoRepository.adicionar({
    idAtendimento,
    idPeca,
    quantidade
  });

  res.status(201).json({ mensagem: 'Peça registrada no atendimento.', dados: peca });
}

async function editar(req, res) {
  const idAtendimento = parseId(req.params.id);
  const idPecaUtilizada = parseId(req.params.idPecaUtilizada);
  const quantidade = validarQuantidadePeca(req.body.quantidade);

  const peca = await pecasAtendimentoRepository.editar({
    idAtendimento,
    idPecaUtilizada,
    quantidade
  });

  res.json({ mensagem: 'Quantidade atualizada.', dados: peca });
}

async function remover(req, res) {
  const idAtendimento = parseId(req.params.id);
  const idPecaUtilizada = parseId(req.params.idPecaUtilizada);

  const peca = await pecasAtendimentoRepository.remover({
    idAtendimento,
    idPecaUtilizada
  });

  res.json({ mensagem: 'Peça removida e estoque devolvido.', dados: peca });
}

module.exports = { listar, adicionar, editar, remover };
