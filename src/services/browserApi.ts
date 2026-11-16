import { createInitialDatabase } from '../../server/seed';
import { registerCoreRoutes } from '../../server/routes/core';
import { registerExtraRoutes } from '../../server/routes/extras';
import type {
  BeeloftDatabase,
  DataStore,
  RouteHandler,
  RouteRegistry,
  RouteReply
} from '../../server/types';

const STORAGE_KEY = 'beeloft_metric_db_v1';

class BrowserLocalStore implements DataStore {
  private db: BeeloftDatabase | null = null;

  async get(): Promise<BeeloftDatabase> {
    if (this.db) return this.db;
    const defaults = createInitialDatabase();
    try {
      const raw =
        typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BeeloftDatabase>;
        this.db = {
          ...defaults,
          ...parsed,
          user: { ...defaults.user, ...(parsed.user ?? {}) }
        };
        return this.db;
      }
    } catch {
      // Fallback to fresh seed data when localStorage is empty or malformed
    }
    this.db = defaults;
    await this.persist();
    return this.db;
  }

  async persist(): Promise<void> {
    if (!this.db || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  }
}

interface RouteEntry {
  method: string;
  segments: string[];
  literalCount: number;
  handler: RouteHandler;
}

class BrowserRouter implements RouteRegistry {
  private routes: RouteEntry[] = [];

  private add(method: string, path: string, handler: RouteHandler): void {
    const segments = path.split('/').filter(Boolean);
    const literalCount = segments.filter((seg) => !seg.startsWith(':')).length;
    this.routes.push({ method, segments, literalCount, handler });
  }

  get(path: string, h: RouteHandler): void {
    this.add('GET', path, h);
  }
  post(path: string, h: RouteHandler): void {
    this.add('POST', path, h);
  }
  put(path: string, h: RouteHandler): void {
    this.add('PUT', path, h);
  }
  patch(path: string, h: RouteHandler): void {
    this.add('PATCH', path, h);
  }
  delete(path: string, h: RouteHandler): void {
    this.add('DELETE', path, h);
  }

  match(
    method: string,
    pathname: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    const targetSegs = pathname.split('/').filter(Boolean);
    const upperMethod = method.toUpperCase();
    let best: { literalCount: number; handler: RouteHandler; params: Record<string, string> } | null =
      null;

    for (const route of this.routes) {
      if (route.method !== upperMethod) continue;
      if (route.segments.length !== targetSegs.length) continue;

      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i += 1) {
        const expected = route.segments[i];
        const actual = targetSegs[i];
        if (expected.startsWith(':')) {
          params[expected.slice(1)] = decodeURIComponent(actual);
        } else if (expected !== actual) {
          matched = false;
          break;
        }
      }

      if (matched && (!best || route.literalCount > best.literalCount)) {
        best = { literalCount: route.literalCount, handler: route.handler, params };
      }
    }

    return best ? { handler: best.handler, params: best.params } : null;
  }
}

const store = new BrowserLocalStore();
const router = new BrowserRouter();
registerCoreRoutes(router, store);
registerExtraRoutes(router, store);

function parseQueryParams(search: string): Record<string, string> {
  const query: Record<string, string> = {};
  const sp = new URLSearchParams(search);
  sp.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

export async function dispatchBrowserApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(url, 'http://localhost');
  const hit = router.match(method, parsedUrl.pathname);

  if (!hit) {
    throw new Error(`No browser API route found for ${method} ${parsedUrl.pathname}`);
  }

  let body: unknown = undefined;
  if (typeof options.body === 'string' && options.body.length > 0) {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = options.body;
    }
  } else if (options.body !== undefined) {
    body = options.body;
  }

  let statusCode = 200;
  const reply: RouteReply = {
    code(status: number) {
      statusCode = status;
      return reply;
    },
    setCookie(name: string, val: string) {
      if (typeof document !== 'undefined') {
        document.cookie = `${name}=${encodeURIComponent(val)}; path=/; SameSite=Lax`;
      }
      return reply;
    },
    clearCookie(name: string) {
      if (typeof document !== 'undefined') {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      }
      return reply;
    },
    header() {
      return reply;
    }
  };

  const result = await hit.handler(
    {
      body,
      query: parseQueryParams(parsedUrl.search),
      params: hit.params
    },
    reply
  );

  if (statusCode >= 400) {
    const errBody = result as { error?: string } | null;
    throw new Error(errBody?.error || `Request failed with status ${statusCode}`);
  }

  if (result === null || result === undefined || typeof result !== 'object') {
    return result as T;
  }
  return JSON.parse(JSON.stringify(result)) as T;
}
