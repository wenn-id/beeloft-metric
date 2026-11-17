import {
  handleEdgeApiRequest,
  handleEdgeScheduled
} from '../server/cloudflare/edgeRouter.js';
import type { EdgeEnv } from '../server/types.js';

interface WorkerEnv extends EdgeEnv {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}

function isBackendPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname === '/s' ||
    pathname.startsWith('/s/') ||
    pathname === '/p' ||
    pathname === '/tracker.js'
  );
}

export default {
  async fetch(
    request: Request & { cf?: { country?: string } },
    env: WorkerEnv
  ): Promise<Response> {
    const url = new URL(request.url);
    if (isBackendPath(url.pathname)) {
      return handleEdgeApiRequest(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('BeeloftMetric Edge Worker active. Static assets not bound.', {
      status: 200
    });
  },

  async scheduled(_event: unknown, env: WorkerEnv): Promise<void> {
    await handleEdgeScheduled(env);
  }
};
