const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encontrarPorEmail, criarUsuario } = require('../repositories/authRepository');

const SALT_ROUNDS = 10;

function gerarToken(usuario) {
  return jwt.sign(
    { id_usuario: usuario.id_usuario, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: 'PARAMETRO_INVALIDO',
        mensagem: 'Informe e-mail e senha.'
      });
    }

    const usuario = await encontrarPorEmail(email);

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        erro: 'CREDENCIAIS_INVALIDAS',
        mensagem: 'E-mail ou senha incorretos.'
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'CREDENCIAIS_INVALIDAS',
        mensagem: 'E-mail ou senha incorretos.'
      });
    }

    res.json({ dados: { token: gerarToken(usuario), email: usuario.email } });
  } catch (error) {
    next(error);
  }
}

async function cadastrar(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha || senha.length < 6) {
      return res.status(400).json({
        erro: 'PARAMETRO_INVALIDO',
        mensagem: 'Informe um e-mail válido e uma senha com ao menos 6 caracteres.'
      });
    }

    const existente = await encontrarPorEmail(email);
    if (existente) {
      return res.status(409).json({
        erro: 'EMAIL_EM_USO',
        mensagem: 'Já existe uma conta com este e-mail.'
      });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const usuario = await criarUsuario(email, senhaHash);

    res.status(201).json({ dados: { token: gerarToken(usuario), email: usuario.email } });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, cadastrar };