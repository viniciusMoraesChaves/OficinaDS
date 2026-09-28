const express = require('express');
const clientesController = require('../controllers/clientesController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Área da equipe: Administrador e Funcionario, não o Cliente.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

router.get('/', equipe, clientesController.list);
router.get('/:id', equipe, clientesController.detail);

module.exports = router;