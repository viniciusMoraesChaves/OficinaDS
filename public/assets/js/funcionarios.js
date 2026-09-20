import {
  apiFetch,
  createElement,
  createStatusBadge,
  formatCpf,
  formatDate,
  formatPhone,
  initializeLayout,
  renderPagination,
  setMessage
} from './shared.js';

const form = document.querySelector('#funcionarios-search-form');
const searchInput = document.querySelector('#funcionarios-search');
const statusSelect = document.querySelector('#funcionarios-status');
const clearButton = document.querySelector('#clear-search');
const submitButton = document.querySelector('#submit-search');
const tableBody = document.querySelector('#funcionarios-table-body');
const feedback = document.querySelector('#funcionarios-feedback');
const paginationElement = document.querySelector('#funcionarios-pagination');
const searchSummary = document.querySelector('#search-summary');

const state = {
  pagina: 1,
  limite: 8,
  busca: '',
  status: 'todos'
};

function appendCell(row, content, className = '') {
  const cell = createElement('td', { className });

  if (content instanceof Node) {
    cell.append(content);
  } else {
    cell.textContent = content;
  }

  row.append(cell);
}

function renderRows(employees) {
  tableBody.replaceChildren();

  for (const employee of employees) {
    const row = document.createElement('tr');
    const person = createElement('div', { className: 'person-cell' });
    const avatar = createElement('span', {
      className: 'avatar avatar--blue',
      text: employee.nome.slice(0, 2).toUpperCase()
    });
    const identity = createElement('span', { className: 'person-cell__identity' });
    identity.append(
      createElement('strong', { text: employee.nome }),
      createElement('small', { text: employee.email })
    );
    person.append(avatar, identity);

    appendCell(row, person);
    appendCell(row, employee.cargo);
    appendCell(row, formatCpf(employee.cpf), 'nowrap');
    appendCell(row, formatPhone(employee.telefone), 'nowrap');
    appendCell(row, formatDate(employee.dataAdmissao), 'nowrap');
    appendCell(row, createStatusBadge(Boolean(employee.ativo)));
    tableBody.append(row);
  }
}

function renderEmpty() {
  tableBody.replaceChildren();
  const row = document.createElement('tr');
  const cell = createElement('td', {
    className: 'empty-cell',
    text: 'Nenhum funcionário corresponde à pesquisa.'
  });
  cell.colSpan = 6;
  row.append(cell);
  tableBody.append(row);
}

function updateSummary(total) {
  const pieces = [];

  if (state.busca) pieces.push(`“${state.busca}”`);
  if (state.status !== 'todos') pieces.push(state.status);

  searchSummary.textContent = pieces.length
    ? `${total} resultado${total === 1 ? '' : 's'} para ${pieces.join(' • ')}`
    : `${total} funcionário${total === 1 ? '' : 's'} no total`;
}

async function searchEmployees() {
  setMessage(feedback, 'loading', 'Pesquisando funcionários...');
  submitButton.disabled = true;

  const params = new URLSearchParams({
    pagina: String(state.pagina),
    limite: String(state.limite),
    busca: state.busca,
    status: state.status
  });

  try {
    const result = await apiFetch(`/api/funcionarios?${params}`);

    if (result.dados.length === 0) {
      renderEmpty();
    } else {
      renderRows(result.dados);
    }

    updateSummary(result.paginacao.total);
    renderPagination(paginationElement, result.paginacao, (page) => {
      state.pagina = page;
      searchEmployees();
    });
    setMessage(feedback, '', '');
  } catch (error) {
    tableBody.replaceChildren();
    paginationElement.replaceChildren();
    searchSummary.textContent = '';
    setMessage(feedback, 'error', error.message);
  } finally {
    submitButton.disabled = false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  state.busca = searchInput.value.trim();
  state.status = statusSelect.value;
  state.pagina = 1;
  searchEmployees();
});

statusSelect.addEventListener('change', () => form.requestSubmit());

clearButton.addEventListener('click', () => {
  searchInput.value = '';
  statusSelect.value = 'todos';
  state.busca = '';
  state.status = 'todos';
  state.pagina = 1;
  searchEmployees();
  searchInput.focus();
});

initializeLayout();
searchEmployees();
