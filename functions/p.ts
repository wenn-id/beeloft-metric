import { handleEdgeApiRequest } from '../server/cloudflare/edgeRouter';
import type { EdgeEnv } from '../server/types';

export const onRequest = (ctx: {
  request: Request & { cf?: { country?: string } };
  env: EdgeEnv;
}): Promise<Response> => handleEdgeApiRequest(ctx.request, ctx.env);
