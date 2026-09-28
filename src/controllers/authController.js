const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { encontrarPorEmail, criarUsuario } = require('../repositories/authRepository');
const perfisRepository = require('../repositories/perfisRepository');
const { PERFIS } = require('../utils/perfis');

const SALT_ROUNDS = 10;

function gerarToken(usuario) {
  return jwt.sign(
    { id_usuario: usuario.id_usuario, email: usuario.email, perfil: usuario.perfil },
    env.jwtSecret,
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

    res.json({
      dados: { token: gerarToken(usuario), email: usuario.email, perfil: usuario.perfil }
    });
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

    // Todo cadastro público entra como Funcionario; virar Administrador é
    // uma ação manual (feita direto no banco), não algo que o próprio
    // usuário escolhe no formulário.
    const perfilPadrao = await perfisRepository.buscarPorNome(PERFIS.FUNCIONARIO);
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const usuarioCriado = await criarUsuario(email, senhaHash, perfilPadrao.id);
    const usuario = { ...usuarioCriado, perfil: PERFIS.FUNCIONARIO };

    res.status(201).json({
      dados: { token: gerarToken(usuario), email: usuario.email, perfil: usuario.perfil }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, cadastrar };