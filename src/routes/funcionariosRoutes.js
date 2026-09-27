const express = require('express');
const funcionariosController = require('../controllers/funcionariosController');

const router = express.Router();

router.get('/', funcionariosController.search);
router.patch('/:id/cargo', funcionariosController.updateCargo);

module.exports = router;
