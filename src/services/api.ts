export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined)
  };

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = parsed?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return parsed as T;
}
