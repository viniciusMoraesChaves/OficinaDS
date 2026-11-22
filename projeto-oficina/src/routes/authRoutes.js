const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { exigirAutenticacao } = require('../middlewares/authMiddleware');
const { carregarUsuarioLogado } = require('../middlewares/permissoes');

router.post('/cadastro', authController.cadastrar);
router.post('/login', authController.login);

// Perfil real do usuário logado, lido do banco (fonte da verdade para o front).
router.get('/me', exigirAutenticacao, carregarUsuarioLogado, authController.perfilAtual);

module.exports = router;
