const express = require('express');
const orcamentosController = require('../controllers/orcamentosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);
const qualquerPerfil = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO, PERFIS.CLIENTE);

router.get('/', equipe, orcamentosController.listarTodos);

// precisa vir antes de "/:id", senão "meus" seria interpretado como id
router.get('/meus', protegerRota(PERFIS.CLIENTE), orcamentosController.listarMeus);
router.get('/:id', qualquerPerfil, orcamentosController.obterOrcamento);
router.patch('/:id/status', equipe, orcamentosController.enviarOrcamento);
router.patch('/:id/decisao', protegerRota(PERFIS.CLIENTE), orcamentosController.decidirOrcamento);

module.exports = router;