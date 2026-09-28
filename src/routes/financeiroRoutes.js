const express = require('express');
const financeiroController = require('../controllers/financeiroController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Financeiro é sempre exclusivo do Administrador.
router.get('/resumo', protegerRota(PERFIS.ADMINISTRADOR), financeiroController.resumo);

module.exports = router;