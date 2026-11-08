const cargosRepository = require('../repositories/cargosRepository');

async function list(req, res) {
  const cargos = await cargosRepository.findAll();
  res.json({ dados: cargos });
}

async function create(req, res, next) {
  try {
    const nome = String(req.body.nome || '').trim();
    const descricao = String(req.body.descricao || '').trim();

    if (!nome) {
      return res.status(400).json({
        mensagem: 'Informe o nome do cargo.'
      });
    }

    const cargo = await cargosRepository.create(
      nome,
      descricao || null
    );

    res.status(201).json({
      mensagem: 'Cargo criado com sucesso.',
      dados: cargo
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'Já existe um cargo com esse nome.'
      });
    }

    next(error);
  }
}

module.exports = { list, create };