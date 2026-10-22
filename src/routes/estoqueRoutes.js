
const express = require('express');
const estoqueController = require('../controllers/estoqueController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

const equipe = protegerRota(
  PERFIS.ADMINISTRADOR,
  PERFIS.FUNCIONARIO
);

router.get('/pecas', equipe, estoqueController.listar);
router.get('/alertas', equipe, estoqueController.alertas);

module.exports = router;
