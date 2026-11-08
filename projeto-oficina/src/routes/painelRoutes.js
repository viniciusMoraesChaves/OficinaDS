const express = require('express');
const painelController = require('../controllers/painelController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Todo usuário logado tem painel; o conteúdo muda conforme o perfil.
const qualquerPerfil = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO, PERFIS.CLIENTE);

router.get('/', qualquerPerfil, painelController.obter);

module.exports = router;
