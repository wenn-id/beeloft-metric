import { runScheduledJobs } from '../jobs/scheduler.js';
import {
  getRequestOrigin,
  requireUser,
  resolveAuthenticatedUser
} from '../security/authGuard.js';
import {
  buildTotpUri,
  generateTotpSecret,
  randomToken,
  verifyTotpCode
} from '../security/crypto.js';
import { generateSocialPostDraft } from '../services/aiAssistant.js';
import {
  createSubscriptionCheckout,
  handleMidtransWebhook,
  handleStripeWebhook
} from '../services/billing.js';
import { sendTransactionalEmail } from '../services/mailer.js';
import { readMediaObject, uploadMediaObject } from '../services/media.js';
import {
  buildOAuthAuthorizeUrl,
  exchangeOAuthCallback,
  listOAuthProviderStatuses,
  verifyWebhookSignature
} from '../services/oauthAndSocial.js';
import { computeRealtimeAnalytics } from '../services/trackerScript.js';
import { createBrandRecord, PLAN_QUOTAS } from '../workspaceTemplate.js';
import type {
  AdGroup,
  AdKeyword,
  AutomationFlow,
  BeeloftDatabase,
  Brand,
  CampaignDashboardItem,
  CompetitorProfile,
  LibraryPostTemplate,
  NetworkKey,
  PlatformRepository,
  ReviewTask,
  RouteRegistry,
  StudioBlock,
  StudioReport,
  TeamMember,
  UserProfile
} from '../types.js';

function resolveBlogId(workspace: BeeloftDatabase, raw: unknown): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0 && workspace.brands.some((b) => b.blogId === n && !b.deleted)) {
    return n;
  }
  return workspace.brands.find((b) => !b.deleted)?.blogId ?? 0;
}

export interface RedirectHttpPayload {
  __redirectUrl: string;
}

export function isRedirectHttpPayload(val: unknown): val is RedirectHttpPayload {
  return Boolean(val && typeof val === 'object' && typeof (val as RedirectHttpPayload).__redirectUrl === 'string');
}

