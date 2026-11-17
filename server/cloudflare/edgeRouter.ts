import { runScheduledJobs } from '../jobs/scheduler.js';
import { parseCookieHeader } from '../security/authGuard.js';
import { isBinaryHttpPayload } from '../services/media.js';
import { isRedirectHttpPayload, registerProductionExtraRoutes } from '../routes/productionExtras.js';
import { registerProductionCoreRoutes } from '../routes/productionCore.js';
import { D1PlatformRepository } from '../storage/d1Repository.js';
import { MemoryPlatformRepository } from '../storage/memoryRepository.js';
import type {
  CookieOptions,
  EdgeEnv,
  PlatformRepository,
  RouteHandler,
  RouteRegistry,
  RouteReply
} from '../types.js';

interface EdgeRouteEntry {
  method: string;
  segments: string[];
  literalCount: number;
  handler: RouteHandler;
}

class EdgeRouteMatcher implements RouteRegistry {
  private routes: EdgeRouteEntry[] = [];

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
    const upper = method.toUpperCase();
    let best: { literalCount: number; handler: RouteHandler; params: Record<string, string> } | null =
      null;

    for (const route of this.routes) {
      if (route.method !== upper) continue;
      if (route.segments.length !== targetSegs.length) continue;

      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i += 1) {
        const exp = route.segments[i];
        const act = targetSegs[i];
        if (exp.startsWith(':')) {
          params[exp.slice(1)] = decodeURIComponent(act);
        } else if (exp !== act) {
          ok = false;
          break;
        }
      }
      if (ok && (!best || route.literalCount > best.literalCount)) {
        best = { literalCount: route.literalCount, handler: route.handler, params };
      }
    }

    return best ? { handler: best.handler, params: best.params } : null;
  }
}

const fallbackMemoryRepo = new MemoryPlatformRepository();

export function resolveEdgeRepository(env?: EdgeEnv): PlatformRepository {
  if (env?.DB) {
    return new D1PlatformRepository(env.DB);
  }
  return fallbackMemoryRepo;
}

function serializeSetCookie(name: string, val: string, opts?: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(val)}`];
  parts.push(`Path=${opts?.path || '/'}`);
  if (opts?.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts?.httpOnly) parts.push('HttpOnly');
  if (opts?.secure) parts.push('Secure');
  const sameSite = opts?.sameSite || 'lax';
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`);
  return parts.join('; ');
}

export async function handleEdgeApiRequest(
  request: Request & { cf?: { country?: string } },
  env?: EdgeEnv
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Mc-Auth, Authorization, Stripe-Signature, X-Hub-Signature-256'
      }
    });
  }

  const repo = resolveEdgeRepository(env);
  const matcher = new EdgeRouteMatcher();
  registerProductionCoreRoutes(matcher, repo);
  registerProductionExtraRoutes(matcher, repo);

  const hit = matcher.match(request.method, url.pathname);
  if (!hit) {
    return new Response(JSON.stringify({ error: `Endpoint not found: ${request.method} ${url.pathname}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const headersObj: Record<string, string | undefined> = {};
  request.headers.forEach((v, k) => {
    headersObj[k.toLowerCase()] = v;
  });

  const queryObj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    queryObj[k] = v;
  });

  let rawBody = '';
  let parsedBody: unknown = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    rawBody = await request.text();
    if (rawBody.length > 0) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }
  }

  let statusCode = 200;
  const responseHeaders = new Headers();
  const setCookies: string[] = [];

  const reply: RouteReply = {
    code(s: number) {
      statusCode = s;
      return reply;
    },
    header(k: string, v: string) {
      responseHeaders.set(k, v);
      return reply;
    },
    setCookie(name: string, val: string, opts?: CookieOptions) {
      setCookies.push(serializeSetCookie(name, val, opts));
      return reply;
    },
    clearCookie(name: string, opts?: CookieOptions) {
      setCookies.push(serializeSetCookie(name, '', { ...opts, maxAge: 0 }));
      return reply;
    }
  };

  try {
    const result = await hit.handler(
      {
        body: parsedBody,
        rawBody,
        query: queryObj,
        params: hit.params,
        headers: headersObj,
        cookies: parseCookieHeader(headersObj.cookie),
        ip: headersObj['cf-connecting-ip'] || headersObj['x-forwarded-for'],
        countryCode: request.cf?.country || headersObj['cf-ipcountry'],
        origin: `${url.protocol}//${url.host}`,
        env
      },
      reply
    );

    for (const c of setCookies) {
      responseHeaders.append('Set-Cookie', c);
    }

    if (isRedirectHttpPayload(result)) {
      responseHeaders.set('Location', result.__redirectUrl);
      return new Response(null, { status: 302, headers: responseHeaders });
    }

    if (isBinaryHttpPayload(result)) {
      if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', result.contentType);
      }
      if (!responseHeaders.has('Cache-Control')) {
        responseHeaders.set('Cache-Control', result.cacheControl);
      }
      return new Response(result.bytes as BodyInit, { status: statusCode, headers: responseHeaders });
    }

    if (typeof result === 'string') {
      if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
      }
      return new Response(result, { status: statusCode, headers: responseHeaders });
    }

    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
    }
    return new Response(JSON.stringify(result), { status: statusCode, headers: responseHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal edge server error.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}

export async function handleEdgeScheduled(env?: EdgeEnv): Promise<void> {
  const repo = resolveEdgeRepository(env);
  await runScheduledJobs(repo, env);
}
