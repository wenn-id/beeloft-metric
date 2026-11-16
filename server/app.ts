import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { JsonStore } from './store.js';
import { registerCoreRoutes } from './routes/core.js';
import { registerExtraRoutes } from './routes/extras.js';
import type { RouteRegistry } from './types.js';

export async function buildApp(store = new JsonStore()): Promise<FastifyInstance> {
  await store.init();

  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  registerCoreRoutes(app as unknown as RouteRegistry, store);
  registerExtraRoutes(app as unknown as RouteRegistry, store);

  return app;
}
