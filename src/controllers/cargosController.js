const cargosRepository = require('../repositories/cargosRepository');

async function list(req, res) {
  const cargos = await cargosRepository.findAll();

  res.json({
    dados: cargos
  });
}

module.exports = { list };