import {
  apiFetch,
  createElement,
  createStatusBadge,
  formatCpf,
  formatPhone,
  initializeLayout,
  renderPagination,
  setMessage
} from './shared.js';

const tableBody = document.querySelector('#clientes-table-body');
const feedback = document.querySelector('#clientes-feedback');
const paginationElement = document.querySelector('#clientes-pagination');
const reloadButton = document.querySelector('#reload-clientes');
const dialog = document.querySelector('#cliente-dialog');
const dialogBody = document.querySelector('#cliente-dialog-body');
const dialogTitle = document.querySelector('#cliente-dialog-title');
const dialogClose = document.querySelector('#cliente-dialog-close');

const state = {
  pagina: 1,
  limite: 8
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

function renderRows(clients) {
  tableBody.replaceChildren();

  for (const client of clients) {
    const row = document.createElement('tr');
    const person = createElement('div', { className: 'person-cell' });
    const avatar = createElement('span', {
      className: 'avatar',
      text: client.nome.slice(0, 2).toUpperCase()
    });
    const identity = createElement('span', { className: 'person-cell__identity' });
    identity.append(
      createElement('strong', { text: client.nome }),
      createElement('small', { text: client.email })
    );
    person.append(avatar, identity);

    const vehicleCount = Number(client.quantidadeVeiculos);
    const detailsButton = createElement('button', {
      className: 'button button--secondary button--small',
      text: 'Ver detalhes',
      type: 'button',
      ariaLabel: `Ver detalhes de ${client.nome}`
    });
    detailsButton.addEventListener('click', () => showClient(client.id));

    appendCell(row, person);
    appendCell(row, formatCpf(client.cpf), 'nowrap');
    appendCell(row, formatPhone(client.telefone), 'nowrap');
    appendCell(
      row,
      `${vehicleCount} veículo${vehicleCount === 1 ? '' : 's'}`,
      'nowrap'
    );
    appendCell(row, createStatusBadge(Boolean(client.ativo)));
    appendCell(row, detailsButton, 'align-right');
    tableBody.append(row);
  }
}

function renderEmpty() {
  tableBody.replaceChildren();
  const row = document.createElement('tr');
  const cell = createElement('td', {
    className: 'empty-cell',
    text: 'Nenhum cliente foi cadastrado ainda.'
  });
  cell.colSpan = 6;
  row.append(cell);
  tableBody.append(row);
}

async function loadClients() {
  setMessage(feedback, 'loading', 'Carregando clientes...');
  reloadButton.disabled = true;

  try {
    const result = await apiFetch(
      `/api/clientes?pagina=${state.pagina}&limite=${state.limite}`
    );

    if (result.dados.length === 0) {
      renderEmpty();
    } else {
      renderRows(result.dados);
    }

    renderPagination(paginationElement, result.paginacao, (page) => {
      state.pagina = page;
      loadClients();
    });
    setMessage(feedback, '', '');
  } catch (error) {
    tableBody.replaceChildren();
    paginationElement.replaceChildren();
    setMessage(feedback, 'error', error.message);
  } finally {
    reloadButton.disabled = false;
  }
}

function addDetailItem(container, label, value) {
  const item = createElement('div', { className: 'detail-item' });
  item.append(
    createElement('dt', { text: label }),
    createElement('dd', { text: value || '—' })
  );
  container.append(item);
}

async function showClient(id) {
  dialogTitle.textContent = 'Carregando cliente...';
  dialogBody.replaceChildren(
    createElement('p', { className: 'feedback feedback--loading', text: 'Buscando detalhes...' })
  );
  dialog.showModal();

  try {
    const { dados: client } = await apiFetch(`/api/clientes/${id}`);
    dialogTitle.textContent = client.nome;
    dialogBody.replaceChildren();

    const details = createElement('dl', { className: 'details-grid' });
    addDetailItem(details, 'CPF', formatCpf(client.cpf));
    addDetailItem(details, 'E-mail', client.email);
    addDetailItem(details, 'Telefone', formatPhone(client.telefone));
    addDetailItem(details, 'Status', client.ativo ? 'Ativo' : 'Inativo');
    addDetailItem(details, 'Endereço', client.endereco);
    dialogBody.append(details);

    dialogBody.append(
      createElement('h3', {
        className: 'dialog__section-title',
        text: `Veículos (${client.veiculos.length})`
      })
    );

    if (client.veiculos.length === 0) {
      dialogBody.append(
        createElement('p', {
          className: 'empty-panel',
          text: 'Este cliente não possui veículos cadastrados.'
        })
      );
      return;
    }

    const vehicleList = createElement('div', { className: 'vehicle-list' });

    for (const vehicle of client.veiculos) {
      const card = createElement('article', { className: 'vehicle-card' });
      card.append(
        createElement('span', { className: 'plate', text: vehicle.placa }),
        createElement('strong', { text: `${vehicle.marca} ${vehicle.modelo}` }),
        createElement('small', {
          text: `${vehicle.ano} • ${vehicle.cor || 'Cor não informada'}`
        })
      );
      vehicleList.append(card);
    }

    dialogBody.append(vehicleList);
  } catch (error) {
    dialogTitle.textContent = 'Não foi possível abrir o cliente';
    dialogBody.replaceChildren(
      createElement('p', { className: 'feedback feedback--error', text: error.message })
    );
  }
}

reloadButton.addEventListener('click', loadClients);
dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

initializeLayout();
loadClients();
