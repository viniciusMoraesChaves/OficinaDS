const express = require('express');
const notificacoesController = require('../controllers/notificacoesController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// GET /api/notificacoes
router.get('/', protegerRota(PERFIS.ADMINISTRADOR), notificacoesController.listar);

module.exports = router;