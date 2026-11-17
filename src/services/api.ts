import { dispatchBrowserApi } from './browserApi';

export class ApiError extends Error {
  readonly status: number;
  readonly data: Record<string, unknown> | null;

  constructor(message: string, status: number, data: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function useStaticGithubPagesPreview(): boolean {
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
  if (useStaticGithubPagesPreview()) {
    return dispatchBrowserApi<T>(url, options);
  }

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
  let parsed: Record<string, unknown> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        throw new ApiError(`Request failed with status ${res.status}`, res.status);
      }
      return text as unknown as T;
    }
  }

  if (!res.ok) {
    const message =
      (typeof parsed?.error === 'string' && parsed.error) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}
