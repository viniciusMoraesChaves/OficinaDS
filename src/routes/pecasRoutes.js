const express = require('express');
const pecasController = require('../controllers/pecasController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Usuário autorizado = equipe da oficina (Administrador e Funcionario), não o Cliente.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

router.get('/', equipe, pecasController.list);
router.get('/categorias', equipe, pecasController.categorias);

module.exports = router;
