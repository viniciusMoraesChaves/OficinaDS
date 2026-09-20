class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function parseInteger(value, fallback, field, minimum, maximum) {
  if (value === undefined || value === '') {
    return fallback;
  }

  if (!/^\d+$/.test(String(value))) {
    throw new ValidationError(`${field} deve ser um número inteiro.`);
  }

  const parsed = Number.parseInt(value, 10);

  if (parsed < minimum || parsed > maximum) {
    throw new ValidationError(
      `${field} deve estar entre ${minimum} e ${maximum}.`
    );
  }

  return parsed;
}

function parsePagination(query) {
  const pagina = parseInteger(query.pagina, 1, 'pagina', 1, 1_000_000);
  const limite = parseInteger(query.limite, 8, 'limite', 1, 50);

  return {
    pagina,
    limite,
    offset: (pagina - 1) * limite
  };
}

function parseId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw new ValidationError('O identificador deve ser um número inteiro positivo.');
  }

  const id = Number.parseInt(value, 10);

  if (id <= 0) {
    throw new ValidationError('O identificador deve ser um número inteiro positivo.');
  }

  return id;
}

function parseEmployeeFilters(query) {
  const busca = String(query.busca || '').trim().slice(0, 100);
  const status = String(query.status || 'todos').toLowerCase();

  if (!['todos', 'ativos', 'inativos'].includes(status)) {
    throw new ValidationError('status deve ser todos, ativos ou inativos.');
  }

  return { busca, status };
}

function buildPagination(pagina, limite, total) {
  return {
    pagina,
    limite,
    total,
    totalPaginas: total === 0 ? 0 : Math.ceil(total / limite)
  };
}

module.exports = {
  ValidationError,
  parsePagination,
  parseId,
  parseEmployeeFilters,
  buildPagination
};
