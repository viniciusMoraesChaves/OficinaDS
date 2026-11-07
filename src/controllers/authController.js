const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { encontrarPorEmail } = require('../repositories/authRepository');
const contasRepository = require('../repositories/contasRepository');
const cargosRepository = require('../repositories/cargosRepository');
const perfisRepository = require('../repositories/perfisRepository');
const { PERFIS } = require('../utils/perfis');
const { DadosInvalidosError } = require('../utils/erros');
const { apenasDigitos, exigirCpf, exigirEmail, exigirSenha, exigirTexto } = require('../utils/validacoes');
const usuariosRepository = require('../repositories/usuariosRepository');

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
    const { email, senha, tipoAcesso } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: 'PARAMETRO_INVALIDO',
        mensagem: 'Informe e-mail e senha.'
      });
    }

    const usuario = await encontrarPorEmail(String(email).trim());

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

    // tipoAcesso é a opção escolhida na tela de login ("oficina" ou
    // "cliente"). Confirma que bate com o perfil real da conta, evitando
    // que a pessoa entre pela aba errada.
    if (tipoAcesso === 'cliente' && usuario.perfil !== PERFIS.CLIENTE) {
      return res.status(401).json({
        erro: 'PERFIL_INCOMPATIVEL',
        mensagem: 'Esta conta não é de um cliente. Use a opção "Sou da oficina".'
      });
    }

    if (tipoAcesso === 'oficina' && usuario.perfil === PERFIS.CLIENTE) {
      return res.status(401).json({
        erro: 'PERFIL_INCOMPATIVEL',
        mensagem: 'Esta conta é de um cliente. Use a opção "Sou cliente".'
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
    const { tipoAcesso } = req.body;

    // Em produção, só clientes se cadastram sozinhos (CADASTRO_OFICINA_PUBLICO=false).
    if (tipoAcesso !== 'cliente' && !env.cadastroOficinaPublico) {
      return res.status(403).json({
        erro: 'CADASTRO_DESATIVADO',
        mensagem: 'O cadastro público de equipe está desativado. Peça a um Administrador para criar a sua conta.'
      });
    }

    const email = exigirEmail(req.body.email);
    const senha = exigirSenha(req.body.senha);
    const nome = exigirTexto(req.body.nome, 'Informe o seu nome.');
    const cpf = exigirCpf(req.body.cpf);
    const telefone = apenasDigitos(req.body.telefone) || null;

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    let nomePerfil;

    if (tipoAcesso === 'cliente') {
      nomePerfil = PERFIS.CLIENTE;
      const perfil = await buscarPerfilOuFalhar(nomePerfil);

      await contasRepository.criarContaCliente({
        email,
        senhaHash,
        idPerfil: perfil.id,
        nome,
        cpf,
        telefone,
        endereco: String(req.body.endereco || '').trim() || null,
        veiculo: lerVeiculo(req.body.veiculo)
      });
    } else {
      // Cadastro público da oficina entra sempre como Funcionario; virar
      // Administrador acontece pelo cargo "Gerente" (feito por um Administrador).
      nomePerfil = PERFIS.FUNCIONARIO;
      const perfil = await buscarPerfilOuFalhar(nomePerfil);
      const cargo = await cargosRepository.findPadraoCadastro();

      if (!cargo) {
        return res.status(500).json({
          erro: 'CARGO_PADRAO_INEXISTENTE',
          mensagem: 'Nenhum cargo disponível para cadastro. Execute os scripts da pasta database.'
        });
      }

      await contasRepository.criarContaFuncionario({
        email,
        senhaHash,
        idPerfil: perfil.id,
        nome,
        cpf,
        telefone,
        dataAdmissao: null,
        idCargo: cargo.id
      });
    }

    const usuario = await encontrarPorEmail(email);

    res.status(201).json({
      dados: { token: gerarToken(usuario), email: usuario.email, perfil: usuario.perfil }
    });
  } catch (error) {
    next(error);
  }
}

async function buscarPerfilOuFalhar(nomePerfil) {
  const perfil = await perfisRepository.buscarPorNome(nomePerfil);

  if (!perfil) {
    const erro = new Error(`Perfil ${nomePerfil} não encontrado. Execute os scripts da pasta database.`);
    erro.statusCode = 500;
    throw erro;
  }

  return perfil;
}

// Veículo é opcional no cadastro do cliente; se qualquer campo for enviado,
// placa, marca, modelo e ano passam a ser obrigatórios.
function lerVeiculo(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;

  const placa = String(bruto.placa || '').trim().toUpperCase();
  const marca = String(bruto.marca || '').trim();
  const modelo = String(bruto.modelo || '').trim();
  const cor = String(bruto.cor || '').trim();
  const anoTexto = String(bruto.ano || '').trim();

  if (!placa && !marca && !modelo && !anoTexto && !cor) return null;

  const ano = Number(anoTexto);
  if (!placa || !marca || !modelo || !Number.isInteger(ano) || ano < 1900 || ano > 2200) {
    throw new DadosInvalidosError('Para cadastrar o veículo, informe placa, marca, modelo e um ano válido.');
  }

  return { placa, marca, modelo, ano, cor: cor || null };
}

async function perfilAtual(req, res) {
  res.json({
    dados: { email: req.usuarioLogado.email, perfil: req.usuarioLogado.perfil }
  });
}

async function obterMeuPerfil(req, res) {
  const usuario = await usuariosRepository.buscarDadosMeuPerfil(
    req.usuarioLogado.id
  );

  if (!usuario) {
    return res.status(404).json({
      mensagem: 'Perfil não encontrado.'
    });
  }

  res.json({ dados: usuario });
}

async function atualizarEmailMeuPerfil(req, res, next) {
  try {
    const idUsuario = req.usuarioLogado.id;
    const email = exigirEmail(req.body.email);

    const emailEmUso =
      await usuariosRepository.emailPertenceAOutroUsuario(
        email,
        idUsuario
      );

    if (emailEmUso) {
      return res.status(409).json({
        mensagem: 'Este e-mail já está sendo utilizado por outra conta.'
      });
    }

    const atualizado =
      await usuariosRepository.atualizarEmailMeuPerfil(
        idUsuario,
        email
      );

    if (!atualizado) {
      return res.status(404).json({
        mensagem: 'Usuário não encontrado.'
      });
    }

    return res.json({
      mensagem: 'E-mail atualizado com sucesso.'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'Este e-mail já está sendo utilizado por outra conta.'
      });
    }

    next(error);
  }
}

