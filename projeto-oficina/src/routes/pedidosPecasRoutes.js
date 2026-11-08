const express = require('express');
const pedidosPecasController = require('../controllers/pedidosPecasController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Equipe da oficina cria, envia e acompanha; só o Administrador (superior) decide.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);
const superior = protegerRota(PERFIS.ADMINISTRADOR);

router.get('/', equipe, pedidosPecasController.list);
router.get('/opcoes', equipe, pedidosPecasController.options);
router.get('/:id', equipe, pedidosPecasController.obter);
router.post('/', equipe, pedidosPecasController.create);
router.patch('/:id/enviar', equipe, pedidosPecasController.enviar);
router.patch('/:id/decisao', superior, pedidosPecasController.decidir);

module.exports = router;
