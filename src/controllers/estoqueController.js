const {
  listarPecas,
  listarAlertas
} = require('../repositories/estoqueRepository');

async function listar(req, res, next) {
  try {
    const dados = await listarPecas();

    res.json({ dados });
  } catch (error) {
    next(error);
  }
}

async function alertas(req, res, next) {
  try {
    const dados = await listarAlertas();

    res.json({
      dados,
      resumo: {
        total: dados.length,
        abaixo: dados.filter((p) => p.situacao === 'ABAIXO').length,
        proximo: dados.filter((p) => p.situacao === 'PROXIMO').length
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  alertas
};
