const CHAVE_TOKEN = 'oficinaos:token';
const CHAVE_PERFIL = 'oficinaos:perfil';

export function getToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function setToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function clearToken(): void {
  localStorage.removeItem(CHAVE_TOKEN);
}

export function getPerfil(): string | null {
  return localStorage.getItem(CHAVE_PERFIL);
}

export function setPerfil(perfil: string): void {
  localStorage.setItem(CHAVE_PERFIL, perfil);
}

export function clearPerfil(): void {
  localStorage.removeItem(CHAVE_PERFIL);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const mensagem = (body as { mensagem?: string } | null)?.mensagem;
    throw new Error(mensagem || `Falha na requisição (${response.status}).`);
  }

  return body as T;
}

export function apiFetch<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function apiPost<T>(url: string, data: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: JSON.stringify(data) });
}