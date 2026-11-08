const express = require('express');
const agendamentosController = require('../controllers/agendamentosController');
const { protegerRota } = require('../middlewares/permissoes');
const { PERFIS } = require('../utils/perfis');

const router = express.Router();

// Área da equipe: Administrador e Funcionario, não o Cliente.
const equipe = protegerRota(PERFIS.ADMINISTRADOR, PERFIS.FUNCIONARIO);

// As rotas fixas (/meus, /opcoes, /horarios) vêm antes das rotas com :id.
router.get('/', equipe, agendamentosController.list);

// Área do Cliente: só consulta os próprios agendamentos.
router.get('/meus', protegerRota(PERFIS.CLIENTE), agendamentosController.listMine);
router.get('/opcoes', equipe, agendamentosController.options);
router.get('/horarios', equipe, agendamentosController.horariosNovo);
router.get('/:id/horarios', equipe, agendamentosController.horariosReagendamento);
router.post('/', equipe, agendamentosController.create);
router.patch('/:id/reagendar', equipe, agendamentosController.reagendar);

module.exports = router;
