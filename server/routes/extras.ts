import { buildConnectionMap } from '../seed.js';
import type {
  AdGroup,
  AdKeyword,
  AutomationFlow,
  Brand,
  CampaignDashboardItem,
  CompetitorProfile,
  DataStore,
  LibraryPostTemplate,
  NetworkKey,
  ReviewTask,
  RouteRegistry,
  StudioBlock,
  StudioReport,
  TeamMember
} from '../types.js';

function parseBlogId(raw: unknown, fallback = 8137744): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function randomHex(bytes = 6): string {
  return globalThis.globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, bytes * 2);
}

export function registerExtraRoutes(app: RouteRegistry, store: DataStore): void {
  // ==========================================
  // 2.1 Legacy Compatibility (/api/admin/*, /api/profile/*, /api/user/*)
  // ==========================================
  app.get('/api/admin/simpleProfiles', async () => {
    const db = await store.get();
    return db.brands
      .filter((b) => !b.deleted)
      .map((b) => ({
        blogId: b.blogId,
        name: b.name,
        timezone: b.timezone,
        connectionsCount: Object.values(b.connections).filter((c) => c.connected).length
      }));
  });

  app.post('/api/admin/add-profile', async (req, reply) => {
    const db = await store.get();
    const body = (req.body ?? {}) as { name?: string; label?: string; timezone?: string };
    const name = (body.name || body.label || '').trim();
    if (!name) {
      reply.code(400);
      return { error: 'Profile name is required.' };
    }
    if (db.brands.filter((b) => !b.deleted).length >= db.user.brandLimit) {
      reply.code(403);
      return { error: 'Brand limit reached.' };
    }
    const maxId = db.brands.reduce((acc, b) => Math.max(acc, b.blogId), 8137744);
    const created: Brand = {
      blogId: maxId + 1,
      userId: db.user.userId,
      name,
      timezone: body.timezone || 'Asia/Jakarta',
      currency: 'USD',
      isSample: false,
      engagementRatioMode: 'REACH',
      tags: [],
      whiteLabel: { enabled: false, logoText: name, primaryColor: '#F5A623', footerNote: '' },
      aiConfig: { tone: 'Neutral informative', targetAudience: '', brandVoice: '', bannedWords: '' },
      integrations: {
        canva: false,
        googleDrive: false,
        slack: false,
        zapier: false,
        adobeExpress: false,
        lookerStudio: false
      },
      connections: buildConnectionMap({})
    };
    db.brands.push(created);
    await store.persist();
    return created;
  });

  app.delete('/api/admin/delete-profile', async (req, reply) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = Number(q.blogId);
    const db = await store.get();
    if (blogId === 8137744 || blogId === 8137743) {
      reply.code(400);
      return { error: 'Default demonstration profiles cannot be deleted.' };
    }
    const brand = db.brands.find((b) => b.blogId === blogId && !b.deleted);
    if (!brand) {
      reply.code(404);
      return { error: 'Profile not found.' };
    }
    brand.deleted = true;
    await store.persist();
    return { ok: true, blogId };
  });

  app.post('/api/admin/update-label-blog', async (req, reply) => {
    const body = (req.body ?? {}) as { blogId?: number; label?: string };
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === Number(body.blogId));
    if (!brand || !body.label?.trim()) {
      reply.code(400);
      return { error: 'Valid blogId and label required.' };
    }
    brand.name = body.label.trim();
    await store.persist();
    return { ok: true, blogId: brand.blogId, name: brand.name };
  });

  app.get('/api/admin/max-profiles', async () => {
    const db = await store.get();
    return {
      maxProfiles: db.user.brandLimit,
      usedProfiles: db.brands.filter((b) => !b.deleted).length
    };
  });

  app.get('/api/profile/subscription', async () => {
    const db = await store.get();
    return {
      plan: db.user.plan,
      status: db.user.status,
      validUntil: db.user.validUntil,
      brandLimit: db.user.brandLimit
    };
  });

  app.get('/api/profile/lastsyncs', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === parseBlogId(q.blogId));
    const map: Record<string, string | null> = {};
    if (brand) {
      for (const conn of Object.values(brand.connections)) {
        if (conn.connected) map[conn.network] = conn.lastSync;
      }
    }
    return map;
  });

  app.get('/api/profile/timezone', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === parseBlogId(q.blogId));
    return { timezone: brand?.timezone || 'Asia/Jakarta' };
  });

  app.post('/api/profile/timezone', async (req, reply) => {
    const body = (req.body ?? {}) as { blogId?: number; timezone?: string };
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === parseBlogId(body.blogId));
    if (!brand || !body.timezone) {
      reply.code(400);
      return { error: 'Invalid brand or timezone.' };
    }
    brand.timezone = body.timezone;
    await store.persist();
    return { timezone: brand.timezone };
  });

  app.get('/api/user/settings', async () => {
    const db = await store.get();
    return {
      userId: db.user.userId,
      name: db.user.name,
      email: db.user.email,
      plan: db.user.plan,
      totpEnabled: db.user.totpEnabled
    };
  });

  // ==========================================
  // 2.2 Evolution Real-Time & Competitors
  // ==========================================
  app.get('/api/v2/evolution/realtime', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === blogId);
    const webConnected = Boolean(brand?.connections.web?.connected);

    if (!webConnected) {
      return {
        data: {
          connected: false,
          activeVisitors: 0,
          pageViewsLast30m: 0,
          topActivePages: [],
          topReferrers: [],
          countries: []
        }
      };
    }

    const recentWeb = db.attributionEvents.filter((e) => e.path === '/' || e.path.startsWith('/bio')).length;
    return {
      data: {
        connected: true,
        isSample: brand?.isSample ?? false,
        activeVisitors: 18 + recentWeb,
        pageViewsLast30m: 142 + recentWeb,
        topActivePages: [
          { path: '/bio/beeloft-studio', visitors: 9 },
          { path: '/pricing', visitors: 5 },
          { path: '/checklist-q4', visitors: 4 }
        ],
        topReferrers: [
          { source: 'instagram.com', visitors: 8 },
          { source: 'tiktok.com', visitors: 6 },
          { source: 'Direct / None', visitors: 4 }
        ],
        countries: [
          { country: 'Indonesia', code: 'ID', visitors: 11 },
          { country: 'United States', code: 'US', visitors: 4 },
          { country: 'Spain', code: 'ES', visitors: 3 }
        ]
      }
    };
  });

  app.get('/api/v2/evolution/competitors', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string; network?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    let list = db.competitors.filter((c) => c.blogId === blogId);
    if (q.network && q.network !== 'ALL') {
      list = list.filter((c) => c.network === q.network);
    }
    return { data: list };
  });

  app.post('/api/v2/evolution/competitors', async (req, reply) => {
    const body = (req.body ?? {}) as {
      blogId?: number;
      network?: NetworkKey;
      handle?: string;
      name?: string;
    };
    if (!body.handle?.trim()) {
      reply.code(400);
      return { error: 'Competitor handle is required.' };
    }
    const db = await store.get();
    const handle = body.handle.trim().startsWith('@') ? body.handle.trim() : `@${body.handle.trim()}`;
    const item: CompetitorProfile = {
      id: `comp-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      network: body.network || 'instagram',
      handle,
      name: body.name?.trim() || handle,
      followers: 4200,
      postsCount: 12,
      likesPerPost: 185,
      engagementRate: 3.4
    };
    db.competitors.unshift(item);
    await store.persist();
    return { data: item };
  });

  app.delete('/api/v2/evolution/competitors/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const idx = db.competitors.findIndex((c) => c.id === id);
    if (idx === -1) {
      reply.code(404);
      return { error: 'Competitor not found.' };
    }
    db.competitors.splice(idx, 1);
    await store.persist();
    return { ok: true };
  });

  // ==========================================
  // 2.3 Planner Library, Deleted Posts, Flows, AI & Tasks
  // ==========================================
  app.get('/api/v2/planner/library', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.libraryPosts.filter((l) => l.blogId === blogId) };
  });

  app.post('/api/v2/planner/library', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<LibraryPostTemplate>;
    if (!body.title?.trim() || !body.text?.trim()) {
      reply.code(400);
      return { error: 'Library template title and caption text are required.' };
    }
    const db = await store.get();
    const item: LibraryPostTemplate = {
      id: `lib-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      title: body.title.trim(),
      text: body.text.trim(),
      networks: body.networks?.length ? body.networks : ['instagram'],
      tags: body.tags?.length ? body.tags : ['Saved'],
      createdAt: new Date().toISOString()
    };
    db.libraryPosts.unshift(item);
    await store.persist();
    return { data: item };
  });

  app.delete('/api/v2/planner/library/:id', async (req) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    db.libraryPosts = db.libraryPosts.filter((l) => l.id !== id);
    await store.persist();
    return { ok: true };
  });

  app.get('/api/v2/planner/deleted', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.deletedPosts.filter((p) => p.blogId === blogId) };
  });

  app.post('/api/v2/planner/deleted/:id/restore', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const idx = db.deletedPosts.findIndex((p) => p.id === id);
    if (idx === -1) {
      reply.code(404);
      return { error: 'Deleted post not found.' };
    }
    const [restored] = db.deletedPosts.splice(idx, 1);
    const { deletedAt: _ignored, ...activePost } = restored;
    activePost.status = 'SCHEDULED';
    db.plannerPosts.push(activePost);
    await store.persist();
    return { data: activePost };
  });

  // Flows
  app.get('/api/v2/flows', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.flows.filter((f) => f.blogId === blogId) };
  });

  app.get('/api/v2/flows/templates', async () => {
    const db = await store.get();
    return { data: db.flowTemplates };
  });

  app.post('/api/v2/flows', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AutomationFlow>;
    if (!body.name?.trim() || !body.dmText?.trim()) {
      reply.code(400);
      return { error: 'Flow name and DM message are required.' };
    }
    const db = await store.get();
    const flow: AutomationFlow = {
      id: `flw-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      name: body.name.trim(),
      network: body.network || 'instagram',
      commentTrigger: body.commentTrigger || 'withKeywords',
      keywords: body.keywords?.length ? body.keywords : ['INFO'],
      publicReplies: body.publicReplies?.length ? body.publicReplies : ['Check your DM.'],
      dmText: body.dmText.trim(),
      followUpText: body.followUpText?.trim() || '',
      buttonText: body.buttonText?.trim() || 'Open link',
      buttonUrl: body.buttonUrl?.trim() || 'https://beeloftmetric.local/bio/beeloft-studio',
      status: 'ACTIVE',
      executionsCount: 0,
      executions: []
    };
    db.flows.unshift(flow);
    await store.persist();
    return { data: flow };
  });

  app.patch('/api/v2/flows/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' };
    const db = await store.get();
    const flow = db.flows.find((f) => f.id === id);
    if (!flow) {
      reply.code(404);
      return { error: 'Flow not found.' };
    }
    flow.status = body.status ?? (flow.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    await store.persist();
    return { data: flow };
  });

  app.get('/api/v2/flows/:id/executions/timeline', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const flow = db.flows.find((f) => f.id === id);
    if (!flow) {
      reply.code(404);
      return { error: 'Flow not found.' };
    }
    return { data: flow.executions };
  });

  // AI Natural Language Scheduling
  app.get('/api/v2/integrations/ai/languages', async () => ({
    data: ['en', 'id', 'es', 'fr', 'de']
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
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === parseBlogId(body.blogId));
    const lang = body.language || 'en';
    const net = body.network || 'instagram';
    const tone = body.tone || brand?.aiConfig.tone || 'Direct & practical';

    const copyPrefix =
      lang === 'id'
        ? `Rangkuman untuk audiens ${brand?.aiConfig.targetAudience || 'digital team'}`
        : `Brief update for ${brand?.aiConfig.targetAudience || 'marketing teams'}`;

    const generatedCopy = `${copyPrefix} (${net}, ${tone}): ${body.prompt.trim()}. Track click attribution and save time across channels.`;
    return {
      data: {
        generatedCopy,
        suggestedHashtags: ['#beeloftmetric', `#${net}workflow`, '#contentops'],
        suggestedTime: '2026-11-19T18:00',
        appliedBrandVoice: brand?.aiConfig.brandVoice || ''
      }
    };
  });

  // Review Tasks & Approval Portals
  app.get('/api/v2/tasks', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string; filter?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    let list = db.reviewTasks.filter((t) => t.blogId === blogId);
    if (q.filter === 'received' || q.filter === 'sent') {
      list = list.filter((t) => t.direction === q.filter);
    }
    return { data: list };
  });

  app.post('/api/v2/tasks', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<ReviewTask>;
    if (!body.postText?.trim()) {
      reply.code(400);
      return { error: 'Post copy is required to create an approval task.' };
    }
    const db = await store.get();
    const task: ReviewTask = {
      id: `tsk-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      postId: body.postId || `pln-${globalThis.crypto.randomUUID().slice(0, 5)}`,
      postText: body.postText.trim(),
      network: body.network || 'instagram',
      scheduledAt: body.scheduledAt || '2026-11-18T10:00',
      requesterEmail: db.user.email,
      assigneeEmail: body.assigneeEmail || 'reviewer@client.example',
      direction: 'sent',
      status: 'PENDING',
      reviewerNote: '',
      createdAt: new Date().toISOString()
    };
    db.reviewTasks.unshift(task);
    await store.persist();
    return { data: task };
  });

  app.patch('/api/v2/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; reviewerNote?: string };
    const db = await store.get();
    const task = db.reviewTasks.find((t) => t.id === id);
    if (!task || !body.status) {
      reply.code(404);
      return { error: 'Review task not found or status invalid.' };
    }
    task.status = body.status;
    if (typeof body.reviewerNote === 'string') task.reviewerNote = body.reviewerNote.trim();
    const post = db.plannerPosts.find((p) => p.id === task.postId);
    if (post && body.status === 'APPROVED') {
      post.status = 'SCHEDULED';
    }
    await store.persist();
    return { data: task };
  });

  // ==========================================
  // 2.4 Advertising Extra Tabs (Ad Groups, Ads, Keywords, Recommendations)
  // ==========================================
  app.get('/api/v2/advertising/adgroups', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    return { data: db.adGroups.filter((g) => g.blogId === parseBlogId(q.blogId)) };
  });

  app.post('/api/v2/advertising/adgroups', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AdGroup>;
    if (!body.name?.trim()) {
      reply.code(400);
      return { error: 'Ad group name is required.' };
    }
    const db = await store.get();
    const item: AdGroup = {
      id: `ag-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      campaignId: body.campaignId || 'cmp-401',
      campaignName: body.campaignName || 'Active Campaign',
      platform: body.platform || 'metaAds',
      name: body.name.trim(),
      bidStrategy: body.bidStrategy || 'Lowest Cost Cap',
      dailyBudget: Number(body.dailyBudget) || 20,
      spend: 0,
      clicks: 0,
      cpa: 0,
      status: 'ACTIVE'
    };
    db.adGroups.unshift(item);
    await store.persist();
    return { data: item };
  });

  app.patch('/api/v2/advertising/adgroups/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' };
    const db = await store.get();
    const item = db.adGroups.find((g) => g.id === id);
    if (!item) {
      reply.code(404);
      return { error: 'Ad group not found.' };
    }
    item.status = body.status ?? (item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
    await store.persist();
    return { data: item };
  });

  app.get('/api/v2/advertising/ads', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    return { data: db.adCreatives.filter((a) => a.blogId === parseBlogId(q.blogId)) };
  });

  app.patch('/api/v2/advertising/ads/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const ad = db.adCreatives.find((a) => a.id === id);
    if (!ad) {
      reply.code(404);
      return { error: 'Ad creative not found.' };
    }
    ad.status = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await store.persist();
    return { data: ad };
  });

  app.get('/api/v2/advertising/keywords', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    return { data: db.adKeywords.filter((k) => k.blogId === parseBlogId(q.blogId)) };
  });

  app.post('/api/v2/advertising/keywords', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AdKeyword>;
    if (!body.keyword?.trim()) {
      reply.code(400);
      return { error: 'Keyword text is required.' };
    }
    const db = await store.get();
    const kw: AdKeyword = {
      id: `kw-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      keyword: body.keyword.trim(),
      matchType: body.matchType || 'PHRASE',
      cpc: Number(body.cpc) || 0.35,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      qualityScore: 8
    };
    db.adKeywords.unshift(kw);
    await store.persist();
    return { data: kw };
  });

  app.get('/api/v2/advertising/recommendations', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    return { data: db.adRecommendations.filter((r) => r.blogId === parseBlogId(q.blogId)) };
  });

  app.post('/api/v2/advertising/recommendations/:id/apply', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const rec = db.adRecommendations.find((r) => r.id === id);
    if (!rec) {
      reply.code(404);
      return { error: 'Recommendation not found.' };
    }
    rec.applied = true;
    await store.persist();
    return { data: rec };
  });

  // ==========================================
  // 2.5 Reporting Studio (metrifacts) & Campaigns Dashboard
  // ==========================================
  app.get('/api/v2/reporting/studio/plan-limits', async () => {
    const db = await store.get();
    return { data: { maxStudioReports: 50, usedStudioReports: db.studioReports.length } };
  });

  app.get('/api/v2/reporting/studio/reports', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    return { data: db.studioReports.filter((r) => r.blogId === parseBlogId(q.blogId)) };
  });

  app.get('/api/v2/reporting/studio/reports/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const report = db.studioReports.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Studio report not found.' };
    }
    return { data: report };
  });

  app.post('/api/v2/reporting/studio/reports', async (req, reply) => {
    const body = (req.body ?? {}) as { blogId?: number; title?: string };
    if (!body.title?.trim()) {
      reply.code(400);
      return { error: 'Studio report title is required.' };
    }
    const db = await store.get();
    const report: StudioReport = {
      id: `stu-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      title: body.title.trim(),
      updatedAt: new Date().toISOString(),
      publicEnabled: true,
      blocks: [{ id: `blk-${Date.now()}`, type: 'KPI_GRID', title: 'Core Metrics Overview' }]
    };
    db.studioReports.unshift(report);
    await store.persist();
    return { data: report };
  });

  app.put('/api/v2/reporting/studio/versions/:id/blocks', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { blocks?: StudioBlock[]; title?: string };
    const db = await store.get();
    const report = db.studioReports.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Studio report not found.' };
    }
    if (Array.isArray(body.blocks)) report.blocks = body.blocks;
    if (typeof body.title === 'string' && body.title.trim()) report.title = body.title.trim();
    report.updatedAt = new Date().toISOString();
    await store.persist();
    return { data: report };
  });

  app.post('/api/v2/reporting/studio/reports/:id/anonymous-link', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const report = db.studioReports.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Studio report not found.' };
    }
    report.publicEnabled = true;
    await store.persist();
    return { data: { publicUrl: `/reporting/studio/public/${report.id}` } };
  });

  app.get('/api/v2/reporting/campaigns-dashboard', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    return { data: db.campaignsDashboard.filter((c) => c.blogId === parseBlogId(q.blogId)) };
  });

  app.post('/api/v2/reporting/campaigns-dashboard', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<CampaignDashboardItem>;
    if (!body.name?.trim() || !body.tag?.trim()) {
      reply.code(400);
      return { error: 'Campaign name and tag are required.' };
    }
    const db = await store.get();
    const item: CampaignDashboardItem = {
      id: `cd-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      blogId: parseBlogId(body.blogId),
      name: body.name.trim(),
      tag: body.tag.trim(),
      startDate: body.startDate || '2026-11-01',
      endDate: body.endDate || '2026-11-30',
      postsCount: 0,
      impressions: 0,
      clicks: 0,
      archived: false
    };
    db.campaignsDashboard.unshift(item);
    await store.persist();
    return { data: item };
  });

  app.patch('/api/v2/reporting/campaigns-dashboard/:id/archive', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const item = db.campaignsDashboard.find((c) => c.id === id);
    if (!item) {
      reply.code(404);
      return { error: 'Campaign tracker not found.' };
    }
    item.archived = !item.archived;
    await store.persist();
    return { data: item };
  });

  // ==========================================
  // 2.6 Brand Details 6-Tab Configuration
  // ==========================================
  app.get('/api/v2/settings/catalogs/timezones', async () => ({
    data: ['Asia/Jakarta', 'UTC', 'Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles']
  }));

  app.get('/api/v2/settings/brands/:blogId/details', async (req, reply) => {
    const { blogId } = req.params as { blogId: string };
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === Number(blogId));
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    return { data: brand };
  });

  app.put('/api/v2/settings/brands/:blogId/details', async (req, reply) => {
    const { blogId } = req.params as { blogId: string };
    const body = (req.body ?? {}) as Partial<Brand>;
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === Number(blogId));
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    if (typeof body.name === 'string' && body.name.trim()) brand.name = body.name.trim();
    if (typeof body.timezone === 'string') brand.timezone = body.timezone;
    if (typeof body.currency === 'string') brand.currency = body.currency;
    if (body.engagementRatioMode === 'REACH' || body.engagementRatioMode === 'FOLLOWERS') {
      brand.engagementRatioMode = body.engagementRatioMode;
    }
    if (Array.isArray(body.tags)) brand.tags = body.tags;
    if (body.whiteLabel) brand.whiteLabel = { ...brand.whiteLabel, ...body.whiteLabel };
    if (body.aiConfig) brand.aiConfig = { ...brand.aiConfig, ...body.aiConfig };
    if (body.integrations) brand.integrations = { ...brand.integrations, ...body.integrations };
    await store.persist();
    return { data: brand };
  });

  // ==========================================
  // 2.7 User API Tokens, 2FA, Team, Organization, Affiliation & Backoffice
  // ==========================================
  app.get('/api/v2/settings/users/tokens/current', async () => {
    const db = await store.get();
    return {
      data: {
        token: db.user.apiToken,
        totpEnabled: db.user.totpEnabled,
        approvedMcpScopes: db.user.approvedMcpScopes
      }
    };
  });

  app.post('/api/v2/settings/users/tokens/regenerate', async (req, reply) => {
    const body = (req.body ?? {}) as { confirmWord?: string };
    if (body.confirmWord !== 'REGENERATE') {
      reply.code(400);
      return { error: 'Type REGENERATE in uppercase to confirm token rotation.' };
    }
    const db = await store.get();
    db.user.apiToken = `bm_live_${db.user.userId}_${randomHex(6)}`;
    await store.persist();
    return { data: { token: db.user.apiToken } };
  });

  app.post('/api/v2/settings/users/totp/tokens', async () => {
    const db = await store.get();
    db.user.totpEnabled = !db.user.totpEnabled;
    await store.persist();
    return { data: { totpEnabled: db.user.totpEnabled } };
  });

  app.get('/api/v2/user-management', async () => {
    const db = await store.get();
    return { data: db.teamMembers };
  });

  app.post('/api/v2/user-management/invite', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<TeamMember>;
    if (!body.email?.includes('@') || !body.name?.trim()) {
      reply.code(400);
      return { error: 'Name and valid email are required.' };
    }
    const db = await store.get();
    const member: TeamMember = {
      id: `tm-${globalThis.crypto.randomUUID().slice(0, 6)}`,
      name: body.name.trim(),
      email: body.email.trim(),
      role: body.role || 'EDITOR',
      kind: body.kind || 'team',
      assignedBrands: body.assignedBrands?.length ? body.assignedBrands : [8137744],
      status: 'INVITED'
    };
    db.teamMembers.push(member);
    await store.persist();
    return { data: member };
  });

  app.delete('/api/v2/user-management/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const target = db.teamMembers.find((m) => m.id === id);
    if (!target || target.role === 'OWNER') {
      reply.code(400);
      return { error: 'Cannot remove owner or missing member.' };
    }
    db.teamMembers = db.teamMembers.filter((m) => m.id !== id);
    await store.persist();
    return { ok: true };
  });

  app.get('/api/v2/agency-CK/details', async () => {
    const db = await store.get();
    return { data: db.agencySettings };
  });

  app.put('/api/v2/agency-CK/:id/smtp-configuration', async (req) => {
    const body = (req.body ?? {}) as Partial<BeeloftDatabaseAgencyPatch>;
    const db = await store.get();
    db.agencySettings = { ...db.agencySettings, ...body };
    await store.persist();
    return { data: db.agencySettings };
  });

  app.post('/api/v2/agency-CK/:id/test-mail', async (req) => {
    const body = (req.body ?? {}) as { recipient?: string };
    const db = await store.get();
    const to = body.recipient || db.user.email;
    db.agencySettings.lastTestStatus = `Test mail queued cleanly to ${to} via ${db.agencySettings.smtpHost}:${db.agencySettings.smtpPort}`;
    await store.persist();
    return { data: { status: db.agencySettings.lastTestStatus } };
  });

  app.get('/api/v2/affiliation', async () => {
    const db = await store.get();
    return { data: db.affiliation };
  });

  app.patch('/api/v2/affiliation/settings', async (req, reply) => {
    const body = (req.body ?? {}) as { payoutEmail?: string };
    if (!body.payoutEmail?.includes('@')) {
      reply.code(400);
      return { error: 'Valid payout email is required.' };
    }
    const db = await store.get();
    db.affiliation.payoutEmail = body.payoutEmail.trim();
    await store.persist();
    return { data: db.affiliation };
  });

  // Backoffice
  app.get('/api/v2/backoffice/overview', async () => {
    const db = await store.get();
    return {
      data: {
        usersList: [
          {
            userId: db.user.userId,
            email: db.user.email,
            name: db.user.name,
            plan: db.user.plan,
            status: db.user.status
          }
        ],
        deletedBrands: db.brands.filter((b) => b.deleted),
        coupons: db.coupons,
        invoices: db.invoices,
        featureFlags: db.user.features,
        apiConsumption: {
          callsToday: db.attributionEvents.length + 128,
          quotaPerDay: 50000
        },
        buildInfo: {
          version: 'beeloft-1.0.0-parity',
          referenceBuild: '375438893013',
          runtime:
            (globalThis as { process?: { version?: string } }).process?.version
              ? 'Node ' + (globalThis as { process?: { version?: string } }).process?.version
              : 'Browser LocalStore'
        }
      }
    };
  });

  app.post('/api/v2/backoffice/coupons', async (req, reply) => {
    const body = (req.body ?? {}) as { code?: string; discountPct?: number; planTarget?: string };
    if (!body.code?.trim()) {
      reply.code(400);
      return { error: 'Coupon code is required.' };
    }
    const db = await store.get();
    const coupon = {
      id: `cpn-${globalThis.crypto.randomUUID().slice(0, 5)}`,
      code: body.code.trim().toUpperCase(),
      discountPct: Math.min(90, Math.max(5, Number(body.discountPct) || 20)),
      planTarget: body.planTarget || 'STARTER',
      redemptions: 0,
      maxRedemptions: 100,
      active: true
    };
    db.coupons.unshift(coupon);
    await store.persist();
    return { data: coupon };
  });

  app.patch('/api/v2/backoffice/feature-flags/:key', async (req) => {
    const { key } = req.params as { key: string };
    const db = await store.get();
    db.user.features[key] = !db.user.features[key];
    await store.persist();
    return { data: db.user.features };
  });

  app.post('/api/v2/backoffice/restore-brand/:blogId', async (req, reply) => {
    const { blogId } = req.params as { blogId: string };
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === Number(blogId) && b.deleted);
    if (!brand) {
      reply.code(404);
      return { error: 'Deleted brand not found.' };
    }
    brand.deleted = false;
    await store.persist();
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
