const express = require('express');
const veiculosController = require('../controllers/veiculosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Área da equipe: Administrador e Funcionario, não o Cliente.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

router.get('/', equipe, veiculosController.list);

module.exports = router;
