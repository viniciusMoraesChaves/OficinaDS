// sessionStorage: cada aba tem a sua própria sessão (admin, funcionário e cliente
// podem ficar abertos ao mesmo tempo sem sobrescrever um ao outro).
const CHAVE_TOKEN = 'oficinaos:token';
const CHAVE_PERFIL = 'oficinaos:perfil';

export const EVENTO_SESSAO_EXPIRADA = 'oficinaos:sessao-expirada';
const ERROS_DE_SESSAO = [
  'NAO_AUTENTICADO',
  'TOKEN_INVALIDO',
  'USUARIO_INVALIDO',
  'USUARIO_NAO_IDENTIFICADO'
];

export function getToken(): string | null {
  return sessionStorage.getItem(CHAVE_TOKEN);
}

export function setToken(token: string): void {
  sessionStorage.setItem(CHAVE_TOKEN, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(CHAVE_TOKEN);
}

export function getPerfil(): string | null {
  return sessionStorage.getItem(CHAVE_PERFIL);
}

export function setPerfil(perfil: string): void {
  sessionStorage.setItem(CHAVE_PERFIL, perfil);
}

export function clearPerfil(): void {
  sessionStorage.removeItem(CHAVE_PERFIL);
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const { mensagem, erro } = (body as { mensagem?: string; erro?: string } | null) ?? {};

    // Token vencido/inválido: avisa o AuthContext para encerrar a sessão.
    if (response.status === 401 && token && erro && ERROS_DE_SESSAO.includes(erro)) {
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }

    throw new Error(
      mensagem || `Falha na requisição (${response.status}).`
    );
  }

  return body as T;
}

export function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  return request<T>(url, options);
}

export function apiPost<T>(
  url: string,
  data: unknown
): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}