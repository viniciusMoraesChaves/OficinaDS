const express = require('express');
const financeiroController = require('../controllers/financeiroController');
const inadimplenciasController = require('../controllers/inadimplenciasController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Financeiro é sempre exclusivo do Administrador (responsável financeiro).
const administrador = protegerRota(PERFIS.ADMINISTRADOR);

router.get('/resumo', administrador, financeiroController.resumo);

router.get('/inadimplencias', administrador, inadimplenciasController.listar);
router.get('/inadimplencias/resumo', administrador, inadimplenciasController.resumo);
router.get('/inadimplencias/clientes', administrador, inadimplenciasController.listarClientes);

module.exports = router;
