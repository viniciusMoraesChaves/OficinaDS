const express = require('express');
const presencaController = require('../controllers/presencaController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// A presença dos funcionários é controlada pelo Administrador.
const administrador = protegerRota(PERFIS.ADMINISTRADOR);

// Montada em /api/presencas
router.get('/', administrador, presencaController.listar);
router.get('/presentes', administrador, presencaController.presentes);
router.get('/funcionarios', administrador, presencaController.funcionarios);
router.post('/entrada', administrador, presencaController.registrarEntrada);
router.post('/saida', administrador, presencaController.registrarSaida);

module.exports = router;
