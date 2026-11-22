const express = require('express');
const usuariosController = require('../controllers/usuariosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Rota administrativa: só o Administrador gerencia usuários e perfis.
router.get('/', protegerRota(PERFIS.ADMINISTRADOR), usuariosController.listar);

module.exports = router;