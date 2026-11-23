const express = require('express');
const avaliacoesController = require('../controllers/avaliacoesController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Quem avalia é o cliente. A média aparece na tela de funcionários (Administrador).
const cliente = protegerRota(PERFIS.CLIENTE);

router.get('/meus', cliente, avaliacoesController.listarMinhas);
router.post('/', cliente, avaliacoesController.registrar);

module.exports = router;
