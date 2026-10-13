const express = require('express');
const historicoRepository = require('../repositories/historicoRepository');
const { criarHistoricoController } = require('../controllers/historicoController');

const router = express.Router();
const controller = criarHistoricoController(historicoRepository);

// GET /veiculos/:id/historico?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/:id/historico', controller.consultar);

module.exports = router;