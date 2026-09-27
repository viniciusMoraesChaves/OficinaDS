const usuariosRepository = require('../repositories/usuariosRepository');

async function listar(req, res, next) {
  try {
    const usuarios = await usuariosRepository.listarTodos();
    res.json({ dados: usuarios });
  } catch (error) {
    next(error);
  }
}

module.exports = { listar };