async function atualizarDadosPessoaisMeuPerfil(req, res, next) {
  try {
    const idUsuario = req.usuarioLogado.id;
    const { nome, telefone, endereco } = req.body ?? {};

    if (typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({
        mensagem: 'Informe um nome válido.'
      });
    }

    if (typeof telefone !== 'string') {
      return res.status(400).json({
        mensagem: 'O telefone deve ser informado como texto.'
      });
    }

    if (endereco !== undefined && typeof endereco !== 'string') {
      return res.status(400).json({
        mensagem: 'Informe um endereço válido.'
      });
    }


    if (nome.trim().length > 120) {
      return res.status(400).json({
        mensagem: 'O nome deve ter no máximo 120 caracteres.'
      });
    }

    if (telefone.trim().length > 20) {
      return res.status(400).json({
        mensagem: 'O telefone deve ter no máximo 20 caracteres.'
      });
    }

    if ((endereco ?? '').trim().length > 255) {
      return res.status(400).json({
        mensagem: 'O endereço deve ter no máximo 255 caracteres.'
      });
    }

    const resultado =
      await usuariosRepository.atualizarDadosPessoaisMeuPerfil(
        idUsuario,
        {
          nome: nome.trim(),
          telefone: telefone.trim(),
          endereco: endereco === undefined ? undefined : endereco.trim()
        }
      );

    if (!resultado.atualizado) {
      if (resultado.motivo === 'USUARIO_NAO_ENCONTRADO') {
        return res.status(404).json({
          mensagem: 'Usuário não encontrado.'
        });
      }

      if (resultado.motivo === 'SEM_CADASTRO_VINCULADO') {
        return res.status(409).json({
          mensagem: 'Esta conta não possui cadastro pessoal vinculado.'
        });
      }
    }

    return res.json({
      mensagem: 'Dados pessoais atualizados com sucesso.'
    });
  } catch (error) {
    next(error);
  }
}

async function alterarSenhaMeuPerfil(req, res, next) {
  try {
    const idUsuario = req.usuarioLogado.id;
    const { senhaAtual, novaSenha } = req.body ?? {};

    if (
      typeof senhaAtual !== 'string' ||
      typeof novaSenha !== 'string' ||
      !senhaAtual ||
      !novaSenha
    ) {
      return res.status(400).json({
        mensagem: 'Informe a senha atual e a nova senha.'
      });
    }

    if (
      novaSenha.length < 8 ||
      Buffer.byteLength(novaSenha, 'utf8') > 72
    ) {
      return res.status(400).json({
        mensagem: 'A nova senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.'
      });
    }

    if (senhaAtual === novaSenha) {
      return res.status(400).json({
        mensagem: 'A nova senha deve ser diferente da senha atual.'
      });
    }

    const hashAtual =
      await usuariosRepository.buscarSenhaHashMeuPerfil(idUsuario);

    if (!hashAtual) {
      return res.status(404).json({
        mensagem: 'Usuário não encontrado.'
      });
    }

    const senhaCorreta = await bcrypt.compare(
      senhaAtual,
      hashAtual
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: 'Senha atual incorreta.'
      });
    }

    const novoHash = await bcrypt.hash(novaSenha, 12);

    const atualizado =
      await usuariosRepository.atualizarSenhaMeuPerfil(
        idUsuario,
        hashAtual,
        novoHash
      );

    if (!atualizado) {
      return res.status(409).json({
        mensagem: 'A senha foi alterada em outra operação. Tente novamente.'
      });
    }

    return res.json({
      mensagem: 'Senha alterada com sucesso.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, cadastrar, perfilAtual, obterMeuPerfil, atualizarEmailMeuPerfil, atualizarDadosPessoaisMeuPerfil, alterarSenhaMeuPerfil };
