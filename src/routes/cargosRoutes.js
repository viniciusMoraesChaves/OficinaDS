const express = require('express');
const cargosController = require('../controllers/cargosController');

const router = express.Router();

router.get('/', cargosController.list);

module.exports = router;