import { buildConnectionMap } from '../seed.js';
import type {
  AdCampaign,
  AutoList,
  BeeloftDatabase,
  Brand,
  DailyMetricPoint,
  DataStore,
  NetworkKey,
  PlannerPost,
  ReportArchiveItem,
  RouteRegistry,
  SmartLink
} from '../types.js';

function randomId(prefix: string, len = 6): string {
  return `${prefix}-${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, len)}`;
}

function parseBlogId(raw: unknown, fallback = 8137744): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function findBrand(db: BeeloftDatabase, blogId: number): Brand | undefined {
  return db.brands.find((b) => b.blogId === blogId);
}

function makeDefaultSeries(network: NetworkKey): DailyMetricPoint[] {
  const seed = network.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const start = new Date('2026-09-18T00:00:00Z');
  const rows: DailyMetricPoint[] = [];
  for (let i = 0; i < 60; i += 1) {
    const d = new Date(start.getTime() + i * 86400000);
    const trend = 0.9 + (i / 60) * 0.2;
    const wave = Math.sin((i + seed) * 0.45) * 0.18 + trend;
    const impressions = Math.round((1800 + (seed % 9) * 350) * wave);
    const reach = Math.round(impressions * 0.72);
    rows.push({
      date: d.toISOString().slice(0, 10),
      impressions,
      reach,
      followers: 1200 + (seed % 5) * 400 + i * 9,
      interactions: Math.round(reach * 0.044),
      clicks: Math.round(reach * 0.017)
    });
  }
  return rows;
}

function buildHeatmap(network: string): number[][] {
  const seed = network.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const matrix: number[][] = [];
  for (let day = 0; day < 7; day += 1) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const workBoost = hour >= 9 && hour <= 20 ? 45 : 12;
      const eveningBoost = hour >= 18 && hour <= 21 ? 28 : 0;
      const weekendShift = day >= 5 && hour >= 10 && hour <= 15 ? 18 : 0;
      const noise = (day * 7 + hour * 3 + seed) % 19;
      row.push(Math.min(100, workBoost + eveningBoost + weekendShift + noise));
    }
    matrix.push(row);
  }
  return matrix;
}

