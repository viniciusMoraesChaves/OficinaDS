const express = require('express');
const orcamentosController = require('../controllers/orcamentosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

router.get('/', equipe, orcamentosController.listarAtendimentos);
router.post('/', equipe, orcamentosController.criarAtendimento);
router.patch('/:id/urgencia', equipe, orcamentosController.atualizarUrgencia);
router.delete('/:id', equipe, orcamentosController.removerAtendimento);
router.post('/:id/orcamento', equipe, orcamentosController.criarOrcamento);

module.exports = router;