export function registerProductionExtraRoutes(
  app: RouteRegistry,
  repo: PlatformRepository
): void {
  // ==========================================
  // 1. Legacy Compatibility (/api/admin/*, /api/profile/*, /api/user/*)
  // ==========================================
  app.get('/api/admin/simpleProfiles', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return user.workspace.brands
      .filter((b) => !b.deleted)
      .map((b) => ({
        blogId: b.blogId,
        name: b.name,
        timezone: b.timezone,
        connectionsCount: Object.values(b.connections).filter((c) => c.connected).length
      }));
  });

  app.post('/api/admin/add-profile', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { name?: string; label?: string; timezone?: string };
    const name = (body.name || body.label || '').trim();
    if (!name) {
      reply.code(400);
      return { error: 'Profile name is required.' };
    }
    const quota = PLAN_QUOTAS[user.plan];
    if (user.workspace.brands.filter((b) => !b.deleted).length >= quota.brandLimit) {
      reply.code(403);
      return { error: `Brand limit (${quota.brandLimit}) reached on ${quota.label} plan.` };
    }
    const blogId = await repo.allocateBlogId();
    const created: Brand = createBrandRecord({
      blogId,
      userId: user.userId,
      name,
      timezone: body.timezone || 'Asia/Jakarta',
      currency: 'IDR'
    });
    user.workspace.brands.push(created);
    await repo.saveUser(user);
    return created;
  });

  app.delete('/api/admin/delete-profile', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = Number(q.blogId);
    const activeBrands = user.workspace.brands.filter((b) => !b.deleted);
    if (activeBrands.length <= 1) {
      reply.code(400);
      return { error: 'At least one active brand must remain in your workspace.' };
    }
    const brand = activeBrands.find((b) => b.blogId === blogId);
    if (!brand) {
      reply.code(404);
      return { error: 'Profile not found.' };
    }
    brand.deleted = true;
    await repo.saveUser(user);
    return { ok: true, blogId };
  });

  app.post('/api/admin/update-label-blog', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { blogId?: number; label?: string };
    const brand = user.workspace.brands.find((b) => b.blogId === Number(body.blogId) && !b.deleted);
    if (!brand || !body.label?.trim()) {
      reply.code(400);
      return { error: 'Valid blogId and label required.' };
    }
    brand.name = body.label.trim();
    await repo.saveUser(user);
    return { ok: true, blogId: brand.blogId, name: brand.name };
  });

  app.get('/api/admin/max-profiles', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return {
      maxProfiles: PLAN_QUOTAS[user.plan].brandLimit,
      usedProfiles: user.workspace.brands.filter((b) => !b.deleted).length
    };
  });

  app.get('/api/profile/subscription', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return {
      plan: user.plan,
      status: user.status,
      trialActive: Boolean(user.workspace.user.trialActive),
      trialEndsAt: user.workspace.user.trialEndsAt ?? null,
      trialDaysRemaining: user.workspace.user.trialDaysRemaining ?? 0,
      validUntil: user.workspace.user.validUntil,
      brandLimit: PLAN_QUOTAS[user.plan].brandLimit
    };
  });

  app.get('/api/profile/lastsyncs', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    const brand = user.workspace.brands.find((b) => b.blogId === blogId);
    const map: Record<string, string | null> = {};
    if (brand) {
      for (const conn of Object.values(brand.connections)) {
        if (conn.connected) map[conn.network] = conn.lastSync;
      }
    }
    return map;
  });

  app.get('/api/profile/timezone', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    const brand = user.workspace.brands.find((b) => b.blogId === blogId);
    return { timezone: brand?.timezone || 'Asia/Jakarta' };
  });

  app.post('/api/profile/timezone', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { blogId?: number; timezone?: string };
    const blogId = resolveBlogId(user.workspace, body.blogId);
    const brand = user.workspace.brands.find((b) => b.blogId === blogId);
    if (!brand || !body.timezone) {
      reply.code(400);
      return { error: 'Invalid brand or timezone.' };
    }
    brand.timezone = body.timezone;
    await repo.saveUser(user);
    return { timezone: brand.timezone };
  });

  app.get('/api/user/settings', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      plan: user.plan,
      totpEnabled: user.totpEnabled,
      emailVerified: user.emailVerified,
      role: user.role
    };
  });

  // ==========================================
  // 2. Real-Time Web Telemetry, SSE Stream & Competitors
  // ==========================================
  app.get('/api/v2/evolution/realtime', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    const brand = user.workspace.brands.find((b) => b.blogId === blogId);
    const webConnected = Boolean(brand?.connections.web?.connected);
    const overview = await computeRealtimeAnalytics(repo, blogId, webConnected);
    return {
      data: {
        ...overview,
        trackingKey: brand?.trackingKey || '',
        trackerUrl: `${getRequestOrigin(req)}/tracker.js`
      }
    };
  });

  app.get('/api/v2/evolution/realtime/stream', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    const brand = user.workspace.brands.find((b) => b.blogId === blogId);
    const webConnected = Boolean(brand?.connections.web?.connected);
    const snapshot = await computeRealtimeAnalytics(repo, blogId, webConnected);

    reply.header('Content-Type', 'text/event-stream; charset=utf-8');
    reply.header('Cache-Control', 'no-cache, no-transform');
    reply.header('Connection', 'keep-alive');
    return `retry: 5000\ndata: ${JSON.stringify(snapshot)}\n\n`;
  });

  app.get('/api/v2/evolution/competitors', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string; network?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    let list = user.workspace.competitors.filter((c) => c.blogId === blogId);
    if (q.network && q.network !== 'ALL') {
      list = list.filter((c) => c.network === q.network);
    }
    return { data: list };
  });

  app.post('/api/v2/evolution/competitors', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as {
      blogId?: number;
      network?: NetworkKey;
      handle?: string;
      name?: string;
      followers?: number;
      postsCount?: number;
      likesPerPost?: number;
      engagementRate?: number;
    };
    if (!body.handle?.trim()) {
      reply.code(400);
      return { error: 'Competitor handle is required.' };
    }
    const handle = body.handle.trim().startsWith('@') ? body.handle.trim() : `@${body.handle.trim()}`;
    const item: CompetitorProfile = {
      id: randomToken('comp', 4),
      blogId: resolveBlogId(user.workspace, body.blogId),
      network: body.network || 'instagram',
      handle,
      name: body.name?.trim() || handle,
      followers: Math.max(0, Number(body.followers) || 0),
      postsCount: Math.max(0, Number(body.postsCount) || 0),
      likesPerPost: Math.max(0, Number(body.likesPerPost) || 0),
      engagementRate: Math.max(0, Number(body.engagementRate) || 0)
    };
    user.workspace.competitors.unshift(item);
    await repo.saveUser(user);
    return { data: item };
  });

  app.delete('/api/v2/evolution/competitors/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const idx = user.workspace.competitors.findIndex((c) => c.id === id);
    if (idx === -1) {
      reply.code(404);
      return { error: 'Competitor not found.' };
    }
    user.workspace.competitors.splice(idx, 1);
    await repo.saveUser(user);
    return { ok: true };
  });

  // ==========================================
  // 3. Media Upload & Serving (Cloudflare R2 + Fallback)
  // ==========================================
  app.post('/api/v2/media/upload', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as {
      blogId?: number;
      filename?: string;
      mimeType?: string;
      dataBase64?: string;
    };
    if (!body.dataBase64 || !body.mimeType) {
      reply.code(400);
      return { error: 'mimeType and dataBase64 are required.' };
    }
    const blogId = resolveBlogId(user.workspace, body.blogId);
    const uploaded = await uploadMediaObject({
      repo,
      env: req.env,
      userId: user.userId,
      blogId,
      filename: body.filename || 'media',
      mimeType: body.mimeType,
      dataBase64: body.dataBase64,
      origin: getRequestOrigin(req)
    });
    if ('error' in uploaded) {
      reply.code(400);
      return { error: uploaded.error };
    }
    return { data: uploaded };
  });

  app.get('/api/v2/media', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    const origin = getRequestOrigin(req);
    const items = await repo.listMediaAssets(blogId);
    return {
      data: items.map((m) => ({
        ...m,
        url: `${origin}/api/v2/media/${m.id}`
      }))
    };
  });

  app.get('/api/v2/media/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const payload = await readMediaObject({ repo, env: req.env, id });
    if (!payload) {
      reply.code(404);
      return { error: 'Media asset not found.' };
    }
    reply.header('Content-Type', payload.contentType);
    reply.header('Cache-Control', payload.cacheControl);
    return payload;
  });

  // ==========================================
  // 4. OAuth2 Social Integrations, Webhooks & Scheduler Cron Trigger
  // ==========================================
  app.get('/api/v2/oauth/providers', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: listOAuthProviderStatuses(req.env) };
  });

  app.get('/api/v2/oauth/:network/authorize', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { network } = req.params as { network: NetworkKey };
    const q = (req.query ?? {}) as { blogId?: string; redirect?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);

    const res = await buildOAuthAuthorizeUrl({
      repo,
      env: req.env,
      userId: user.userId,
      blogId,
      network,
      origin: getRequestOrigin(req)
    });
    if ('error' in res) {
      reply.code(400);
      return { error: res.error };
    }
    if (q.redirect === '1') {
      return { __redirectUrl: res.authorizeUrl } satisfies RedirectHttpPayload;
    }
    return { data: { authorizeUrl: res.authorizeUrl } };
  });

  app.get('/api/v2/oauth/:network/callback', async (req, reply) => {
    const { network } = req.params as { network: NetworkKey };
    const q = (req.query ?? {}) as { code?: string; state?: string; error?: string };
    const origin = getRequestOrigin(req);
    if (q.error || !q.code || !q.state) {
      return {
        __redirectUrl: `${origin}/brands/connections?oauth=error&reason=${encodeURIComponent(q.error || 'cancelled')}`
      } satisfies RedirectHttpPayload;
    }
    const res = await exchangeOAuthCallback({
      repo,
      env: req.env,
      network,
      code: q.code,
      state: q.state
    });
    if ('error' in res) {
      reply.code(400);
      return { error: res.error };
    }
    return { __redirectUrl: res.redirectUrl } satisfies RedirectHttpPayload;
  });

  // Meta / Social Webhook Verification & Event Ingestion
  app.get('/api/v2/webhooks/:network', async (req, reply) => {
    const q = (req.query ?? {}) as Record<string, string | undefined>;
    const mode = q['hub.mode'];
    const token = q['hub.verify_token'];
    const challenge = q['hub.challenge'];
    const expected = req.env?.META_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && challenge && (!expected || token === expected)) {
      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return challenge;
    }
    reply.code(403);
    return { error: 'Webhook verification failed.' };
  });

  app.post('/api/v2/webhooks/:network', async (req, reply) => {
    const { network } = req.params as { network: NetworkKey };
    const rawBody = req.rawBody || JSON.stringify(req.body ?? {});
    const sigHeader = req.headers?.['x-hub-signature-256'];
    const valid = await verifyWebhookSignature(req.env?.META_APP_SECRET, rawBody, sigHeader);
    if (!valid) {
      reply.code(401);
      return { error: 'Invalid webhook signature.' };
    }

    const body = (req.body ?? {}) as {
      blogId?: number;
      trackingKey?: string;
      channelType?: 'DM' | 'COMMENT' | 'REVIEW';
      contactName?: string;
      contactHandle?: string;
      text?: string;
    };

    let ownerRow = body.blogId ? await repo.getBrandOwner(Number(body.blogId)) : null;
    if (!ownerRow && body.trackingKey) {
      ownerRow = await repo.getBrandByTrackingKey(body.trackingKey);
    }
    if (!ownerRow) {
      return { ok: true, note: 'Event acknowledged (no matching brand).' };
    }

    const user = await repo.getUserById(ownerRow.userId);
    if (!user) return { ok: true };

    const text = (body.text || '').trim();
    if (!text) return { ok: true };

    const nowIso = new Date().toISOString();
    const contactHandle = body.contactHandle?.trim() || '@visitor';
    const contactName = body.contactName?.trim() || contactHandle;
    const channelType = body.channelType || 'COMMENT';

    let thread = user.workspace.inboxThreads.find(
      (t) =>
        t.blogId === ownerRow!.blogId &&
        t.network === network &&
        t.contactHandle === contactHandle
    );

    if (!thread) {
      thread = {
        id: randomToken('thr', 4),
        blogId: ownerRow.blogId,
        network,
        channelType,
        contactName,
        contactHandle,
        status: 'UNREAD',
        updatedAt: nowIso,
        messages: []
      };
      user.workspace.inboxThreads.unshift(thread);
    }

    thread.messages.push({
      id: randomToken('msg', 4),
      sender: 'contact',
      authorName: contactName,
      text,
      sentAt: nowIso
    });
    thread.status = 'UNREAD';
    thread.updatedAt = nowIso;

    // Trigger active Comment-to-DM Flows automatically
    let triggeredFlows = 0;
    if (channelType === 'COMMENT') {
      const activeFlows = user.workspace.flows.filter(
        (f) => f.blogId === ownerRow!.blogId && f.network === network && f.status === 'ACTIVE'
      );
      for (const fl of activeFlows) {
        const matches =
          fl.commentTrigger === 'all' ||
          fl.keywords.some((kw) => text.toUpperCase().includes(kw.trim().toUpperCase()));
        if (matches) {
          triggeredFlows += 1;
          fl.executionsCount += 1;
          fl.executions.unshift({
            id: randomToken('fex', 4),
            triggeredBy: `${contactHandle}: "${text.slice(0, 60)}"`,
            actionTaken: `Sent DM "${fl.dmText.slice(0, 50)}" (${fl.buttonUrl})`,
            status: 'SUCCESS',
            timestamp: nowIso
          });
          fl.executions = fl.executions.slice(0, 50);

          thread.messages.push({
            id: randomToken('msg', 4),
            sender: 'operator',
            authorName: 'Automation Flow',
            text: `${fl.dmText} ${fl.buttonUrl}`.trim(),
            sentAt: nowIso
          });
        }
      }
    }

    await repo.saveUser(user);
    return { ok: true, threadId: thread.id, triggeredFlows };
  });

  app.post('/api/v2/planner/run-scheduler', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const summary = await runScheduledJobs(repo, req.env);
    return { data: summary };
  });

  // ==========================================
  // 5. Planner Library, Deleted Posts, Flows, AI & Tasks
  // ==========================================
  app.get('/api/v2/planner/library', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.libraryPosts.filter((l) => l.blogId === blogId) };
  });

  app.post('/api/v2/planner/library', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<LibraryPostTemplate>;
    if (!body.title?.trim() || !body.text?.trim()) {
      reply.code(400);
      return { error: 'Library template title and caption text are required.' };
    }
    const item: LibraryPostTemplate = {
      id: randomToken('lib', 4),
      blogId: resolveBlogId(user.workspace, body.blogId),
      title: body.title.trim(),
      text: body.text.trim(),
      networks: body.networks?.length ? body.networks : ['instagram'],
      tags: body.tags?.length ? body.tags : ['Saved'],
      createdAt: new Date().toISOString()
    };
    user.workspace.libraryPosts.unshift(item);
    await repo.saveUser(user);
    return { data: item };
  });

  app.delete('/api/v2/planner/library/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    user.workspace.libraryPosts = user.workspace.libraryPosts.filter((l) => l.id !== id);
    await repo.saveUser(user);
    return { ok: true };
  });

  app.get('/api/v2/planner/deleted', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.deletedPosts.filter((p) => p.blogId === blogId) };
  });

  app.post('/api/v2/planner/deleted/:id/restore', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const idx = user.workspace.deletedPosts.findIndex((p) => p.id === id);
    if (idx === -1) {
      reply.code(404);
      return { error: 'Deleted post not found.' };
    }
    const [restored] = user.workspace.deletedPosts.splice(idx, 1);
    const { deletedAt: _ignored, ...activePost } = restored;
    activePost.status = 'SCHEDULED';
    user.workspace.plannerPosts.push(activePost);
    await repo.saveUser(user);
    return { data: activePost };
  });

  app.get('/api/v2/flows', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.flows.filter((f) => f.blogId === blogId) };
  });

  app.get('/api/v2/flows/templates', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.flowTemplates };
  });

  app.post('/api/v2/flows', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<AutomationFlow>;
    if (!body.name?.trim() || !body.dmText?.trim()) {
      reply.code(400);
      return { error: 'Flow name and DM message are required.' };
    }
    const origin = getRequestOrigin(req);
    const blogId = resolveBlogId(user.workspace, body.blogId);
    const firstLink = user.workspace.smartLinks.find((s) => s.blogId === blogId);
    const defaultUrl = firstLink ? `${origin}/bio/${firstLink.slug}` : origin;

    const flow: AutomationFlow = {
      id: randomToken('flw', 4),
      blogId,
      name: body.name.trim(),
      network: body.network || 'instagram',
      commentTrigger: body.commentTrigger || 'withKeywords',
      keywords: body.keywords?.length ? body.keywords : ['INFO'],
      publicReplies: body.publicReplies?.length ? body.publicReplies : ['Check your DM.'],
      dmText: body.dmText.trim(),
      followUpText: body.followUpText?.trim() || '',
      buttonText: body.buttonText?.trim() || 'Open link',
      buttonUrl: body.buttonUrl?.trim() || defaultUrl,
      status: 'ACTIVE',
      executionsCount: 0,
      executions: []
    };
    user.workspace.flows.unshift(flow);
    await repo.saveUser(user);
    return { data: flow };
  });

  app.patch('/api/v2/flows/:id/status', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' };
    const flow = user.workspace.flows.find((f) => f.id === id);
    if (!flow) {
      reply.code(404);
      return { error: 'Flow not found.' };
    }
    flow.status = body.status ?? (flow.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    await repo.saveUser(user);
    return { data: flow };
  });

  app.get('/api/v2/flows/:id/executions/timeline', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const flow = user.workspace.flows.find((f) => f.id === id);
    if (!flow) {
      reply.code(404);
      return { error: 'Flow not found.' };
    }
    return { data: flow.executions };
  });

  app.get('/api/v2/integrations/ai/languages', async () => ({
    data: ['id', 'en', 'es', 'fr', 'de']
  }));

  app.post('/api/v2/integrations/ai/natural-language-scheduling', async (req, reply) => {
    const body = (req.body ?? {}) as {
      blogId?: number;
      prompt?: string;
      tone?: string;
      language?: string;
      network?: NetworkKey;
    };
    if (!body.prompt?.trim()) {
      reply.code(400);
      return { error: 'Prompt is required to generate post copy.' };
    }

    const authUser = await resolveAuthenticatedUser(req, repo);
    const blogId = authUser ? resolveBlogId(authUser.workspace, body.blogId) : 0;
    const brand = authUser?.workspace.brands.find((b) => b.blogId === blogId);

    const draft = await generateSocialPostDraft(req.env, {
      prompt: body.prompt.trim(),
      network: body.network || 'instagram',
      language: body.language || 'id',
      tone: body.tone || brand?.aiConfig.tone || 'Clear and direct',
      targetAudience: brand?.aiConfig.targetAudience || '',
      brandVoice: brand?.aiConfig.brandVoice || '',
      bannedWords: brand?.aiConfig.bannedWords || ''
    });

    return { data: draft };
  });

  app.get('/api/v2/tasks', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string; filter?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    let list = user.workspace.reviewTasks.filter((t) => t.blogId === blogId);
    if (q.filter === 'received' || q.filter === 'sent') {
      list = list.filter((t) => t.direction === q.filter);
    }
    return { data: list };
  });

  app.post('/api/v2/tasks', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<ReviewTask>;
    if (!body.postText?.trim()) {
      reply.code(400);
      return { error: 'Post copy is required to create an approval task.' };
    }
    const defaultScheduled = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
    const task: ReviewTask = {
      id: randomToken('tsk', 4),
      blogId: resolveBlogId(user.workspace, body.blogId),
      postId: body.postId || randomToken('pln', 4),
      postText: body.postText.trim(),
      network: body.network || 'instagram',
      scheduledAt: body.scheduledAt || defaultScheduled,
      requesterEmail: user.email,
      assigneeEmail: body.assigneeEmail?.trim() || user.email,
      direction: 'sent',
      status: 'PENDING',
      reviewerNote: '',
      createdAt: new Date().toISOString()
    };
    user.workspace.reviewTasks.unshift(task);
    await repo.saveUser(user);

    if (task.assigneeEmail && task.assigneeEmail !== user.email) {
      const reviewUrl = `${getRequestOrigin(req)}/my-tasks`;
      await sendTransactionalEmail(req.env, {
        to: task.assigneeEmail,
        subject: `Post approval requested by ${user.name}`,
        text: `${user.name} requested review for a ${task.network} post scheduled at ${task.scheduledAt}:\n\n"${task.postText}"\n\nReview at: ${reviewUrl}`,
        html: `<p><strong>${user.name}</strong> requested approval for a ${task.network} post:</p><blockquote>${task.postText}</blockquote><p><a href="${reviewUrl}">Open Tasks & Approvals</a></p>`
      });
    }

    return { data: task };
  });

  app.patch('/api/v2/tasks/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; reviewerNote?: string };
    const task = user.workspace.reviewTasks.find((t) => t.id === id);
    if (!task || !body.status) {
      reply.code(404);
      return { error: 'Review task not found or status invalid.' };
    }
    task.status = body.status;
    if (typeof body.reviewerNote === 'string') task.reviewerNote = body.reviewerNote.trim();
    const post = user.workspace.plannerPosts.find((p) => p.id === task.postId);
    if (post && body.status === 'APPROVED') {
      post.status = 'SCHEDULED';
    }
    await repo.saveUser(user);
    return { data: task };
  });

  // ==========================================
  // 6. Advertising Extra Tabs
  // ==========================================
  app.get('/api/v2/advertising/adgroups', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.adGroups.filter((g) => g.blogId === blogId) };
  });

  app.post('/api/v2/advertising/adgroups', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<AdGroup>;
    if (!body.name?.trim()) {
      reply.code(400);
      return { error: 'Ad group name is required.' };
    }
    const blogId = resolveBlogId(user.workspace, body.blogId);
    const firstCamp = user.workspace.adCampaigns.find((c) => c.blogId === blogId);
    const item: AdGroup = {
      id: randomToken('ag', 4),
      blogId,
      campaignId: body.campaignId || firstCamp?.id || 'cmp-1',
      campaignName: body.campaignName || firstCamp?.name || 'Primary Campaign',
      platform: body.platform || 'metaAds',
      name: body.name.trim(),
      bidStrategy: body.bidStrategy || 'Lowest Cost Cap',
      dailyBudget: Number(body.dailyBudget) || 20,
      spend: 0,
      clicks: 0,
      cpa: 0,
      status: 'ACTIVE'
    };
    user.workspace.adGroups.unshift(item);
    await repo.saveUser(user);
    return { data: item };
  });

  app.patch('/api/v2/advertising/adgroups/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' };
    const item = user.workspace.adGroups.find((g) => g.id === id);
    if (!item) {
      reply.code(404);
      return { error: 'Ad group not found.' };
    }
    item.status = body.status ?? (item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    await repo.saveUser(user);
    return { data: item };
  });

  app.get('/api/v2/advertising/ads', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.adCreatives.filter((a) => a.blogId === blogId) };
  });

  app.patch('/api/v2/advertising/ads/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const ad = user.workspace.adCreatives.find((a) => a.id === id);
    if (!ad) {
      reply.code(404);
      return { error: 'Ad creative not found.' };
    }
    ad.status = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await repo.saveUser(user);
    return { data: ad };
  });

  app.get('/api/v2/advertising/keywords', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.adKeywords.filter((k) => k.blogId === blogId) };
  });

  app.post('/api/v2/advertising/keywords', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<AdKeyword>;
    if (!body.keyword?.trim()) {
      reply.code(400);
      return { error: 'Keyword text is required.' };
    }
    const kw: AdKeyword = {
      id: randomToken('kw', 4),
      blogId: resolveBlogId(user.workspace, body.blogId),
      keyword: body.keyword.trim(),
      matchType: body.matchType || 'PHRASE',
      cpc: Number(body.cpc) || 0.35,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      qualityScore: 8
    };
    user.workspace.adKeywords.unshift(kw);
    await repo.saveUser(user);
    return { data: kw };
  });

  app.get('/api/v2/advertising/recommendations', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.adRecommendations.filter((r) => r.blogId === blogId) };
  });

  app.post('/api/v2/advertising/recommendations/:id/apply', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const rec = user.workspace.adRecommendations.find((r) => r.id === id);
    if (!rec) {
      reply.code(404);
      return { error: 'Recommendation not found.' };
    }
    rec.applied = true;
    await repo.saveUser(user);
    return { data: rec };
  });

  // ==========================================
  // 7. Reporting Studio & Campaigns Dashboard (Global Public Share Support)
  // ==========================================
  app.get('/api/v2/reporting/studio/plan-limits', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: { maxStudioReports: 50, usedStudioReports: user.workspace.studioReports.length } };
  });

  app.get('/api/v2/reporting/studio/reports', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.studioReports.filter((r) => r.blogId === blogId) };
  });

  app.get('/api/v2/reporting/studio/reports/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    // First check authenticated user
    const authUser = await resolveAuthenticatedUser(req, repo);
    if (authUser) {
      const ownReport = authUser.workspace.studioReports.find((r) => r.id === id);
      if (ownReport) return { data: ownReport };
    }
    // Check global public Studio index
    const pubRef = await repo.getPublicStudioReportOwner(id);
    if (pubRef) {
      const owner = await repo.getUserById(pubRef.userId);
      const report = owner?.workspace.studioReports.find((r) => r.id === id && r.publicEnabled);
      if (report) return { data: report };
    }
    reply.code(404);
    return { error: 'Studio report not found or not publicly shared.' };
  });

  app.post('/api/v2/reporting/studio/reports', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { blogId?: number; title?: string };
    if (!body.title?.trim()) {
      reply.code(400);
      return { error: 'Studio report title is required.' };
    }
    const report: StudioReport = {
      id: randomToken('stu', 5),
      blogId: resolveBlogId(user.workspace, body.blogId),
      title: body.title.trim(),
      updatedAt: new Date().toISOString(),
      publicEnabled: true,
      blocks: [{ id: `blk-${Date.now()}`, type: 'KPI_GRID', title: 'Core Metrics Overview' }]
    };
    user.workspace.studioReports.unshift(report);
    await repo.saveUser(user);
    return { data: report };
  });

  app.put('/api/v2/reporting/studio/versions/:id/blocks', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { blocks?: StudioBlock[]; title?: string; publicEnabled?: boolean };
    const report = user.workspace.studioReports.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Studio report not found.' };
    }
    if (Array.isArray(body.blocks)) report.blocks = body.blocks;
    if (typeof body.title === 'string' && body.title.trim()) report.title = body.title.trim();
    if (typeof body.publicEnabled === 'boolean') report.publicEnabled = body.publicEnabled;
    report.updatedAt = new Date().toISOString();
    await repo.saveUser(user);
    return { data: report };
  });

  app.post('/api/v2/reporting/studio/reports/:id/anonymous-link', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const report = user.workspace.studioReports.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Studio report not found.' };
    }
    report.publicEnabled = true;
    await repo.saveUser(user);
    return { data: { publicUrl: `${getRequestOrigin(req)}/reporting/studio/public/${report.id}` } };
  });

  app.get('/api/v2/reporting/campaigns-dashboard', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveBlogId(user.workspace, q.blogId);
    return { data: user.workspace.campaignsDashboard.filter((c) => c.blogId === blogId) };
  });

  app.post('/api/v2/reporting/campaigns-dashboard', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<CampaignDashboardItem>;
    if (!body.name?.trim() || !body.tag?.trim()) {
      reply.code(400);
      return { error: 'Campaign name and tag are required.' };
    }
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const blogId = resolveBlogId(user.workspace, body.blogId);
    const cleanTag = body.tag.trim();
    const taggedPosts = user.workspace.plannerPosts.filter(
      (p) => p.blogId === blogId && p.text.toLowerCase().includes(cleanTag.toLowerCase())
    ).length;

    const item: CampaignDashboardItem = {
      id: randomToken('cd', 4),
      blogId,
      name: body.name.trim(),
      tag: cleanTag,
      startDate: body.startDate || today,
      endDate: body.endDate || nextMonth,
      postsCount: taggedPosts,
      impressions: 0,
      clicks: 0,
      archived: false
    };
    user.workspace.campaignsDashboard.unshift(item);
    await repo.saveUser(user);
    return { data: item };
  });

  app.patch('/api/v2/reporting/campaigns-dashboard/:id/archive', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const item = user.workspace.campaignsDashboard.find((c) => c.id === id);
    if (!item) {
      reply.code(404);
      return { error: 'Campaign tracker not found.' };
    }
    item.archived = !item.archived;
    await repo.saveUser(user);
    return { data: item };
  });

  // ==========================================
  // 8. Brand Details 6-Tab Configuration
  // ==========================================
  app.get('/api/v2/settings/catalogs/timezones', async () => ({
    data: [
      'Asia/Jakarta',
      'Asia/Makassar',
      'Asia/Jayapura',
      'Asia/Singapore',
      'UTC',
      'Europe/London',
      'Europe/Madrid',
      'America/New_York',
      'America/Los_Angeles'
    ]
  }));

  app.get('/api/v2/settings/brands/:blogId/details', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { blogId } = req.params as { blogId: string };
    const brand = user.workspace.brands.find((b) => b.blogId === Number(blogId) && !b.deleted);
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    return { data: brand };
  });

  app.put('/api/v2/settings/brands/:blogId/details', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { blogId } = req.params as { blogId: string };
    const body = (req.body ?? {}) as Partial<Brand>;
    const brand = user.workspace.brands.find((b) => b.blogId === Number(blogId) && !b.deleted);
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    if (body.whiteLabel?.enabled && !PLAN_QUOTAS[user.plan].allowWhiteLabel) {
      reply.code(403);
      return { error: 'White Label report branding requires Enterprise Custom plan.' };
    }
    if (typeof body.name === 'string' && body.name.trim()) brand.name = body.name.trim();
    if (typeof body.timezone === 'string') brand.timezone = body.timezone;
    if (typeof body.currency === 'string') brand.currency = body.currency;
    if (typeof body.websiteDomain === 'string') brand.websiteDomain = body.websiteDomain.trim();
    if (body.engagementRatioMode === 'REACH' || body.engagementRatioMode === 'FOLLOWERS') {
      brand.engagementRatioMode = body.engagementRatioMode;
    }
    if (Array.isArray(body.tags)) brand.tags = body.tags;
    if (body.whiteLabel) brand.whiteLabel = { ...brand.whiteLabel, ...body.whiteLabel };
    if (body.aiConfig) brand.aiConfig = { ...brand.aiConfig, ...body.aiConfig };
    if (body.integrations) brand.integrations = { ...brand.integrations, ...body.integrations };
    await repo.saveUser(user);
    return { data: brand };
  });

  // ==========================================
  // 9. API Tokens, RFC 6238 TOTP 2FA, Team, Billing & Admin Backoffice
  // ==========================================
  app.get('/api/v2/settings/users/tokens/current', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return {
      data: {
        token: user.apiToken,
        totpEnabled: user.totpEnabled,
        approvedMcpScopes: user.workspace.user.approvedMcpScopes
      }
    };
  });

  app.post('/api/v2/settings/users/tokens/regenerate', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { confirmWord?: string };
    if (body.confirmWord !== 'REGENERATE') {
      reply.code(400);
      return { error: 'Type REGENERATE in uppercase to confirm token rotation.' };
    }
    user.apiToken = `bm_live_${user.userId}_${randomToken('', 12)}`;
    await repo.saveUser(user);
    return { data: { token: user.apiToken } };
  });

  app.post('/api/v2/settings/users/totp/setup', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const secret = user.totpSecret || generateTotpSecret();
    user.totpSecret = secret;
    await repo.saveUser(user);
    return {
      data: {
        secret,
        otpauthUri: buildTotpUri(user.email, secret)
      }
    };
  });

  app.post('/api/v2/settings/users/totp/tokens', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { code?: string; disable?: boolean };

    if (user.totpEnabled || body.disable) {
      user.totpEnabled = false;
      await repo.saveUser(user);
      return { data: { totpEnabled: false } };
    }

    if (!user.totpSecret) {
      user.totpSecret = generateTotpSecret();
    }
    if (!body.code) {
      reply.code(400);
      return {
        error: 'Enter the 6-digit verification code from your authenticator app to enable 2FA.',
        secret: user.totpSecret,
        otpauthUri: buildTotpUri(user.email, user.totpSecret)
      };
    }

    const ok = await verifyTotpCode(user.totpSecret, body.code);
    if (!ok) {
      reply.code(400);
      return { error: 'Invalid 6-digit TOTP verification code. Check your device clock and try again.' };
    }

    user.totpEnabled = true;
    await repo.saveUser(user);
    return { data: { totpEnabled: true } };
  });

  // Billing & Subscriptions
  app.get('/api/v2/billing/plans', async () => ({
    data: Object.values(PLAN_QUOTAS),
    providers: {
      midtrans: true,
      stripe: true
    }
  }));

  app.get('/api/v2/billing/orders', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: await repo.listUserPaymentOrders(user.userId) };
  });

  app.post('/api/v2/billing/checkout', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as {
      plan?: UserProfile['plan'];
      provider?: 'midtrans' | 'stripe';
      couponCode?: string;
    };
    if (!body.plan || !PLAN_QUOTAS[body.plan]) {
      reply.code(400);
      return { error: 'Valid target subscription plan is required.' };
    }

    const result = await createSubscriptionCheckout({
      repo,
      env: req.env,
      user,
      targetPlan: body.plan,
      provider: body.provider || 'midtrans',
      couponCode: body.couponCode,
      origin: getRequestOrigin(req)
    });

    if ('error' in result) {
      reply.code(400);
      return { error: result.error };
    }
    return { data: result };
  });

  app.post('/api/v2/webhooks/billing/:provider', async (req, reply) => {
    const { provider } = req.params as { provider: string };
    if (provider === 'midtrans') {
      const res = await handleMidtransWebhook({
        repo,
        env: req.env,
        payload: (req.body ?? {}) as Record<string, unknown>
      });
      if (!res.ok) {
        reply.code(400);
        return { error: res.error };
      }
      return { ok: true };
    }
    if (provider === 'stripe') {
      const rawBody = req.rawBody || JSON.stringify(req.body ?? {});
      const res = await handleStripeWebhook({
        repo,
        env: req.env,
        rawBody,
        signatureHeader: req.headers?.['stripe-signature']
      });
      if (!res.ok) {
        reply.code(400);
        return { error: res.error };
      }
      return { ok: true };
    }
    reply.code(404);
    return { error: 'Unknown billing provider.' };
  });

  // Team & Organization
  app.get('/api/v2/user-management', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.teamMembers };
  });

  app.post('/api/v2/user-management/invite', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<TeamMember>;
    if (!body.email?.includes('@') || !body.name?.trim()) {
      reply.code(400);
      return { error: 'Name and valid email are required.' };
    }
    const defaultBlogId = resolveBlogId(user.workspace, undefined);
    const assignedBrands = body.assignedBrands?.length ? body.assignedBrands : [defaultBlogId];
    const member: TeamMember = {
      id: randomToken('tm', 4),
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      role: body.role || 'EDITOR',
      kind: body.kind || 'team',
      assignedBrands,
      status: 'INVITED'
    };
    user.workspace.teamMembers.push(member);
    await repo.saveUser(user);

    const inviteToken = randomToken('inv', 20);
    await repo.createInvitation({
      token: inviteToken,
      ownerUserId: user.userId,
      email: member.email,
      name: member.name,
      role: member.role,
      kind: member.kind,
      assignedBrands,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    });

    const acceptUrl = `${getRequestOrigin(req)}/activate-collaborator?token=${encodeURIComponent(inviteToken)}`;
    const delivery = await sendTransactionalEmail(req.env, {
      to: member.email,
      subject: `${user.name} invited you to BeeloftMetric`,
      text: `You have been invited as ${member.role} to ${user.workspace.agencySettings.organizationName}.\nAccept your invitation:\n${acceptUrl}`,
      html: `<p><strong>${user.name}</strong> invited you as <strong>${member.role}</strong> on BeeloftMetric.</p><p><a href="${acceptUrl}">Accept invitation</a></p>`
    });

    return {
      data: member,
      inviteUrl: acceptUrl,
      emailDelivered: delivery.delivered,
      emailDetail: delivery.detail
    };
  });

  app.delete('/api/v2/user-management/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const target = user.workspace.teamMembers.find((m) => m.id === id);
    if (!target || target.role === 'OWNER') {
      reply.code(400);
      return { error: 'Cannot remove owner or missing member.' };
    }
    user.workspace.teamMembers = user.workspace.teamMembers.filter((m) => m.id !== id);
    await repo.saveUser(user);
    return { ok: true };
  });

  app.get('/api/v2/agency-CK/details', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.agencySettings };
  });

  app.put('/api/v2/agency-CK/:id/smtp-configuration', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<BeeloftDatabaseAgencyPatch>;
    user.workspace.agencySettings = { ...user.workspace.agencySettings, ...body };
    await repo.saveUser(user);
    return { data: user.workspace.agencySettings };
  });

  app.post('/api/v2/agency-CK/:id/test-mail', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { recipient?: string };
    const to = body.recipient?.trim() || user.email;
    const smtpHost = user.workspace.agencySettings.smtpHost;
    const customRelay = /^https?:\/\//i.test(smtpHost) ? smtpHost : undefined;

    const result = await sendTransactionalEmail(req.env, {
      to,
      senderEmail: user.workspace.agencySettings.senderEmail || undefined,
      customRelayUrl: customRelay,
      subject: `BeeloftMetric Test Email (${user.workspace.agencySettings.organizationName})`,
      text: `This is a live test email sent from BeeloftMetric for ${user.workspace.agencySettings.organizationName}.`,
      html: `<p>This is a live test email sent from <strong>BeeloftMetric</strong> for ${user.workspace.agencySettings.organizationName}.</p>`
    });

    user.workspace.agencySettings.lastTestStatus = `${result.delivered ? 'Delivered' : 'Not delivered'} (${result.provider}): ${result.detail}`;
    await repo.saveUser(user);
    return { data: { status: user.workspace.agencySettings.lastTestStatus, delivered: result.delivered } };
  });

  app.get('/api/v2/affiliation', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const origin = getRequestOrigin(req);
    user.workspace.affiliation.referralUrl = `${origin}/register?ref=${user.workspace.affiliation.referralCode}`;
    return { data: user.workspace.affiliation };
  });

  app.patch('/api/v2/affiliation/settings', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { payoutEmail?: string };
    if (!body.payoutEmail?.includes('@')) {
      reply.code(400);
      return { error: 'Valid payout email is required.' };
    }
    user.workspace.affiliation.payoutEmail = body.payoutEmail.trim();
    await repo.saveUser(user);
    return { data: user.workspace.affiliation };
  });

  // ==========================================
  // 10. Admin Backoffice (ROLE_ADMIN RBAC Enforced)
  // ==========================================
  app.get('/api/v2/backoffice/overview', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    if (user.role !== 'ADMIN') {
      reply.code(403);
      return { error: 'Administrator privileges required to access Backoffice.' };
    }

    const meta = await repo.getGlobalMeta();
    const usersList = await repo.listUsers();
    const nodeVer = (globalThis as { process?: { version?: string } }).process?.version;

    return {
      data: {
        usersList,
        deletedBrands: user.workspace.brands.filter((b) => b.deleted),
        coupons: meta.coupons,
        invoices: meta.invoices,
        featureFlags: meta.featureFlags,
        apiConsumption: {
          callsToday: meta.apiCallsToday,
          quotaPerDay: 100000
        },
        buildInfo: {
          version: 'beeloft-2.0.0-production',
          referenceBuild: '375438893013',
          runtime: req.env?.DB
            ? 'Cloudflare Workers + D1 Edge SQLite'
            : nodeVer
              ? `Node ${nodeVer} (${repo.driver})`
              : `Edge (${repo.driver})`
        }
      }
    };
  });

  app.post('/api/v2/backoffice/coupons', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    if (user.role !== 'ADMIN') {
      reply.code(403);
      return { error: 'Administrator privileges required.' };
    }

    const body = (req.body ?? {}) as { code?: string; discountPct?: number; planTarget?: string };
    if (!body.code?.trim()) {
      reply.code(400);
      return { error: 'Coupon code is required.' };
    }
    const meta = await repo.getGlobalMeta();
    const coupon = {
      id: randomToken('cpn', 4),
      code: body.code.trim().toUpperCase(),
      discountPct: Math.min(100, Math.max(5, Number(body.discountPct) || 20)),
      planTarget: body.planTarget || 'STARTER',
      redemptions: 0,
      maxRedemptions: 100,
      active: true
    };
    meta.coupons.unshift(coupon);
    await repo.saveGlobalMeta(meta);
    return { data: coupon };
  });

  app.patch('/api/v2/backoffice/feature-flags/:key', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    if (user.role !== 'ADMIN') {
      reply.code(403);
      return { error: 'Administrator privileges required.' };
    }
    const { key } = req.params as { key: string };
    const meta = await repo.getGlobalMeta();
    meta.featureFlags[key] = !meta.featureFlags[key];
    await repo.saveGlobalMeta(meta);
    return { data: meta.featureFlags };
  });

  app.post('/api/v2/backoffice/restore-brand/:blogId', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    if (user.role !== 'ADMIN') {
      reply.code(403);
      return { error: 'Administrator privileges required.' };
    }
    const { blogId } = req.params as { blogId: string };
    const brand = user.workspace.brands.find((b) => b.blogId === Number(blogId) && b.deleted);
    if (!brand) {
      reply.code(404);
      return { error: 'Deleted brand not found.' };
    }
    brand.deleted = false;
    await repo.saveUser(user);
    return { data: brand };
  });
}

type BeeloftDatabaseAgencyPatch = {
  organizationName: string;
  customDomain: string;
  defaultLocale: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  senderEmail: string;
};
