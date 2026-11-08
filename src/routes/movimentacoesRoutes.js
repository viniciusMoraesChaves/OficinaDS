const express = require('express');
const movimentacoesController = require('../controllers/movimentacoesController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Financeiro é sempre exclusivo do Administrador (responsável financeiro).
const administrador = protegerRota(PERFIS.ADMINISTRADOR);

// Montada em /api/financeiro/movimentacoes
router.get('/', administrador, movimentacoesController.listar);
router.post('/', administrador, movimentacoesController.criar);
router.get('/categorias', administrador, movimentacoesController.categorias);

module.exports = router;
