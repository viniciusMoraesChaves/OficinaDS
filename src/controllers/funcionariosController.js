const funcionariosRepository = require('../repositories/funcionariosRepository');
const {
  parsePagination,
  parseEmployeeFilters,
  buildPagination
} = require('../utils/queryParams');

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

  const affectedRows = await funcionariosRepository.updateCargo(
    idFuncionario,
    idCargo
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
