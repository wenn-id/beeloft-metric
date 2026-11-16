import { dispatchBrowserApi } from './browserApi';

function useStaticBrowserApi(): boolean {
  if (import.meta.env.VITE_STATIC_API === 'true') return true;
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')) {
    return true;
  }
  return false;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  if (useStaticBrowserApi()) {
    return dispatchBrowserApi<T>(url, options);
  }

  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined)
  };

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers
    });
  } catch {
    return dispatchBrowserApi<T>(url, options);
  }

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        return dispatchBrowserApi<T>(url, options);
      }
      return text as unknown as T;
    }
  }

  if (!res.ok) {
    const message =
      (typeof parsed?.error === 'string' && parsed.error) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return parsed as T;
}
