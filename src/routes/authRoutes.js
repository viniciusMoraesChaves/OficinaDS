const express = require('express');
const { login, cadastrar } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/cadastro', cadastrar);

module.exports = router;