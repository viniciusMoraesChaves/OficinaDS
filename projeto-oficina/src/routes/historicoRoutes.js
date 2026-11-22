const express = require('express');
const historicoRepository = require('../repositories/historicoRepository');
const { criarHistoricoController } = require('../controllers/historicoController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();
const controller = criarHistoricoController(historicoRepository);

// Área da equipe: Administrador e Funcionario, não o Cliente.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

// GET /api/veiculos/:id/historico?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/:id/historico', equipe, controller.consultar);

module.exports = router;
