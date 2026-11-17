import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { isBinaryHttpPayload } from './services/media.js';
import { isRedirectHttpPayload, registerProductionExtraRoutes } from './routes/productionExtras.js';
import { registerProductionCoreRoutes } from './routes/productionCore.js';
import { NodeFilePlatformRepository } from './storage/nodeFileRepository.js';
import type {
  CookieOptions,
  EdgeEnv,
  PlatformRepository,
  RouteHandler,
  RouteRegistry,
  RouteReply
} from './types.js';

function envFromNodeProcess(overrides?: EdgeEnv): EdgeEnv {
  const p = (process.env ?? {}) as Record<string, string | undefined>;
  return {
    PUBLIC_APP_URL: p.PUBLIC_APP_URL,
    ADMIN_EMAIL: p.ADMIN_EMAIL,
    META_APP_ID: p.META_APP_ID,
    META_APP_SECRET: p.META_APP_SECRET,
    META_WEBHOOK_VERIFY_TOKEN: p.META_WEBHOOK_VERIFY_TOKEN,
    TIKTOK_CLIENT_KEY: p.TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET: p.TIKTOK_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: p.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: p.GOOGLE_CLIENT_SECRET,
    X_CLIENT_ID: p.X_CLIENT_ID,
    X_CLIENT_SECRET: p.X_CLIENT_SECRET,
    LINKEDIN_CLIENT_ID: p.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: p.LINKEDIN_CLIENT_SECRET,
    GEMINI_API_KEY: p.GEMINI_API_KEY,
    OPENAI_API_KEY: p.OPENAI_API_KEY,
    RESEND_API_KEY: p.RESEND_API_KEY,
    MAILCHANNELS_API_KEY: p.MAILCHANNELS_API_KEY,
    SMTP_RELAY_URL: p.SMTP_RELAY_URL,
    EMAIL_FROM: p.EMAIL_FROM,
    MIDTRANS_SERVER_KEY: p.MIDTRANS_SERVER_KEY,
    MIDTRANS_CLIENT_KEY: p.MIDTRANS_CLIENT_KEY,
    MIDTRANS_IS_PRODUCTION: p.MIDTRANS_IS_PRODUCTION,
    STRIPE_SECRET_KEY: p.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: p.STRIPE_WEBHOOK_SECRET,
    ...overrides
  };
}

export async function buildApp(
  repo: PlatformRepository = new NodeFilePlatformRepository(),
  envOverride?: EdgeEnv
): Promise<FastifyInstance> {
  await repo.ensureReady();

  const app = Fastify({
    logger: false,
    bodyLimit: 15 * 1024 * 1024
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  // Preserve raw JSON body string for Stripe / Meta HMAC webhook verification
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    const raw = typeof body === 'string' ? body : body.toString('utf-8');
    (req as unknown as { rawBody?: string }).rawBody = raw;
    if (!raw) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  const mergedEnv = envFromNodeProcess(envOverride);

  const bindMethod = (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    handler: RouteHandler
  ) => {
    app[method](path, async (fReq, fReply) => {
      const headersObj: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(fReq.headers)) {
        headersObj[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
      }

      const host = headersObj['x-forwarded-host'] || headersObj.host || '127.0.0.1:4000';
      const proto = headersObj['x-forwarded-proto'] || 'http';

      const replyAdapter: RouteReply = {
        code(s: number) {
          fReply.code(s);
          return replyAdapter;
        },
        header(k: string, v: string) {
          fReply.header(k, v);
          return replyAdapter;
        },
        setCookie(name: string, val: string, opts?: CookieOptions) {
          fReply.setCookie(name, val, {
            path: opts?.path || '/',
            httpOnly: opts?.httpOnly ?? false,
            sameSite: opts?.sameSite || 'lax',
            secure: opts?.secure ?? false,
            maxAge: opts?.maxAge
          });
          return replyAdapter;
        },
        clearCookie(name: string, opts?: CookieOptions) {
          fReply.clearCookie(name, {
            path: opts?.path || '/',
            httpOnly: opts?.httpOnly ?? false,
            sameSite: opts?.sameSite || 'lax',
            secure: opts?.secure ?? false
          });
          return replyAdapter;
        }
      };

      const res = await handler(
        {
          body: fReq.body,
          rawBody: (fReq as unknown as { rawBody?: string }).rawBody,
          query: fReq.query,
          params: fReq.params,
          headers: headersObj,
          cookies: fReq.cookies,
          ip: fReq.ip,
          countryCode: headersObj['cf-ipcountry'],
          origin: `${proto}://${host}`,
          env: mergedEnv
        },
        replyAdapter
      );

      if (isRedirectHttpPayload(res)) {
        return fReply.redirect(res.__redirectUrl, 302);
      }
      if (isBinaryHttpPayload(res)) {
        return fReply.send(Buffer.from(res.bytes));
      }
      return res;
    });
  };

  const registry: RouteRegistry = {
    get: (p, h) => bindMethod('get', p, h),
    post: (p, h) => bindMethod('post', p, h),
    put: (p, h) => bindMethod('put', p, h),
    patch: (p, h) => bindMethod('patch', p, h),
    delete: (p, h) => bindMethod('delete', p, h)
  };

  registerProductionCoreRoutes(registry, repo);
  registerProductionExtraRoutes(registry, repo);

  return app;
}
