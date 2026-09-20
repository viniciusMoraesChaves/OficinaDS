export async function apiFetch(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.mensagem || `Falha na requisição (${response.status}).`);
  }

  return body;
}

export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.type) element.type = options.type;
  if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);

  return element;
}

export function formatCpf(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length !== 11) return value || '—';

  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return value || '—';
}

export function formatDate(value) {
  if (!value) return '—';

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function createStatusBadge(active) {
  return createElement('span', {
    className: `status-badge ${active ? 'is-active' : 'is-inactive'}`,
    text: active ? 'Ativo' : 'Inativo'
  });
}

export function setMessage(element, type, message) {
  element.className = `feedback ${type ? `feedback--${type}` : ''}`.trim();
  element.textContent = message || '';
  element.hidden = !message;
}

export function renderPagination(container, pagination, onPageChange) {
  container.replaceChildren();

  const { pagina, totalPaginas, total } = pagination;
  const summary = createElement('p', {
    className: 'pagination__summary',
    text: `${total} registro${total === 1 ? '' : 's'}`
  });
  container.append(summary);

  if (totalPaginas <= 1) return;

  const controls = createElement('div', { className: 'pagination__controls' });

  const previous = createElement('button', {
    className: 'button button--secondary button--small',
    text: 'Anterior',
    type: 'button'
  });
  previous.disabled = pagina <= 1;
  previous.addEventListener('click', () => onPageChange(pagina - 1));

  const label = createElement('span', {
    className: 'pagination__page',
    text: `Página ${pagina} de ${totalPaginas}`
  });

  const next = createElement('button', {
    className: 'button button--secondary button--small',
    text: 'Próxima',
    type: 'button'
  });
  next.disabled = pagina >= totalPaginas;
  next.addEventListener('click', () => onPageChange(pagina + 1));

  controls.append(previous, label, next);
  container.append(controls);
}

export function initializeLayout() {
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  function setOpen(open) {
    sidebar?.classList.toggle('is-open', open);
    backdrop?.classList.toggle('is-visible', open);
    toggle?.setAttribute('aria-expanded', String(open));
  }

  toggle?.addEventListener('click', () => {
    setOpen(!sidebar?.classList.contains('is-open'));
  });

  backdrop?.addEventListener('click', () => setOpen(false));

  document.querySelectorAll('.sidebar__link').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });
}
