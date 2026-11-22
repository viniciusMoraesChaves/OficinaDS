const express = require('express');
const clientesController = require('../controllers/clientesController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Área da equipe: Administrador e Funcionario, não o Cliente.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

router.get('/', equipe, clientesController.list);
// precisa vir antes de "/:id", senão "opcoes" seria interpretado como id
router.get('/opcoes', equipe, clientesController.opcoes);
router.get('/:id', equipe, clientesController.detail);

module.exports = router;