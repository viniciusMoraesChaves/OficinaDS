const funcionariosRepository = require('../repositories/funcionariosRepository');
const {
  parsePagination,
  parseEmployeeFilters,
  buildPagination
} = require('../utils/queryParams');
const cargosRepository = require('../repositories/cargosRepository');
const perfisRepository = require('../repositories/perfisRepository');
const { PERFIS } = require('../utils/perfis');

async function search(req, res) {
  const pagination = parsePagination(req.query);
  const filters = parseEmployeeFilters(req.query);
  const result = await funcionariosRepository.search({
    ...pagination,
    ...filters
  });

  res.json({
    dados: result.rows,
    filtros: filters,
    paginacao: buildPagination(
      pagination.pagina,
      pagination.limite,
      result.total
    )
  });
}

async function updateCargo(req, res) {
  const idFuncionario = Number(req.params.id);
  const idCargo = Number(req.body.idCargo);

  if (!Number.isInteger(idFuncionario) || idFuncionario <= 0) {
    return res.status(400).json({
      mensagem: 'Funcionário inválido.'
    });
  }

  if (!Number.isInteger(idCargo) || idCargo <= 0) {
    return res.status(400).json({
      mensagem: 'Cargo inválido.'
    });
  }

  const cargo = await cargosRepository.findById(idCargo);

  if (!cargo) {
    return res.status(404).json({
      mensagem: 'Cargo não encontrado.'
    });
  }

  const nomePerfil =
    cargo.nome === 'Gerente'
      ? PERFIS.ADMINISTRADOR
      : PERFIS.FUNCIONARIO;

  const perfil = await perfisRepository.buscarPorNome(nomePerfil);

  if (!perfil) {
    return res.status(500).json({
      mensagem: 'Perfil correspondente ao cargo não encontrado.'
    });
  }

  const affectedRows = await funcionariosRepository.updateCargoEPerfil(
    idFuncionario,
    idCargo,
    perfil.id
  );

  if (affectedRows === 0) {
    return res.status(404).json({
      mensagem: 'Funcionário não encontrado.'
    });
  }

  res.json({
    mensagem: 'Cargo atualizado com sucesso.'
  });
}

module.exports = { search, updateCargo };
