const express = require('express');
const funcionariosController = require('../controllers/funcionariosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Só o Administrador visualiza a lista de funcionários.
router.get('/', protegerRota(PERFIS.ADMINISTRADOR), funcionariosController.search);

module.exports = router;