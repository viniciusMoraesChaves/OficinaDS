const express = require('express');
const clientesController = require('../controllers/clientesController');

const router = express.Router();

router.get('/', clientesController.list);
router.get('/:id', clientesController.detail);

module.exports = router;
