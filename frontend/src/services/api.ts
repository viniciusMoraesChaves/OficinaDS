export async function apiFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

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