export function registerCoreRoutes(app: RouteRegistry, store: DataStore): void {
  // ==========================================
  // Attribution Engine (APUS replacement)
  // ==========================================
  app.post('/s/session', async (req, reply) => {
    const db = await store.get();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const visitorId =
      (typeof body.visitorId === 'string' && body.visitorId) ||
      randomId('vis', 10);
    const sessionId = randomId('ses', 10);
    const nowTs = Math.floor(Date.now() / 1000);
    const bmCookie = `BM1$t${nowTs}$u${db.user.userId}$p1$v${visitorId}$l${nowTs}`;

    db.attributionEvents.unshift({
      id: randomId('att', 8),
      visitorId,
      sessionId,
      type: 'session',
      path: typeof body.path === 'string' ? body.path : '/',
      eventName: 'session_init',
      utmSource: typeof body.utmSource === 'string' ? body.utmSource : 'direct',
      utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : 'none',
      referral: typeof body.referral === 'string' ? body.referral : null,
      timestamp: new Date().toISOString()
    });
    db.attributionEvents = db.attributionEvents.slice(0, 100);
    await store.persist();

    reply.setCookie('_bm', bmCookie, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false
    });

    return {
      sessionId,
      visitorId,
      cookie: bmCookie,
      l_s: typeof body.utmSource === 'string' ? body.utmSource : 'direct',
      l_m: typeof body.utmMedium === 'string' ? body.utmMedium : 'none',
      f_saved: true
    };
  });

  app.post('/s', async (req) => {
    const db = await store.get();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const visitorId =
      typeof body.visitorId === 'string' && body.visitorId ? body.visitorId : 'vis-anon';
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : 'ses-anon';

    const entry = {
      id: randomId('att', 8),
      visitorId,
      sessionId,
      type: 'event' as const,
      path: typeof body.path === 'string' ? body.path : '/',
      eventName: typeof body.eventName === 'string' ? body.eventName : 'route_view',
      utmSource: typeof body.utmSource === 'string' ? body.utmSource : null,
      utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : null,
      referral: typeof body.referral === 'string' ? body.referral : null,
      timestamp: new Date().toISOString()
    };

    db.attributionEvents.unshift(entry);
    db.attributionEvents = db.attributionEvents.slice(0, 100);
    await store.persist();
    return { ok: true, id: entry.id };
  });

  app.post('/p', async (req) => {
    const db = await store.get();
    const body = (req.body ?? {}) as Record<string, unknown>;
    const entry = {
      id: randomId('att', 8),
      visitorId: typeof body.visitorId === 'string' ? body.visitorId : 'vis-anon',
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : 'ses-anon',
      type: 'telemetry' as const,
      path: typeof body.path === 'string' ? body.path : '/',
      eventName: typeof body.eventName === 'string' ? body.eventName : 'product_action',
      utmSource: null,
      utmMedium: null,
      referral: null,
      timestamp: new Date().toISOString()
    };
    db.attributionEvents.unshift(entry);
    db.attributionEvents = db.attributionEvents.slice(0, 100);
    await store.persist();
    return { ok: true, id: entry.id };
  });

  app.get('/s/apvid/:vid', async (req) => {
    const { vid } = req.params as { vid: string };
    const db = await store.get();
    const events = db.attributionEvents.filter((e) => e.visitorId === vid);
    return { visitorId: vid, events };
  });

  app.get('/api/v2/attribution/recent', async () => {
    const db = await store.get();
    return { data: db.attributionEvents.slice(0, 15) };
  });

  // ==========================================
  // Admin, Auth & Entitlements
  // ==========================================
  app.get('/api/admin/healthcheck', async () => true);

  app.get('/api/admin/userstatus', async () => {
    const db = await store.get();
    const { passwordHash: _ignored, ...safeUser } = db.user;
    return {
      ...safeUser,
      brands: db.brands
        .filter((b) => !b.deleted)
        .map((b) => ({
          blogId: b.blogId,
          name: b.name,
          timezone: b.timezone,
          currency: b.currency,
          isSample: b.isSample,
          connectionsCount: Object.values(b.connections).filter((c) => c.connected).length
        }))
    };
  });

  app.post('/api/v2/auth/login', async (req, reply) => {
    const db = await store.get();
    const body = (req.body ?? {}) as { email?: string; password?: string };
    if (!body.email || !body.email.includes('@')) {
      reply.code(400);
      return { error: 'Please provide a valid email address.' };
    }
    if (!body.password || body.password.length < 4) {
      reply.code(400);
      return { error: 'Password must contain at least 4 characters.' };
    }
    db.user.email = body.email.trim();
    await store.persist();
    reply.setCookie('_bm_auth', `usr-${db.user.userId}`, { path: '/', httpOnly: false });
    const { passwordHash: _ignored, ...safeUser } = db.user;
    return { ok: true, user: safeUser };
  });

  app.post('/api/v2/auth/register', async (req, reply) => {
    const db = await store.get();
    const body = (req.body ?? {}) as { name?: string; email?: string; password?: string };
    if (!body.email || !body.email.includes('@')) {
      reply.code(400);
      return { error: 'Please provide a valid email address.' };
    }
    if (!body.password || body.password.length < 6) {
      reply.code(400);
      return { error: 'Password must contain at least 6 characters.' };
    }
    db.user.name = body.name?.trim() || 'Beeloft Operator';
    db.user.email = body.email.trim();
    db.user.registered = new Date().toISOString();
    await store.persist();
    reply.setCookie('_bm_auth', `usr-${db.user.userId}`, { path: '/', httpOnly: false });
    const { passwordHash: _ignored, ...safeUser } = db.user;
    return { ok: true, user: safeUser };
  });

  app.post('/api/v2/auth/logout', async (_req, reply) => {
    reply.clearCookie('_bm_auth', { path: '/' });
    return { ok: true };
  });

  app.patch('/api/v2/settings/users/profile', async (req) => {
    const db = await store.get();
    const body = (req.body ?? {}) as { name?: string; email?: string; plan?: Brand['name'] };
    if (typeof body.name === 'string' && body.name.trim()) db.user.name = body.name.trim();
    if (typeof body.email === 'string' && body.email.includes('@')) db.user.email = body.email.trim();
    if (
      body.plan === 'FREE' ||
      body.plan === 'STARTER' ||
      body.plan === 'ADVANCED' ||
      body.plan === 'ENTERPRISE_CUSTOM'
    ) {
      db.user.plan = body.plan;
      db.user.brandLimit =
        body.plan === 'FREE' ? 1 : body.plan === 'STARTER' ? 5 : body.plan === 'ADVANCED' ? 15 : 50;
    }
    await store.persist();
    const { passwordHash: _ignored, ...safeUser } = db.user;
    return { data: safeUser };
  });

  app.get('/api/v2/settings/users/location-from-ip', async () => ({
    data: { countryCode: 'ID' }
  }));

  app.get('/api/v2/features/check-all', async () => {
    const db = await store.get();
    return { data: db.user.features };
  });

  app.get('/api/v2/authorization/authorities', async () => {
    const db = await store.get();
    return { data: db.user.authorities };
  });

  app.get('/api/v2/notifications', async () => {
    const db = await store.get();
    return { data: db.notifications };
  });

  app.post('/api/v2/notifications/:id/read', async (req) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const n = db.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      await store.persist();
    }
    return { ok: true };
  });

  // ==========================================
  // Brands & Connections
  // ==========================================
  app.get('/api/v2/brands', async () => {
    const db = await store.get();
    return {
      data: db.brands
        .filter((b) => !b.deleted)
        .map((b) => ({
          blogId: b.blogId,
          userId: b.userId,
          name: b.name,
          timezone: b.timezone,
          currency: b.currency,
          isSample: b.isSample,
          connectionsCount: Object.values(b.connections).filter((c) => c.connected).length
        }))
    };
  });

  app.post('/api/v2/brands', async (req, reply) => {
    const db = await store.get();
    const body = (req.body ?? {}) as { name?: string; timezone?: string; currency?: string };
    const name = body.name?.trim();
    if (!name) {
      reply.code(400);
      return { error: 'Brand name is required.' };
    }
    if (db.brands.filter((b) => !b.deleted).length >= db.user.brandLimit) {
      reply.code(403);
      return { error: 'Brand limit reached for current subscription plan.' };
    }
    const maxId = db.brands.reduce((acc, b) => Math.max(acc, b.blogId), 8137744);
    const created: Brand = {
      blogId: maxId + 1,
      userId: db.user.userId,
      name,
      timezone: body.timezone || 'Asia/Jakarta',
      currency: body.currency || 'USD',
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
    return { data: created };
  });

  app.patch('/api/v2/brands/:blogId', async (req, reply) => {
    const { blogId } = req.params as { blogId: string };
    const db = await store.get();
    const brand = findBrand(db, Number(blogId));
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    const body = (req.body ?? {}) as { name?: string; timezone?: string; currency?: string };
    if (typeof body.name === 'string' && body.name.trim()) brand.name = body.name.trim();
    if (typeof body.timezone === 'string' && body.timezone.trim()) brand.timezone = body.timezone.trim();
    if (typeof body.currency === 'string' && body.currency.trim()) brand.currency = body.currency.trim();
    await store.persist();
    return { data: brand };
  });

  app.get('/api/v2/settings/brands/connections', async (req, reply) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    const brand = findBrand(db, parseBlogId(q.blogId));
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    return { data: Object.values(brand.connections) };
  });

  app.get('/api/v2/settings/brands/connections/:network/last-connection', async (req) => {
    const { network } = req.params as { network: NetworkKey };
    const q = (req.query ?? {}) as { blogId?: string };
    const db = await store.get();
    const brand = findBrand(db, parseBlogId(q.blogId));
    const conn = brand?.connections[network];
    if (!conn || !conn.connected) {
      return { data: {} };
    }
    return {
      data: {
        connected: true,
        lastSync: conn.lastSync,
        accountId: conn.accountId,
        accountHandle: conn.accountHandle
      }
    };
  });

  app.post('/api/v2/settings/brands/connections/:network/toggle', async (req, reply) => {
    const { network } = req.params as { network: NetworkKey };
    const q = (req.query ?? {}) as { blogId?: string };
    const body = (req.body ?? {}) as { blogId?: number; handle?: string; connect?: boolean };
    const db = await store.get();
    const brand = findBrand(db, parseBlogId(body.blogId ?? q.blogId));
    if (!brand || !brand.connections[network]) {
      reply.code(404);
      return { error: 'Brand or network not found.' };
    }

    const target = brand.connections[network];
    const shouldConnect = typeof body.connect === 'boolean' ? body.connect : !target.connected;

    if (shouldConnect) {
      const handle = body.handle?.trim() || `@${brand.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${network}`;
      target.connected = true;
      target.accountHandle = handle;
      target.accountId = randomId(network, 6);
      target.lastSync = new Date().toISOString();

      if (!db.metricsSeries[String(brand.blogId)]) {
        db.metricsSeries[String(brand.blogId)] = {};
      }
      if (!db.metricsSeries[String(brand.blogId)][network]) {
        db.metricsSeries[String(brand.blogId)][network] = makeDefaultSeries(network);
      }
    } else {
      target.connected = false;
      target.accountHandle = null;
      target.accountId = null;
      target.lastSync = null;
    }

    await store.persist();
    return { data: target };
  });

  // ==========================================
  // Analytics / Evolution & Hashtags
  // ==========================================
  app.get('/api/v2/evolution/summary', async (req, reply) => {
    const q = (req.query ?? {}) as { blogId?: string; network?: string; days?: string };
    const db = await store.get();
    const brand = findBrand(db, parseBlogId(q.blogId));
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }

    const days = Math.min(30, Math.max(7, Number(q.days) || 30));
    const network = q.network || 'brandSummary';
    const connectedNetworks = Object.values(brand.connections).filter((c) => c.connected);

    if (network === 'brandSummary') {
      if (connectedNetworks.length === 0) {
        return {
          data: {
            connected: false,
            network,
            brandName: brand.name,
            isSample: brand.isSample,
            periodLabel: `Last ${days} days`,
            comparisonPeriodLabel: `Previous ${days} days`,
            connectedCount: 0,
            kpis: [],
            series: [],
            topPosts: []
          }
        };
      }

      const brandSeriesMap = db.metricsSeries[String(brand.blogId)] ?? {};
      const allDates = new Map<string, DailyMetricPoint>();

      for (const conn of connectedNetworks) {
        const netSeries = brandSeriesMap[conn.network] ?? [];
        for (const pt of netSeries) {
          const existing = allDates.get(pt.date);
          if (existing) {
            existing.impressions += pt.impressions;
            existing.reach += pt.reach;
            existing.followers += pt.followers;
            existing.interactions += pt.interactions;
            existing.clicks += pt.clicks;
          } else {
            allDates.set(pt.date, { ...pt });
          }
        }
      }

      const sorted = Array.from(allDates.values()).sort((a, b) => a.date.localeCompare(b.date));
      const slice = sorted.slice(-days);
      const prevSlice = sorted.slice(Math.max(0, sorted.length - days * 2), sorted.length - days);

      const sumField = (arr: DailyMetricPoint[], key: keyof DailyMetricPoint) =>
        arr.reduce((sum, item) => sum + Number(item[key]), 0);

      const totalImpr = sumField(slice, 'impressions');
      const totalReach = sumField(slice, 'reach');
      const totalInter = sumField(slice, 'interactions');
      const latestFollowers = slice.length ? slice[slice.length - 1].followers : 0;
      const firstFollowers = slice.length ? slice[0].followers : 0;
      const followersDelta = latestFollowers - firstFollowers;

      const prevImpr = sumField(prevSlice, 'impressions') || totalImpr;
      const imprPct = prevSlice.length ? (((totalImpr - prevImpr) / prevImpr) * 100).toFixed(1) : '0.0';
      const engagementRate = totalReach > 0 ? ((totalInter / totalReach) * 100).toFixed(2) : '0.00';

      return {
        data: {
          connected: true,
          network,
          brandName: brand.name,
          isSample: brand.isSample,
          periodLabel: `Last ${days} days`,
          comparisonPeriodLabel: `Previous ${days} days`,
          connectedCount: connectedNetworks.length,
          kpis: [
            {
              id: 'impressions',
              label: 'Total Impressions',
              value: totalImpr,
              deltaText: `${Number(imprPct) >= 0 ? '+' : ''}${imprPct}% vs previous ${days} days`
            },
            {
              id: 'reach',
              label: 'Total Reach',
              value: totalReach,
              deltaText: `Across ${connectedNetworks.length} connected channels`
            },
            {
              id: 'followers',
              label: 'Community Size',
              value: latestFollowers,
              deltaText: `${followersDelta >= 0 ? '+' : ''}${followersDelta} net in last ${days} days`
            },
            {
              id: 'engagement',
              label: 'Engagement Rate',
              value: `${engagementRate}%`,
              deltaText: `${totalInter} total interactions`
            }
          ],
          series: slice,
          topPosts: db.topPosts.filter((p) => p.blogId === brand.blogId)
        }
      };
    }

    const targetConn = brand.connections[network as NetworkKey];
    if (!targetConn || !targetConn.connected) {
      return {
        data: {
          connected: false,
          network,
          networkLabel: targetConn?.label ?? network,
          brandName: brand.name,
          isSample: brand.isSample,
          periodLabel: `Last ${days} days`,
          comparisonPeriodLabel: `Previous ${days} days`,
          kpis: [],
          series: [],
          topPosts: []
        }
      };
    }

    const netSeries = (db.metricsSeries[String(brand.blogId)]?.[network] ?? makeDefaultSeries(network as NetworkKey)).slice(-days);
    const totalImpr = netSeries.reduce((s, p) => s + p.impressions, 0);
    const totalReach = netSeries.reduce((s, p) => s + p.reach, 0);
    const totalInter = netSeries.reduce((s, p) => s + p.interactions, 0);
    const latestFollowers = netSeries.length ? netSeries[netSeries.length - 1].followers : 0;
    const engagementRate = totalReach > 0 ? ((totalInter / totalReach) * 100).toFixed(2) : '0.00';

    return {
      data: {
        connected: true,
        network,
        networkLabel: targetConn.label,
        accountHandle: targetConn.accountHandle,
        brandName: brand.name,
        isSample: brand.isSample,
        periodLabel: `Last ${days} days`,
        comparisonPeriodLabel: `Previous ${days} days`,
        kpis: [
          {
            id: 'impressions',
            label: `${targetConn.label} Impressions`,
            value: totalImpr,
            deltaText: `Last ${days} days`
          },
          {
            id: 'reach',
            label: 'Accounts Reached',
            value: totalReach,
            deltaText: `Account ${targetConn.accountHandle}`
          },
          {
            id: 'followers',
            label: 'Followers',
            value: latestFollowers,
            deltaText: `Synced ${targetConn.lastSync?.slice(0, 10) ?? 'today'}`
          },
          {
            id: 'engagement',
            label: 'Engagement Rate',
            value: `${engagementRate}%`,
            deltaText: `${totalInter} interactions`
          }
        ],
        series: netSeries,
        topPosts: db.topPosts.filter((p) => p.blogId === brand.blogId && p.network === network)
      }
    };
  });

  app.get('/api/v2/hashtags/historical', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.hashtags.filter((h) => h.blogId === blogId) };
  });

  app.post('/api/v2/hashtags/historical', async (req, reply) => {
    const body = (req.body ?? {}) as {
      blogId?: number;
      hashtag?: string;
      network?: 'instagram' | 'twitter' | 'tiktok';
    };
    const blogId = parseBlogId(body.blogId);
    const cleanTag = body.hashtag?.trim().replace(/^#?/, '#');
    if (!cleanTag || cleanTag.length < 2) {
      reply.code(400);
      return { error: 'Hashtag cannot be empty.' };
    }
    const db = await store.get();
    const created = {
      id: randomId('ht'),
      blogId,
      hashtag: cleanTag,
      network: body.network || 'instagram',
      postsCount: 0,
      impressions: 0,
      trackedAt: new Date().toISOString()
    };
    db.hashtags.unshift(created);
    await store.persist();
    return { data: created };
  });

  // ==========================================
  // Reporting Studio
  // ==========================================
  app.get('/api/v2/reports/templates/system', async () => {
    const db = await store.get();
    return { data: db.systemTemplates };
  });

  app.get('/api/v2/reports/templates/custom', async () => {
    const db = await store.get();
    return { data: db.customTemplates };
  });

  app.post('/api/v2/reports/templates/custom', async (req, reply) => {
    const body = (req.body ?? {}) as { name?: string; description?: string; sections?: string[] };
    if (!body.name?.trim()) {
      reply.code(400);
      return { error: 'Template name is required.' };
    }
    const db = await store.get();
    const tpl = {
      id: randomId('tpl-custom'),
      name: body.name.trim(),
      description: body.description?.trim() || 'Custom report layout',
      kind: 'custom' as const,
      sections: body.sections?.length ? body.sections : ['Brand Summary KPIs', 'Top Posts']
    };
    db.customTemplates.unshift(tpl);
    await store.persist();
    return { data: tpl };
  });

  app.get('/api/v2/reports/history', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.reportsHistory.filter((r) => r.blogId === blogId) };
  });

  app.post('/api/v2/reports/generate', async (req, reply) => {
    const body = (req.body ?? {}) as {
      blogId?: number;
      title?: string;
      templateId?: string;
      format?: 'PDF' | 'PPTX';
      dateFrom?: string;
      dateTo?: string;
    };
    const db = await store.get();
    const blogId = parseBlogId(body.blogId);
    const brand = findBrand(db, blogId);
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }

    const brandSeries = Object.values(db.metricsSeries[String(blogId)] ?? {}).flat();
    const impressions = brandSeries.reduce((s, p) => s + p.impressions, 0);
    const reach = brandSeries.reduce((s, p) => s + p.reach, 0);
    const postsPublished = db.plannerPosts.filter(
      (p) => p.blogId === blogId && p.status === 'PUBLISHED'
    ).length;

    const report: ReportArchiveItem = {
      id: randomId('rep'),
      blogId,
      title: body.title?.trim() || `${brand.name} Report`,
      templateId: body.templateId || 'tpl-monthly',
      format: body.format === 'PPTX' ? 'PPTX' : 'PDF',
      dateFrom: body.dateFrom || '2026-10-18',
      dateTo: body.dateTo || '2026-11-16',
      createdAt: new Date().toISOString(),
      status: 'READY',
      summaryMetrics: {
        impressions,
        reach,
        followersDelta: brandSeries.length ? 310 : 0,
        postsPublished
      }
    };
    db.reportsHistory.unshift(report);
    await store.persist();
    return { data: report };
  });

  app.get('/api/v2/reports/:id/download', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const report = db.reportsHistory.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Report not found.' };
    }
    const text = [
      `BeeloftMetric Report Export`,
      `Title: ${report.title}`,
      `Format: ${report.format}`,
      `Date Range: ${report.dateFrom} to ${report.dateTo}`,
      `Generated At: ${report.createdAt}`,
      `Impressions: ${report.summaryMetrics.impressions}`,
      `Reach: ${report.summaryMetrics.reach}`,
      `Posts Published: ${report.summaryMetrics.postsPublished}`
    ].join('\n');

    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${report.id}.txt"`);
    return text;
  });

  // ==========================================
  // Unified Inbox
  // ==========================================
  app.get('/api/v2/inbox/threads', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string; status?: string; network?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    let threads = db.inboxThreads.filter((t) => t.blogId === blogId);
    if (q.status && q.status !== 'ALL') {
      threads = threads.filter((t) => t.status === q.status);
    }
    if (q.network && q.network !== 'ALL') {
      threads = threads.filter((t) => t.network === q.network);
    }
    return { data: threads };
  });

  app.post('/api/v2/inbox/threads/:id/messages', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { text?: string };
    if (!body.text?.trim()) {
      reply.code(400);
      return { error: 'Reply message cannot be empty.' };
    }
    const db = await store.get();
    const thread = db.inboxThreads.find((t) => t.id === id);
    if (!thread) {
      reply.code(404);
      return { error: 'Conversation thread not found.' };
    }
    const msg = {
      id: randomId('msg'),
      sender: 'operator' as const,
      authorName: db.user.name,
      text: body.text.trim(),
      sentAt: new Date().toISOString()
    };
    thread.messages.push(msg);
    thread.status = 'PENDING';
    thread.updatedAt = msg.sentAt;
    await store.persist();
    return { data: thread };
  });

  app.patch('/api/v2/inbox/threads/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'UNREAD' | 'PENDING' | 'RESOLVED' };
    const db = await store.get();
    const thread = db.inboxThreads.find((t) => t.id === id);
    if (!thread || !body.status) {
      reply.code(404);
      return { error: 'Thread not found or status missing.' };
    }
    thread.status = body.status;
    await store.persist();
    return { data: thread };
  });

  // ==========================================
  // Planner, AutoLists & Best Times
  // ==========================================
  app.get('/api/v2/planner/posts', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    const posts = db.plannerPosts
      .filter((p) => p.blogId === blogId)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return { data: posts };
  });

  app.post('/api/v2/planner/posts', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<PlannerPost>;
    if (!body.text?.trim() || !body.scheduledAt || !body.networks?.length) {
      reply.code(400);
      return { error: 'Post copy, schedule date/time, and at least one network are required.' };
    }
    const db = await store.get();
    const post: PlannerPost = {
      id: randomId('pln'),
      blogId: parseBlogId(body.blogId),
      scheduledAt: body.scheduledAt,
      text: body.text.trim(),
      firstComment: body.firstComment?.trim() || '',
      media: Array.isArray(body.media) ? body.media : [],
      networks: body.networks,
      status: body.status || 'SCHEDULED',
      notes: body.notes?.trim() || ''
    };
    db.plannerPosts.push(post);
    await store.persist();
    return { data: post };
  });

  app.patch('/api/v2/planner/posts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<PlannerPost>;
    const db = await store.get();
    const post = db.plannerPosts.find((p) => p.id === id);
    if (!post) {
      reply.code(404);
      return { error: 'Scheduled post not found.' };
    }
    if (typeof body.text === 'string') post.text = body.text.trim();
    if (typeof body.scheduledAt === 'string') post.scheduledAt = body.scheduledAt;
    if (typeof body.status === 'string') post.status = body.status;
    if (typeof body.firstComment === 'string') post.firstComment = body.firstComment;
    if (Array.isArray(body.networks) && body.networks.length) post.networks = body.networks;
    await store.persist();
    return { data: post };
  });

  app.delete('/api/v2/planner/posts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const idx = db.plannerPosts.findIndex((p) => p.id === id);
    if (idx === -1) {
      reply.code(404);
      return { error: 'Scheduled post not found.' };
    }
    const [removed] = db.plannerPosts.splice(idx, 1);
    db.deletedPosts.unshift({ ...removed, deletedAt: new Date().toISOString() });
    await store.persist();
    return { ok: true };
  });

  app.get('/api/v2/planner/best-times', async (req) => {
    const q = (req.query ?? {}) as { network?: string };
    const network = q.network || 'instagram';
    return {
      data: {
        network,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        matrix: buildHeatmap(network)
      }
    };
  });

  app.get('/api/v2/planner/autolists', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.autolists.filter((a) => a.blogId === blogId) };
  });

  app.post('/api/v2/planner/autolists', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AutoList>;
    if (!body.name?.trim()) {
      reply.code(400);
      return { error: 'AutoList name is required.' };
    }
    const db = await store.get();
    const item: AutoList = {
      id: randomId('al'),
      blogId: parseBlogId(body.blogId),
      name: body.name.trim(),
      active: true,
      networks: body.networks?.length ? body.networks : ['instagram'],
      scheduleRule: body.scheduleRule?.trim() || 'Every Wednesday at 10:00',
      postsCount: 0
    };
    db.autolists.unshift(item);
    await store.persist();
    return { data: item };
  });

  app.patch('/api/v2/planner/autolists/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<AutoList>;
    const db = await store.get();
    const item = db.autolists.find((a) => a.id === id);
    if (!item) {
      reply.code(404);
      return { error: 'AutoList not found.' };
    }
    if (typeof body.active === 'boolean') item.active = body.active;
    if (typeof body.name === 'string') item.name = body.name.trim();
    await store.persist();
    return { data: item };
  });

  // ==========================================
  // SmartLinks
  // ==========================================
  app.get('/api/v2/smart-links/links/lite', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    return { data: db.smartLinks.filter((s) => s.blogId === blogId) };
  });

  app.get('/api/v2/smart-links/links/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const db = await store.get();
    const link = db.smartLinks.find((s) => s.id === id);
    if (!link) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }
    return { data: link };
  });

  app.post('/api/v2/smart-links/links', async (req, reply) => {
    const body = (req.body ?? {}) as { blogId?: number; title?: string; slug?: string };
    const db = await store.get();
    const blogId = parseBlogId(body.blogId);
    const slug = (body.slug || `brand-${blogId}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    if (db.smartLinks.some((s) => s.slug === slug)) {
      reply.code(409);
      return { error: 'SmartLink slug is already taken.' };
    }
    const created: SmartLink = {
      id: randomId('sl'),
      blogId,
      slug,
      title: body.title?.trim() || 'My SmartLink Page',
      description: 'Kumpulan tautan resmi dan kampanye terbaru.',
      theme: {
        backgroundColor: '#ffffff',
        buttonColor: '#17191c',
        buttonTextColor: '#ffffff'
      },
      buttons: [],
      views: 0
    };
    db.smartLinks.push(created);
    await store.persist();
    return { data: created };
  });

  app.put('/api/v2/smart-links/links/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<SmartLink>;
    const db = await store.get();
    const link = db.smartLinks.find((s) => s.id === id);
    if (!link) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }
    if (typeof body.title === 'string') link.title = body.title.trim();
    if (typeof body.description === 'string') link.description = body.description.trim();
    if (typeof body.slug === 'string' && body.slug.trim()) {
      link.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    if (body.theme) link.theme = { ...link.theme, ...body.theme };
    if (Array.isArray(body.buttons)) link.buttons = body.buttons;
    await store.persist();
    return { data: link };
  });

  app.get('/api/v2/public/smart-links/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const db = await store.get();
    const link = db.smartLinks.find((s) => s.slug === slug);
    if (!link) {
      reply.code(404);
      return { error: 'Public SmartLink profile not found.' };
    }
    link.views += 1;
    await store.persist();
    return { data: link };
  });

  app.post('/api/v2/public/smart-links/:slug/click', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const body = (req.body ?? {}) as { buttonId?: string };
    const db = await store.get();
    const link = db.smartLinks.find((s) => s.slug === slug);
    if (!link) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }
    const btn = link.buttons.find((b) => b.id === body.buttonId);
    if (btn) {
      btn.clicks += 1;
      await store.persist();
    }
    return { ok: true, clicks: btn?.clicks ?? 0 };
  });

  // ==========================================
  // Advertising
  // ==========================================
  app.get('/api/v2/advertising/campaigns', async (req) => {
    const q = (req.query ?? {}) as { blogId?: string; platform?: string };
    const blogId = parseBlogId(q.blogId);
    const db = await store.get();
    const brand = db.brands.find((b) => b.blogId === blogId);
    const connectedAdPlatforms = (['metaAds', 'googleAds', 'tiktokAds'] as const).filter(
      (p) => brand?.connections[p]?.connected
    );
    let campaigns = db.adCampaigns.filter((c) => c.blogId === blogId);
    if (q.platform && q.platform !== 'ALL') {
      campaigns = campaigns.filter((c) => c.platform === q.platform);
    }
    return {
      data: {
        connectedPlatforms: connectedAdPlatforms,
        campaigns
      }
    };
  });

  app.post('/api/v2/advertising/campaigns', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AdCampaign>;
    if (!body.name?.trim() || !body.platform) {
      reply.code(400);
      return { error: 'Campaign name and platform are required.' };
    }
    const db = await store.get();
    const campaign: AdCampaign = {
      id: randomId('cmp'),
      blogId: parseBlogId(body.blogId),
      platform: body.platform,
      name: body.name.trim(),
      objective: body.objective?.trim() || 'Traffic',
      status: 'ACTIVE',
      dailyBudget: Number(body.dailyBudget) || 25,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0
    };
    db.adCampaigns.unshift(campaign);
    await store.persist();
    return { data: campaign };
  });

  app.patch('/api/v2/advertising/campaigns/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<AdCampaign>;
    const db = await store.get();
    const cmp = db.adCampaigns.find((c) => c.id === id);
    if (!cmp) {
      reply.code(404);
      return { error: 'Campaign not found.' };
    }
    if (body.status === 'ACTIVE' || body.status === 'PAUSED') cmp.status = body.status;
    if (typeof body.dailyBudget === 'number' && body.dailyBudget > 0) cmp.dailyBudget = body.dailyBudget;
    await store.persist();
    return { data: cmp };
  });
}
