const express = require('express');
const veiculosController = require('../controllers/veiculosController');

const router = express.Router();

router.get('/', veiculosController.list);

module.exports = router;