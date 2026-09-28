const express = require('express');
const funcionariosController = require('../controllers/funcionariosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

router.get(
  '/',
  protegerRota(PERFIS.ADMINISTRADOR),
  funcionariosController.search
);

router.patch(
  '/:id/cargo',
  protegerRota(PERFIS.ADMINISTRADOR),
  funcionariosController.updateCargo
);
module.exports = router;