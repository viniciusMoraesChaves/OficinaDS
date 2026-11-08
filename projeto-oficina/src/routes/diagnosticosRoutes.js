const express = require('express');
const diagnosticosController = require('../controllers/diagnosticosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

router.get('/', equipe, diagnosticosController.list);
router.get('/opcoes', equipe, diagnosticosController.options);
router.post('/', equipe, diagnosticosController.create);
router.patch('/:id', equipe, diagnosticosController.update);
router.delete('/:id', equipe, diagnosticosController.remove);

module.exports = router;
