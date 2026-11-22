const painelRepository = require('../repositories/painelRepository');
const clientesRepository = require('../repositories/clientesRepository');
const funcionariosRepository = require('../repositories/funcionariosRepository');
const { PERFIS } = require('../utils/perfis');
const {
  indicadoresEquipe,
  pendenciasEquipe,
  indicadoresCliente,
  pendenciasCliente
} = require('../utils/painel');

async function painelDoCliente(usuario) {
  const cliente = await clientesRepository.findByUsuarioId(usuario.id);

  if (!cliente) {
    return { nome: null, indicadores: [], pendencias: [] };
  }

  const [contagens, listas] = await Promise.all([
    painelRepository.contagensCliente(cliente.id),
    painelRepository.listasCliente(cliente.id)
  ]);

  return {
    nome: cliente.nome,
    indicadores: indicadoresCliente(contagens),
    pendencias: pendenciasCliente(listas)
  };
}

async function painelDaEquipe(usuario) {
  const administrador = usuario.perfil === PERFIS.ADMINISTRADOR;

  const [funcionario, contagens, listas] = await Promise.all([
    funcionariosRepository.findByUsuarioId(usuario.id),
    painelRepository.contagensEquipe({ administrador }),
    painelRepository.listasEquipe()
  ]);

  return {
    nome: funcionario ? funcionario.nome : null,
    indicadores: indicadoresEquipe(contagens, { administrador }),
    pendencias: pendenciasEquipe(listas)
  };
}

// GET /api/painel: números e pendências já filtrados pelo perfil de quem pergunta.
async function obter(req, res) {
  const usuario = req.usuarioLogado;

  const painel = usuario.perfil === PERFIS.CLIENTE
    ? await painelDoCliente(usuario)
    : await painelDaEquipe(usuario);

  res.json({
    dados: {
      usuario: { nome: painel.nome, perfil: usuario.perfil },
      indicadores: painel.indicadores,
      pendencias: painel.pendencias
    }
  });
}

module.exports = { obter };
