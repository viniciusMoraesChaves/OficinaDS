const express = require('express');
const orcamentosController = require('../controllers/orcamentosController');
const pecasAtendimentoController = require('../controllers/pecasAtendimentoController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);
const cliente = protegerRota(PERFIS.CLIENTE);
router.patch('/:id/status', equipe, orcamentosController.atualizarStatusAtendimento);
router.get('/:id/pecas', equipe, pecasAtendimentoController.listar);
router.post('/:id/pecas', equipe, pecasAtendimentoController.adicionar);
router.patch('/:id/pecas/:idPecaUtilizada', equipe, pecasAtendimentoController.editar);
router.delete('/:id/pecas/:idPecaUtilizada', equipe, pecasAtendimentoController.remover);

router.get('/meus', cliente, orcamentosController.listarMeusAtendimentos);
router.get('/', equipe, orcamentosController.listarAtendimentos);
router.post('/', equipe, orcamentosController.criarAtendimento);
router.patch('/:id/urgencia', equipe, orcamentosController.atualizarUrgencia);
router.delete('/:id', equipe, orcamentosController.removerAtendimento);
router.post('/:id/orcamento', equipe, orcamentosController.criarOrcamento);

module.exports = router;
