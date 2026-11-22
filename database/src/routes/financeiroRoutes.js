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

// "Cliente pagou": uma cobrança ou todas as vencidas de um cliente.
router.patch(
  '/inadimplencias/clientes/:id/pagamento',
  administrador,
  inadimplenciasController.registrarPagamentoCliente
);
router.patch(
  '/inadimplencias/:id/pagamento',
  administrador,
  inadimplenciasController.registrarPagamento
);

module.exports = router;
