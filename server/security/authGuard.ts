import { randomToken, sha256Hex } from './crypto.js';
import { evaluateUserTrialStatus } from '../workspaceTemplate.js';
import type {
  PlatformRepository,
  RouteReply,
  RouteRequest,
  UserAccountRow
} from '../types.js';

export const SESSION_COOKIE_NAME = '_bm_session';
const SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days

export function getRequestOrigin(req: RouteRequest): string {
  if (req.origin) return req.origin.replace(/\/+$/, '');
  const envUrl = req.env?.PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const proto = req.headers?.['x-forwarded-proto'] || (host?.includes('127.0.0.1') || host?.includes('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}`;
  return 'https://beeloftmetric.biz.id';
}

export function isHttpsRequest(req: RouteRequest): boolean {
  const origin = getRequestOrigin(req);
  return origin.startsWith('https://');
}

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

export function getCookieValue(req: RouteRequest, name: string): string | undefined {
  if (req.cookies && req.cookies[name]) return req.cookies[name];
  const parsed = parseCookieHeader(req.headers?.cookie);
  return parsed[name];
}

export async function issueUserSession(params: {
  repo: PlatformRepository;
  req: RouteRequest;
  reply: RouteReply;
  userId: number;
}): Promise<string> {
  const rawToken = randomToken('bms', 28);
  const tokenHash = await sha256Hex(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();

  await params.repo.createSession({
    tokenHash,
    userId: params.userId,
    expiresAt,
    ip: params.req.ip || params.req.headers?.['cf-connecting-ip'] || null,
    userAgent: params.req.headers?.['user-agent'] || null,
    createdAt: now.toISOString()
  });

  params.reply.setCookie(SESSION_COOKIE_NAME, rawToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(params.req),
    maxAge: SESSION_TTL_SECONDS
  });

  return rawToken;
}

export async function destroyUserSession(params: {
  repo: PlatformRepository;
  req: RouteRequest;
  reply: RouteReply;
}): Promise<void> {
  const rawToken = getCookieValue(params.req, SESSION_COOKIE_NAME);
  if (rawToken) {
    const tokenHash = await sha256Hex(rawToken);
    await params.repo.deleteSession(tokenHash);
  }
  params.reply.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(params.req)
  });
}

export async function resolveAuthenticatedUser(
  req: RouteRequest,
  repo: PlatformRepository
): Promise<UserAccountRow | null> {
  // 1. Check session cookie
  const rawCookie = getCookieValue(req, SESSION_COOKIE_NAME);
  if (rawCookie) {
    const tokenHash = await sha256Hex(rawCookie);
    const session = await repo.getSession(tokenHash);
    if (session) {
      const user = await repo.getUserById(session.userId);
      if (user && user.status === 'ACTIVE') {
        if (evaluateUserTrialStatus(user)) {
          await repo.saveUser(user);
        }
        return user;
      }
    }
  }

  // 2. Check X-Mc-Auth or Bearer API token
  const mcAuth = req.headers?.['x-mc-auth'];
  const authHeader = req.headers?.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const apiToken = mcAuth || bearer;
  if (apiToken) {
    const user = await repo.getUserByApiToken(apiToken);
    if (user && user.status === 'ACTIVE') {
      if (evaluateUserTrialStatus(user)) {
        await repo.saveUser(user);
      }
      return user;
    }
  }

  return null;
}

export async function requireUser(
  req: RouteRequest,
  reply: RouteReply,
  repo: PlatformRepository
): Promise<UserAccountRow | null> {
  const user = await resolveAuthenticatedUser(req, repo);
  if (!user) {
    reply.code(401);
    return null;
  }
  return user;
}
