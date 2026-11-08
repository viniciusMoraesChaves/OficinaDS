const express = require('express');
const cargosController = require('../controllers/cargosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

router.get(
  '/',
  protegerRota(PERFIS.ADMINISTRADOR),
  cargosController.list
);

router.post(
  '/',
  protegerRota(PERFIS.ADMINISTRADOR),
  cargosController.create
);

module.exports = router;