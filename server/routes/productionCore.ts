import {
  destroyUserSession,
  getCookieValue,
  getRequestOrigin,
  isHttpsRequest,
  issueUserSession,
  requireUser,
  resolveAuthenticatedUser
} from '../security/authGuard.js';
import {
  buildTotpUri,
  generateTotpSecret,
  hashPassword,
  randomToken,
  sha256Hex,
  verifyPassword,
  verifyTotpCode
} from '../security/crypto.js';
import { sendTransactionalEmail } from '../services/mailer.js';
import {
  publishPostToConnectedNetworks,
  recordInitialMetricSnapshot
} from '../services/oauthAndSocial.js';
import {
  buildEmbedTrackerScript,
  recordBrandWebHit,
  resolveCountryName
} from '../services/trackerScript.js';
import {
  createBrandRecord,
  createCleanUserWorkspace,
  PLAN_QUOTAS
} from '../workspaceTemplate.js';
import type {
  AdCampaign,
  AutoList,
  BeeloftDatabase,
  Brand,
  DailyMetricPoint,
  NetworkKey,
  PlannerPost,
  PlatformRepository,
  ReportArchiveItem,
  RouteRegistry,
  SmartLink,
  UserAccountRow,
  UserProfile
} from '../types.js';

function resolveTargetBlogId(workspace: BeeloftDatabase, raw: unknown): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0 && workspace.brands.some((b) => b.blogId === n && !b.deleted)) {
    return n;
  }
  return workspace.brands.find((b) => !b.deleted)?.blogId ?? 0;
}

function findBrand(workspace: BeeloftDatabase, rawBlogId: unknown): Brand | undefined {
  const id = resolveTargetBlogId(workspace, rawBlogId);
  return workspace.brands.find((b) => b.blogId === id && !b.deleted);
}

function computeBestTimesMatrix(workspace: BeeloftDatabase, blogId: number, network: string): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const published = workspace.plannerPosts.filter(
    (p) => p.blogId === blogId && p.status === 'PUBLISHED' && p.networks.includes(network as NetworkKey)
  );

  for (const p of published) {
    const dt = new Date(p.scheduledAt);
    if (!Number.isNaN(dt.getTime())) {
      const dayIdx = (dt.getUTCDay() + 6) % 7; // Monday = 0
      const hour = dt.getUTCHours();
      matrix[dayIdx][hour] = Math.min(100, matrix[dayIdx][hour] + 25);
    }
  }

  // Baseline practitioner engagement curve when account has fewer than 5 published posts
  if (published.length < 5) {
    for (let day = 0; day < 7; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const workWindow = hour >= 8 && hour <= 21 ? 35 : 8;
        const peakLunch = hour >= 11 && hour <= 13 ? 22 : 0;
        const peakEvening = hour >= 18 && hour <= 20 ? 30 : 0;
        const weekdayBonus = day <= 4 ? 10 : 0;
        matrix[day][hour] = Math.max(
          matrix[day][hour],
          Math.min(100, workWindow + peakLunch + peakEvening + weekdayBonus)
        );
      }
    }
  }
  return matrix;
}

export function registerProductionCoreRoutes(
  app: RouteRegistry,
  repo: PlatformRepository
): void {
  // ==========================================
  // Embeddable Real-Time Web Tracker & Attribution
  // ==========================================
  app.get('/tracker.js', async (req, reply) => {
    const origin = getRequestOrigin(req);
    reply.header('Content-Type', 'application/javascript; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=300');
    reply.header('Access-Control-Allow-Origin', '*');
    return buildEmbedTrackerScript(origin);
  });

  app.post('/s/collect', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const trackingKey = typeof body.trackingKey === 'string' ? body.trackingKey.trim() : '';
    if (!trackingKey) {
      reply.code(400);
      return { error: 'Missing trackingKey.' };
    }

    const brandIdx = await repo.getBrandByTrackingKey(trackingKey);
    if (!brandIdx) {
      reply.code(404);
      return { error: 'Unknown tracking key.' };
    }

    const owner = await repo.getUserById(brandIdx.userId);
    const brand = owner?.workspace.brands.find((b) => b.blogId === brandIdx.blogId && !b.deleted);
    if (!owner || !brand) {
      reply.code(404);
      return { error: 'Target brand unavailable.' };
    }

    const visitorId =
      typeof body.visitorId === 'string' && body.visitorId ? body.visitorId.slice(0, 64) : randomToken('vis', 8);
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId ? body.sessionId.slice(0, 64) : randomToken('ses', 8);
    const rawType = typeof body.eventType === 'string' ? body.eventType : 'pageview';
    const eventType =
      rawType === 'session' || rawType === 'event' || rawType === 'telemetry' ? rawType : 'pageview';

    if (!brand.connections.web.connected) {
      brand.connections.web.connected = true;
      brand.connections.web.accountId = trackingKey;
      brand.connections.web.accountHandle = brand.websiteDomain || 'Live tracker connected';
    }

    const recorded = await recordBrandWebHit({
      repo,
      workspace: owner.workspace,
      brand,
      visitorId,
      sessionId,
      eventType,
      eventName: typeof body.eventName === 'string' ? body.eventName.slice(0, 80) : 'page_view',
      path: typeof body.path === 'string' ? body.path.slice(0, 240) : '/',
      utmSource: typeof body.utmSource === 'string' ? body.utmSource.slice(0, 80) : null,
      utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium.slice(0, 80) : null,
      referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 240) : null,
      countryCode: req.countryCode || req.headers?.['cf-ipcountry'] || null
    });

    await repo.saveUser(owner);
    return { ok: true, eventId: recorded.id };
  });

  app.post('/s/session', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const visitorId =
      (typeof body.visitorId === 'string' && body.visitorId.slice(0, 64)) || randomToken('vis', 8);
    const sessionId = randomToken('ses', 8);
    const nowTs = Math.floor(Date.now() / 1000);
    const authUser = await resolveAuthenticatedUser(req, repo);
    const uidTag = authUser?.userId ?? 0;
    const bmCookie = `BM1$t${nowTs}$u${uidTag}$p1$v${visitorId}$l${nowTs}`;
    const country = resolveCountryName(req.countryCode || req.headers?.['cf-ipcountry']);
    const nowIso = new Date().toISOString();

    const activeBrand = authUser?.workspace.brands.find((b) => !b.deleted);
    if (authUser && activeBrand) {
      await recordBrandWebHit({
        repo,
        workspace: authUser.workspace,
        brand: activeBrand,
        visitorId,
        sessionId,
        eventType: 'session',
        eventName: 'session_init',
        path: typeof body.path === 'string' ? body.path : '/',
        utmSource: typeof body.utmSource === 'string' ? body.utmSource : 'direct',
        utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : 'none',
        referrer: typeof body.referral === 'string' ? body.referral : null,
        countryCode: country.code
      });
      await repo.saveUser(authUser);
    } else {
      await repo.insertWebEvent({
        id: randomToken('wev', 8),
        blogId: 0,
        visitorId,
        sessionId,
        eventType: 'session',
        path: typeof body.path === 'string' ? body.path : '/',
        eventName: 'session_init',
        utmSource: typeof body.utmSource === 'string' ? body.utmSource : 'direct',
        utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : 'none',
        referrer: typeof body.referral === 'string' ? body.referral : null,
        countryCode: country.code,
        countryName: country.name,
        createdAt: nowIso
      });
    }

    reply.setCookie('_bm', bmCookie, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: isHttpsRequest(req),
      maxAge: 365 * 86400
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
    const body = (req.body ?? {}) as Record<string, unknown>;
    const visitorId =
      typeof body.visitorId === 'string' && body.visitorId ? body.visitorId.slice(0, 64) : 'vis-anon';
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId ? body.sessionId.slice(0, 64) : 'ses-anon';
    const country = resolveCountryName(req.countryCode || req.headers?.['cf-ipcountry']);
    const authUser = await resolveAuthenticatedUser(req, repo);
    const activeBrand = authUser?.workspace.brands.find((b) => !b.deleted);

    if (authUser && activeBrand) {
      const ev = await recordBrandWebHit({
        repo,
        workspace: authUser.workspace,
        brand: activeBrand,
        visitorId,
        sessionId,
        eventType: 'event',
        eventName: typeof body.eventName === 'string' ? body.eventName : 'route_view',
        path: typeof body.path === 'string' ? body.path : '/',
        utmSource: typeof body.utmSource === 'string' ? body.utmSource : null,
        utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : null,
        referrer: typeof body.referral === 'string' ? body.referral : null,
        countryCode: country.code
      });
      await repo.saveUser(authUser);
      return { ok: true, id: ev.id };
    }

    const id = randomToken('wev', 8);
    await repo.insertWebEvent({
      id,
      blogId: 0,
      visitorId,
      sessionId,
      eventType: 'event',
      path: typeof body.path === 'string' ? body.path : '/',
      eventName: typeof body.eventName === 'string' ? body.eventName : 'route_view',
      utmSource: typeof body.utmSource === 'string' ? body.utmSource : null,
      utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : null,
      referrer: typeof body.referral === 'string' ? body.referral : null,
      countryCode: country.code,
      countryName: country.name,
      createdAt: new Date().toISOString()
    });
    return { ok: true, id };
  });

  app.post('/p', async (req) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : 'vis-anon';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : 'ses-anon';
    const country = resolveCountryName(req.countryCode || req.headers?.['cf-ipcountry']);
    const id = randomToken('wev', 8);
    await repo.insertWebEvent({
      id,
      blogId: 0,
      visitorId,
      sessionId,
      eventType: 'telemetry',
      path: typeof body.path === 'string' ? body.path : '/',
      eventName: typeof body.eventName === 'string' ? body.eventName : 'product_action',
      utmSource: null,
      utmMedium: null,
      referrer: null,
      countryCode: country.code,
      countryName: country.name,
      createdAt: new Date().toISOString()
    });
    return { ok: true, id };
  });

  app.get('/s/apvid/:vid', async (req) => {
    const { vid } = req.params as { vid: string };
    const rows = await repo.listVisitorEvents(vid, 50);
    return {
      visitorId: vid,
      events: rows.map((r) => ({
        id: r.id,
        visitorId: r.visitorId,
        sessionId: r.sessionId,
        type: r.eventType,
        path: r.path,
        eventName: r.eventName,
        utmSource: r.utmSource,
        utmMedium: r.utmMedium,
        referral: r.referrer,
        timestamp: r.createdAt
      }))
    };
  });

  app.get('/api/v2/attribution/recent', async (req) => {
    const authUser = await resolveAuthenticatedUser(req, repo);
    if (authUser) {
      return { data: authUser.workspace.attributionEvents.slice(0, 15) };
    }
    const q = (req.query ?? {}) as { visitorId?: string };
    const bmCookie = getCookieValue(req, '_bm') || '';
    const cookieVidMatch = bmCookie.match(/\$v([^$]+)/);
    const visitorId = q.visitorId || cookieVidMatch?.[1] || '';
    if (!visitorId) return { data: [] };
    const rows = await repo.listVisitorEvents(visitorId, 15);
    return {
      data: rows.map((r) => ({
        id: r.id,
        visitorId: r.visitorId,
        sessionId: r.sessionId,
        type: r.eventType === 'session' ? 'session' : r.eventType === 'telemetry' ? 'telemetry' : 'event',
        path: r.path,
        eventName: r.eventName,
        utmSource: r.utmSource,
        utmMedium: r.utmMedium,
        referral: r.referrer,
        timestamp: r.createdAt
      }))
    };
  });

  // ==========================================
  // Healthcheck, Readiness & Multi-User Authentication
  // ==========================================
  app.get('/api/admin/healthcheck', async () => true);

  app.get('/api/v2/system/readiness', async (req) => {
    const env = req.env;
    return {
      ok: true,
      domain: 'beeloftmetric.biz.id',
      storageDriver: repo.driver,
      d1Bound: Boolean(env?.DB),
      r2Bound: Boolean(env?.MEDIA_BUCKET),
      aiBound: Boolean(env?.AI || env?.GEMINI_API_KEY || env?.OPENAI_API_KEY),
      emailConfigured: Boolean(env?.RESEND_API_KEY || env?.MAILCHANNELS_API_KEY || env?.SMTP_RELAY_URL),
      billingProviders: {
        midtrans: Boolean(env?.MIDTRANS_SERVER_KEY),
        stripe: Boolean(env?.STRIPE_SECRET_KEY)
      }
    };
  });

  app.get('/api/admin/userstatus', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    await repo.incrementApiCallCounter();

    const meta = await repo.getGlobalMeta();
    const { passwordHash: _ignored, ...safeUser } = user.workspace.user;
    return {
      ...safeUser,
      emailVerified: user.emailVerified,
      role: user.role,
      features: {
        ...meta.featureFlags,
        ...user.workspace.user.features,
        ENABLE_BACKOFFICE: user.role === 'ADMIN'
      },
      brands: user.workspace.brands
        .filter((b) => !b.deleted)
        .map((b) => ({
          blogId: b.blogId,
          userId: user.userId,
          name: b.name,
          timezone: b.timezone,
          currency: b.currency,
          isSample: false,
          trackingKey: b.trackingKey,
          connectionsCount: Object.values(b.connections).filter((c) => c.connected).length
        }))
    };
  });

  app.post('/api/v2/auth/register', async (req, reply) => {
    const body = (req.body ?? {}) as {
      name?: string;
      email?: string;
      password?: string;
      plan?: UserProfile['plan'];
      referralCode?: string;
    };
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const password = body.password || '';

    if (!name || name.length < 2) {
      reply.code(400);
      return { error: 'Full name must contain at least 2 characters.' };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reply.code(400);
      return { error: 'Please provide a valid email address.' };
    }
    if (password.length < 6) {
      reply.code(400);
      return { error: 'Password must contain at least 6 characters.' };
    }

    const existing = await repo.getUserByEmail(email);
    if (existing) {
      reply.code(409);
      return { error: 'An account with this email address already exists. Please sign in.' };
    }

    const existingCount = await repo.countUsers();
    const adminEmail = req.env?.ADMIN_EMAIL?.trim().toLowerCase();
    const isAdmin = existingCount === 0 || Boolean(adminEmail && adminEmail === email);

    const { userId, blogId } = await repo.allocateIds();
    const { hashHex, saltHex } = await hashPassword(password);
    const apiToken = `bm_live_${userId}_${randomToken('', 12)}`;
    const verificationToken = randomToken('vrf', 18);
    const origin = getRequestOrigin(req);

    // New public accounts always start on FREE until paid checkout completes (unless first admin)
    const initialPlan: UserProfile['plan'] = isAdmin ? 'ENTERPRISE_CUSTOM' : 'FREE';

    const workspace = createCleanUserWorkspace({
      userId,
      blogId,
      email,
      name,
      apiToken,
      plan: initialPlan,
      isAdmin,
      emailVerified: false,
      origin
    });

    const nowIso = new Date().toISOString();
    const newUser: UserAccountRow = {
      userId,
      email,
      name,
      passwordHash: hashHex,
      passwordSalt: saltHex,
      apiToken,
      totpSecret: null,
      totpEnabled: false,
      plan: initialPlan,
      status: 'ACTIVE',
      emailVerified: false,
      verificationToken,
      role: isAdmin ? 'ADMIN' : 'USER',
      workspace,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await repo.saveUser(newUser);

    // Credit affiliate signup if referral code matches BM<id>
    if (body.referralCode && /^BM\d+$/i.test(body.referralCode.trim())) {
      const refUid = Number(body.referralCode.trim().slice(2));
      if (refUid && refUid !== userId) {
        const refOwner = await repo.getUserById(refUid);
        if (refOwner) {
          refOwner.workspace.affiliation.signups += 1;
          await repo.saveUser(refOwner);
        }
      }
    }

    const verifyUrl = `${origin}/activate-user?token=${encodeURIComponent(verificationToken)}`;
    const emailDelivery = await sendTransactionalEmail(req.env, {
      to: email,
      subject: 'Verify your BeeloftMetric account',
      text: `Welcome to BeeloftMetric, ${name}.\n\nVerify your email address by opening:\n${verifyUrl}`,
      html: `<p>Welcome to <strong>BeeloftMetric</strong>, ${name}.</p><p><a href="${verifyUrl}">Verify your email address</a> to confirm account ownership.</p>`
    });

    await issueUserSession({ repo, req, reply, userId });
    const { passwordHash: _ignored, ...safeUser } = workspace.user;
    return {
      ok: true,
      user: safeUser,
      primaryBlogId: blogId,
      requestedUpgradePlan: body.plan && body.plan !== 'FREE' ? body.plan : null,
      emailDelivery
    };
  });

  app.post('/api/v2/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string; password?: string; totpCode?: string };
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      reply.code(400);
      return { error: 'Email and password are required.' };
    }

    const user = await repo.getUserByEmail(email);
    if (!user) {
      reply.code(401);
      return { error: 'Invalid email address or password.' };
    }
    if (user.status !== 'ACTIVE') {
      reply.code(403);
      return { error: 'This account is currently suspended.' };
    }

    const validPwd = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!validPwd) {
      reply.code(401);
      return { error: 'Invalid email address or password.' };
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!body.totpCode) {
        return { ok: false, requiresTwoFactor: true };
      }
      const validOtp = await verifyTotpCode(user.totpSecret, body.totpCode);
      if (!validOtp) {
        reply.code(401);
        return { error: 'Invalid two-factor authentication code.' };
      }
    }

    await issueUserSession({ repo, req, reply, userId: user.userId });
    const primaryBlogId = user.workspace.brands.find((b) => !b.deleted)?.blogId ?? 0;
    const { passwordHash: _ignored, ...safeUser } = user.workspace.user;
    return { ok: true, user: safeUser, primaryBlogId };
  });

  app.post('/api/v2/auth/logout', async (req, reply) => {
    await destroyUserSession({ repo, req, reply });
    return { ok: true };
  });

  app.post('/api/v2/auth/verify-email', async (req, reply) => {
    const body = (req.body ?? {}) as { token?: string };
    if (!body.token?.trim()) {
      reply.code(400);
      return { error: 'Verification token is required.' };
    }
    const user = await repo.getUserByVerificationToken(body.token.trim());
    if (!user) {
      reply.code(400);
      return { error: 'Invalid or already used verification link.' };
    }
    user.emailVerified = true;
    user.verificationToken = null;
    await repo.saveUser(user);
    return { ok: true, email: user.email };
  });

  app.post('/api/v2/auth/forgot-password', async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string };
    const email = (body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      reply.code(400);
      return { error: 'Please enter a valid email address.' };
    }

    const user = await repo.getUserByEmail(email);
    if (!user) {
      // Avoid account enumeration
      return { ok: true, message: 'If an account matches that email, a reset link has been dispatched.' };
    }

    const rawToken = randomToken('rst', 24);
    const tokenHash = await sha256Hex(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString();

    await repo.createPasswordReset({
      tokenHash,
      userId: user.userId,
      expiresAt,
      used: false,
      createdAt: now.toISOString()
    });

    const origin = getRequestOrigin(req);
    const resetUrl = `${origin}/new-password?token=${encodeURIComponent(rawToken)}`;
    const delivery = await sendTransactionalEmail(req.env, {
      to: user.email,
      subject: 'Reset your BeeloftMetric password',
      text: `Reset your password within 60 minutes:\n${resetUrl}`,
      html: `<p>A password reset was requested for your BeeloftMetric account.</p><p><a href="${resetUrl}">Set a new password</a> (valid for 60 minutes).</p>`
    });

    return {
      ok: true,
      emailDelivered: delivery.delivered,
      provider: delivery.provider,
      message: 'If an account matches that email, a reset link has been dispatched.'
    };
  });

  app.post('/api/v2/auth/reset-password', async (req, reply) => {
    const body = (req.body ?? {}) as { token?: string; newPassword?: string };
    if (!body.token?.trim() || !body.newPassword || body.newPassword.length < 6) {
      reply.code(400);
      return { error: 'Valid reset token and a new password (min 6 characters) are required.' };
    }

    const tokenHash = await sha256Hex(body.token.trim());
    const resetRow = await repo.getPasswordReset(tokenHash);
    if (!resetRow || resetRow.used || resetRow.expiresAt <= new Date().toISOString()) {
      reply.code(400);
      return { error: 'This password reset link is invalid or has expired.' };
    }

    const user = await repo.getUserById(resetRow.userId);
    if (!user) {
      reply.code(404);
      return { error: 'Account not found.' };
    }

    const { hashHex, saltHex } = await hashPassword(body.newPassword);
    user.passwordHash = hashHex;
    user.passwordSalt = saltHex;
    await repo.saveUser(user);
    await repo.markPasswordResetUsed(tokenHash);
    await repo.deleteUserSessions(user.userId);

    return { ok: true };
  });

  app.post('/api/v2/auth/accept-invite', async (req, reply) => {
    const body = (req.body ?? {}) as { token?: string; password?: string };
    if (!body.token?.trim() || !body.password || body.password.length < 6) {
      reply.code(400);
      return { error: 'Invitation token and password (min 6 characters) are required.' };
    }

    const inv = await repo.getInvitation(body.token.trim());
    if (!inv || inv.status === 'ACCEPTED') {
      reply.code(400);
      return { error: 'Invitation token is invalid or has already been accepted.' };
    }

    const owner = await repo.getUserById(inv.ownerUserId);
    if (owner) {
      const member = owner.workspace.teamMembers.find(
        (m) => m.email.toLowerCase() === inv.email.toLowerCase()
      );
      if (member) member.status = 'ACTIVE';
      await repo.saveUser(owner);
    }
    await repo.markInvitationAccepted(inv.token);

    let collaborator = await repo.getUserByEmail(inv.email);
    if (!collaborator) {
      const { userId, blogId } = await repo.allocateIds();
      const { hashHex, saltHex } = await hashPassword(body.password);
      const apiToken = `bm_live_${userId}_${randomToken('', 12)}`;
      const workspace = createCleanUserWorkspace({
        userId,
        blogId,
        email: inv.email,
        name: inv.name,
        apiToken,
        plan: 'FREE',
        isAdmin: false,
        emailVerified: true,
        origin: getRequestOrigin(req)
      });
      const nowIso = new Date().toISOString();
      collaborator = {
        userId,
        email: inv.email.toLowerCase(),
        name: inv.name,
        passwordHash: hashHex,
        passwordSalt: saltHex,
        apiToken,
        totpSecret: null,
        totpEnabled: false,
        plan: 'FREE',
        status: 'ACTIVE',
        emailVerified: true,
        verificationToken: null,
        role: 'USER',
        workspace,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await repo.saveUser(collaborator);
    }

    await issueUserSession({ repo, req, reply, userId: collaborator.userId });
    const primaryBlogId = collaborator.workspace.brands.find((b) => !b.deleted)?.blogId ?? 0;
    return { ok: true, primaryBlogId };
  });

  app.patch('/api/v2/settings/users/profile', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };

    const body = (req.body ?? {}) as { name?: string; email?: string; currentPassword?: string; newPassword?: string };
    if (typeof body.name === 'string' && body.name.trim().length >= 2) {
      user.name = body.name.trim();
    }
    if (typeof body.email === 'string' && body.email.includes('@')) {
      const nextEmail = body.email.trim().toLowerCase();
      if (nextEmail !== user.email) {
        const conflict = await repo.getUserByEmail(nextEmail);
        if (conflict && conflict.userId !== user.userId) {
          reply.code(409);
          return { error: 'That email address is already registered to another account.' };
        }
        user.email = nextEmail;
      }
    }
    if (body.newPassword) {
      if (!body.currentPassword) {
        reply.code(400);
        return { error: 'Current password is required to set a new password.' };
      }
      const valid = await verifyPassword(body.currentPassword, user.passwordHash, user.passwordSalt);
      if (!valid) {
        reply.code(401);
        return { error: 'Current password is incorrect.' };
      }
      if (body.newPassword.length < 6) {
        reply.code(400);
        return { error: 'New password must be at least 6 characters.' };
      }
      const { hashHex, saltHex } = await hashPassword(body.newPassword);
      user.passwordHash = hashHex;
      user.passwordSalt = saltHex;
    }

    await repo.saveUser(user);
    const { passwordHash: _ignored, ...safeUser } = user.workspace.user;
    return { data: safeUser };
  });

  app.get('/api/v2/settings/users/location-from-ip', async (req) => {
    const country = resolveCountryName(req.countryCode || req.headers?.['cf-ipcountry'] || 'ID');
    return { data: { countryCode: country.code, countryName: country.name } };
  });

  app.get('/api/v2/features/check-all', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const meta = await repo.getGlobalMeta();
    return {
      data: {
        ...meta.featureFlags,
        ...user.workspace.user.features,
        ENABLE_BACKOFFICE: user.role === 'ADMIN'
      }
    };
  });

  app.get('/api/v2/authorization/authorities', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.user.authorities };
  });

  app.get('/api/v2/notifications', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.notifications };
  });

  app.post('/api/v2/notifications/:id/read', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const n = user.workspace.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      await repo.saveUser(user);
    }
    return { ok: true };
  });

  // ==========================================
  // Brands & Connections (Multi-Tenant + Plan Quotas)
  // ==========================================
  app.get('/api/v2/brands', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return {
      data: user.workspace.brands
        .filter((b) => !b.deleted)
        .map((b) => ({
          blogId: b.blogId,
          userId: user.userId,
          name: b.name,
          timezone: b.timezone,
          currency: b.currency,
          isSample: false,
          trackingKey: b.trackingKey,
          websiteDomain: b.websiteDomain || '',
          connectionsCount: Object.values(b.connections).filter((c) => c.connected).length
        }))
    };
  });

  app.post('/api/v2/brands', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };

    const body = (req.body ?? {}) as { name?: string; timezone?: string; currency?: string };
    const name = body.name?.trim();
    if (!name) {
      reply.code(400);
      return { error: 'Brand name is required.' };
    }

    const quota = PLAN_QUOTAS[user.plan];
    const activeCount = user.workspace.brands.filter((b) => !b.deleted).length;
    if (activeCount >= quota.brandLimit) {
      reply.code(403);
      return {
        error: `Your ${quota.label} plan includes up to ${quota.brandLimit} brand(s). Upgrade your subscription in User Settings to add more brands.`
      };
    }

    const blogId = await repo.allocateBlogId();
    const created = createBrandRecord({
      blogId,
      userId: user.userId,
      name,
      timezone: body.timezone || 'Asia/Jakarta',
      currency: body.currency || 'IDR'
    });
    user.workspace.brands.push(created);
    await repo.saveUser(user);
    return { data: created };
  });

  app.patch('/api/v2/brands/:blogId', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { blogId } = req.params as { blogId: string };
    const brand = findBrand(user.workspace, blogId);
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    const body = (req.body ?? {}) as { name?: string; timezone?: string; currency?: string; websiteDomain?: string };
    if (typeof body.name === 'string' && body.name.trim()) brand.name = body.name.trim();
    if (typeof body.timezone === 'string' && body.timezone.trim()) brand.timezone = body.timezone.trim();
    if (typeof body.currency === 'string' && body.currency.trim()) brand.currency = body.currency.trim();
    if (typeof body.websiteDomain === 'string') brand.websiteDomain = body.websiteDomain.trim();
    await repo.saveUser(user);
    return { data: brand };
  });

  app.get('/api/v2/settings/brands/connections', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const brand = findBrand(user.workspace, q.blogId);
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }
    return {
      data: Object.values(brand.connections),
      trackingKey: brand.trackingKey,
      websiteDomain: brand.websiteDomain || ''
    };
  });

  app.get('/api/v2/settings/brands/connections/:network/last-connection', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { network } = req.params as { network: NetworkKey };
    const q = (req.query ?? {}) as { blogId?: string };
    const brand = findBrand(user.workspace, q.blogId);
    const conn = brand?.connections[network];
    if (!conn || !conn.connected) return { data: {} };
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
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };

    const { network } = req.params as { network: NetworkKey };
    const q = (req.query ?? {}) as { blogId?: string };
    const body = (req.body ?? {}) as {
      blogId?: number;
      handle?: string;
      accessToken?: string;
      accountId?: string;
      connect?: boolean;
    };
    const brand = findBrand(user.workspace, body.blogId ?? q.blogId);
    if (!brand || !brand.connections[network]) {
      reply.code(404);
      return { error: 'Brand or network not found.' };
    }

    const target = brand.connections[network];
    const shouldConnect = typeof body.connect === 'boolean' ? body.connect : !target.connected;
    const nowIso = new Date().toISOString();

    if (shouldConnect) {
      const cleanHandle =
        body.handle?.trim() ||
        (network === 'web' ? brand.websiteDomain || 'website' : `@${brand.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      target.connected = true;
      target.accountHandle = cleanHandle;
      target.accountId = body.accountId?.trim() || (network === 'web' ? brand.trackingKey || `web-${brand.blogId}` : `${network}-${randomToken('', 4)}`);
      target.lastSync = nowIso;

      if (network === 'web') {
        brand.websiteDomain = cleanHandle.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      }

      if (body.accessToken?.trim()) {
        await repo.saveOAuthCredential({
          blogId: brand.blogId,
          userId: user.userId,
          network,
          accessToken: body.accessToken.trim(),
          refreshToken: null,
          expiresAt: null,
          accountId: target.accountId,
          accountHandle: cleanHandle,
          updatedAt: nowIso
        });
      }

      // Honest zero-baseline metric initialization (never fabricates fake sine-wave numbers)
      recordInitialMetricSnapshot(user.workspace, brand, network, 0);
    } else {
      target.connected = false;
      target.accountHandle = null;
      target.accountId = null;
      target.lastSync = null;
      await repo.deleteOAuthCredential(brand.blogId, network);
    }

    await repo.saveUser(user);
    return { data: target };
  });

  // ==========================================
  // Analytics / Evolution & Hashtags
  // ==========================================
  app.get('/api/v2/evolution/summary', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };

    const q = (req.query ?? {}) as { blogId?: string; network?: string; days?: string };
    const brand = findBrand(user.workspace, q.blogId);
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
            isSample: false,
            periodLabel: `Last ${days} days`,
            comparisonPeriodLabel: `Previous ${days} days`,
            connectedCount: 0,
            kpis: [],
            series: [],
            topPosts: []
          }
        };
      }

      const brandSeriesMap = user.workspace.metricsSeries[String(brand.blogId)] ?? {};
      const allDates = new Map<string, DailyMetricPoint>();

      // Ensure continuous date window for clean chart rendering with real 0s where no events arrived
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        allDates.set(d, { date: d, impressions: 0, reach: 0, followers: 0, interactions: 0, clicks: 0 });
      }

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
      const latestFollowers = slice.reduce((mx, pt) => Math.max(mx, pt.followers), 0);
      const firstFollowers = slice.length ? slice[0].followers : 0;
      const followersDelta = latestFollowers - firstFollowers;

      const prevImpr = sumField(prevSlice, 'impressions');
      const imprPct =
        prevImpr > 0 ? (((totalImpr - prevImpr) / prevImpr) * 100).toFixed(1) : '0.0';
      const denominator = brand.engagementRatioMode === 'FOLLOWERS' ? latestFollowers : totalReach;
      const engagementRate = denominator > 0 ? ((totalInter / denominator) * 100).toFixed(2) : '0.00';

      return {
        data: {
          connected: true,
          network,
          brandName: brand.name,
          isSample: false,
          periodLabel: `Last ${days} days`,
          comparisonPeriodLabel: `Previous ${days} days`,
          connectedCount: connectedNetworks.length,
          kpis: [
            {
              id: 'impressions',
              label: 'Total Impressions',
              value: totalImpr,
              deltaText:
                prevImpr > 0
                  ? `${Number(imprPct) >= 0 ? '+' : ''}${imprPct}% vs previous ${days} days`
                  : `Recorded over last ${days} days`
            },
            {
              id: 'reach',
              label: 'Total Reach',
              value: totalReach,
              deltaText: `Across ${connectedNetworks.length} connected channel(s)`
            },
            {
              id: 'followers',
              label: 'Audience / Visitors',
              value: latestFollowers,
              deltaText: `${followersDelta >= 0 ? '+' : ''}${followersDelta} net in last ${days} days`
            },
            {
              id: 'engagement',
              label: 'Engagement Rate',
              value: `${engagementRate}%`,
              deltaText: `${totalInter} recorded interactions`
            }
          ],
          series: slice,
          topPosts: user.workspace.topPosts.filter((p) => p.blogId === brand.blogId)
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
          isSample: false,
          periodLabel: `Last ${days} days`,
          comparisonPeriodLabel: `Previous ${days} days`,
          kpis: [],
          series: [],
          topPosts: []
        }
      };
    }

    const dateMap = new Map<string, DailyMetricPoint>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dateMap.set(d, { date: d, impressions: 0, reach: 0, followers: 0, interactions: 0, clicks: 0 });
    }
    for (const pt of user.workspace.metricsSeries[String(brand.blogId)]?.[network] ?? []) {
      dateMap.set(pt.date, { ...pt });
    }
    const netSeries = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    const totalImpr = netSeries.reduce((s, p) => s + p.impressions, 0);
    const totalReach = netSeries.reduce((s, p) => s + p.reach, 0);
    const totalInter = netSeries.reduce((s, p) => s + p.interactions, 0);
    const latestFollowers = netSeries.reduce((mx, p) => Math.max(mx, p.followers), 0);
    const engagementRate = totalReach > 0 ? ((totalInter / totalReach) * 100).toFixed(2) : '0.00';

    return {
      data: {
        connected: true,
        network,
        networkLabel: targetConn.label,
        accountHandle: targetConn.accountHandle,
        brandName: brand.name,
        isSample: false,
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
            label: network === 'web' ? 'Unique Visitors' : 'Accounts Reached',
            value: totalReach,
            deltaText: `${targetConn.accountHandle}`
          },
          {
            id: 'followers',
            label: network === 'web' ? 'Tracked Visitors' : 'Followers',
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
        topPosts: user.workspace.topPosts.filter((p) => p.blogId === brand.blogId && p.network === network)
      }
    };
  });

  app.get('/api/v2/hashtags/historical', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    return { data: user.workspace.hashtags.filter((h) => h.blogId === blogId) };
  });

  app.post('/api/v2/hashtags/historical', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as {
      blogId?: number;
      hashtag?: string;
      network?: 'instagram' | 'twitter' | 'tiktok';
    };
    const blogId = resolveTargetBlogId(user.workspace, body.blogId);
    const cleanTag = body.hashtag?.trim().replace(/^#?/, '#');
    if (!cleanTag || cleanTag.length < 2) {
      reply.code(400);
      return { error: 'Hashtag cannot be empty.' };
    }
    const matchingPosts = user.workspace.plannerPosts.filter(
      (p) => p.blogId === blogId && p.text.toLowerCase().includes(cleanTag.toLowerCase())
    ).length;

    const created = {
      id: randomToken('ht', 4),
      blogId,
      hashtag: cleanTag,
      network: body.network || 'instagram',
      postsCount: matchingPosts,
      impressions: 0,
      trackedAt: new Date().toISOString()
    };
    user.workspace.hashtags.unshift(created);
    await repo.saveUser(user);
    return { data: created };
  });

  // ==========================================
  // Reports & Downloads (Plan Quota Enforced)
  // ==========================================
  app.get('/api/v2/reports/templates/system', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.systemTemplates };
  });

  app.get('/api/v2/reports/templates/custom', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    return { data: user.workspace.customTemplates };
  });

  app.post('/api/v2/reports/templates/custom', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { name?: string; description?: string; sections?: string[] };
    if (!body.name?.trim()) {
      reply.code(400);
      return { error: 'Template name is required.' };
    }
    const tpl = {
      id: randomToken('tpl', 4),
      name: body.name.trim(),
      description: body.description?.trim() || 'Custom report layout',
      kind: 'custom' as const,
      sections: body.sections?.length ? body.sections : ['Brand Summary KPIs', 'Top Posts']
    };
    user.workspace.customTemplates.unshift(tpl);
    await repo.saveUser(user);
    return { data: tpl };
  });

  app.get('/api/v2/reports/history', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    return { data: user.workspace.reportsHistory.filter((r) => r.blogId === blogId) };
  });

  app.post('/api/v2/reports/generate', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };

    const body = (req.body ?? {}) as {
      blogId?: number;
      title?: string;
      templateId?: string;
      format?: 'PDF' | 'PPTX';
      dateFrom?: string;
      dateTo?: string;
    };
    if (user.plan === 'FREE') {
      reply.code(403);
      return { error: 'Report exports require Starter plan or higher. Upgrade in Subscription & Plan.' };
    }
    if (body.format === 'PPTX' && !PLAN_QUOTAS[user.plan].allowPptxExport) {
      reply.code(403);
      return { error: 'PPTX deck exports require Advanced or Enterprise plan.' };
    }

    const brand = findBrand(user.workspace, body.blogId);
    if (!brand) {
      reply.code(404);
      return { error: 'Brand not found.' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const from = body.dateFrom || thirtyAgo;
    const to = body.dateTo || today;

    const brandSeries = Object.values(user.workspace.metricsSeries[String(brand.blogId)] ?? {})
      .flat()
      .filter((pt) => pt.date >= from && pt.date <= to);
    const impressions = brandSeries.reduce((s, p) => s + p.impressions, 0);
    const reach = brandSeries.reduce((s, p) => s + p.reach, 0);
    const maxFollowers = brandSeries.reduce((mx, p) => Math.max(mx, p.followers), 0);
    const minFollowers = brandSeries.length ? brandSeries[0].followers : 0;
    const postsPublished = user.workspace.plannerPosts.filter(
      (p) => p.blogId === brand.blogId && p.status === 'PUBLISHED'
    ).length;

    const report: ReportArchiveItem = {
      id: randomToken('rep', 4),
      blogId: brand.blogId,
      title: body.title?.trim() || `${brand.name} Performance Report`,
      templateId: body.templateId || 'tpl-monthly',
      format: body.format === 'PPTX' ? 'PPTX' : 'PDF',
      dateFrom: from,
      dateTo: to,
      createdAt: new Date().toISOString(),
      status: 'READY',
      summaryMetrics: {
        impressions,
        reach,
        followersDelta: maxFollowers - minFollowers,
        postsPublished
      }
    };
    user.workspace.reportsHistory.unshift(report);
    await repo.saveUser(user);
    return { data: report };
  });

  app.get('/api/v2/reports/:id/download', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const report = user.workspace.reportsHistory.find((r) => r.id === id);
    if (!report) {
      reply.code(404);
      return { error: 'Report not found.' };
    }
    const brand = findBrand(user.workspace, report.blogId);
    const headerTitle =
      brand?.whiteLabel.enabled && brand.whiteLabel.logoText
        ? brand.whiteLabel.logoText
        : 'BeeloftMetric Analytics Export';
    const text = [
      headerTitle,
      `Report Title: ${report.title}`,
      `Format: ${report.format}`,
      `Date Window: ${report.dateFrom} to ${report.dateTo}`,
      `Generated At: ${report.createdAt}`,
      `Total Impressions: ${report.summaryMetrics.impressions}`,
      `Total Reach: ${report.summaryMetrics.reach}`,
      `Audience Net Change: ${report.summaryMetrics.followersDelta}`,
      `Published Posts: ${report.summaryMetrics.postsPublished}`,
      brand?.whiteLabel.enabled && brand.whiteLabel.footerNote ? `\n${brand.whiteLabel.footerNote}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${report.id}.txt"`);
    return text;
  });

  // ==========================================
  // Unified Inbox
  // ==========================================
  app.get('/api/v2/inbox/threads', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string; status?: string; network?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    let threads = user.workspace.inboxThreads.filter((t) => t.blogId === blogId);
    if (q.status && q.status !== 'ALL') {
      threads = threads.filter((t) => t.status === q.status);
    }
    if (q.network && q.network !== 'ALL') {
      threads = threads.filter((t) => t.network === q.network);
    }
    return { data: threads };
  });

  app.post('/api/v2/inbox/threads/:id/messages', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { text?: string };
    if (!body.text?.trim()) {
      reply.code(400);
      return { error: 'Reply message cannot be empty.' };
    }
    const thread = user.workspace.inboxThreads.find((t) => t.id === id);
    if (!thread) {
      reply.code(404);
      return { error: 'Conversation thread not found.' };
    }
    const msg = {
      id: randomToken('msg', 4),
      sender: 'operator' as const,
      authorName: user.name,
      text: body.text.trim(),
      sentAt: new Date().toISOString()
    };
    thread.messages.push(msg);
    thread.status = 'PENDING';
    thread.updatedAt = msg.sentAt;
    await repo.saveUser(user);
    return { data: thread };
  });

  app.patch('/api/v2/inbox/threads/:id/status', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { status?: 'UNREAD' | 'PENDING' | 'RESOLVED' };
    const thread = user.workspace.inboxThreads.find((t) => t.id === id);
    if (!thread || !body.status) {
      reply.code(404);
      return { error: 'Thread not found or status missing.' };
    }
    thread.status = body.status;
    await repo.saveUser(user);
    return { data: thread };
  });

  // ==========================================
  // Planner, Publishing, AutoLists & Best Times
  // ==========================================
  app.get('/api/v2/planner/posts', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    const posts = user.workspace.plannerPosts
      .filter((p) => p.blogId === blogId)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return { data: posts };
  });

  app.post('/api/v2/planner/posts', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<PlannerPost>;
    if (!body.text?.trim() || !body.scheduledAt || !body.networks?.length) {
      reply.code(400);
      return { error: 'Post copy, schedule date/time, and at least one network are required.' };
    }

    const quota = PLAN_QUOTAS[user.plan];
    if (quota.monthlyScheduledPostLimit !== null) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyCount = user.workspace.plannerPosts.filter((p) =>
        p.scheduledAt.startsWith(currentMonth)
      ).length;
      if (monthlyCount >= quota.monthlyScheduledPostLimit) {
        reply.code(403);
        return {
          error: `Monthly post limit (${quota.monthlyScheduledPostLimit}) reached on ${quota.label} plan. Upgrade to schedule more posts.`
        };
      }
    }

    const blogId = resolveTargetBlogId(user.workspace, body.blogId);
    const post: PlannerPost = {
      id: randomToken('pln', 4),
      blogId,
      scheduledAt: body.scheduledAt,
      text: body.text.trim(),
      firstComment: body.firstComment?.trim() || '',
      media: Array.isArray(body.media) ? body.media : [],
      networks: body.networks,
      status: body.status || 'SCHEDULED',
      notes: body.notes?.trim() || ''
    };
    user.workspace.plannerPosts.push(post);
    await repo.saveUser(user);
    return { data: post };
  });

  app.patch('/api/v2/planner/posts/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<PlannerPost>;
    const post = user.workspace.plannerPosts.find((p) => p.id === id);
    if (!post) {
      reply.code(404);
      return { error: 'Scheduled post not found.' };
    }
    if (typeof body.text === 'string') post.text = body.text.trim();
    if (typeof body.scheduledAt === 'string') post.scheduledAt = body.scheduledAt;
    if (typeof body.firstComment === 'string') post.firstComment = body.firstComment;
    if (Array.isArray(body.networks) && body.networks.length) post.networks = body.networks;
    if (Array.isArray(body.media)) post.media = body.media;

    if (body.status === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      await publishPostToConnectedNetworks({
        repo,
        workspace: user.workspace,
        post
      });
    } else if (typeof body.status === 'string') {
      post.status = body.status;
    }

    await repo.saveUser(user);
    return { data: post };
  });

  app.delete('/api/v2/planner/posts/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const idx = user.workspace.plannerPosts.findIndex((p) => p.id === id);
    if (idx === -1) {
      reply.code(404);
      return { error: 'Scheduled post not found.' };
    }
    const [removed] = user.workspace.plannerPosts.splice(idx, 1);
    user.workspace.deletedPosts.unshift({ ...removed, deletedAt: new Date().toISOString() });
    await repo.saveUser(user);
    return { ok: true };
  });

  app.get('/api/v2/planner/best-times', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string; network?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    const network = q.network || 'instagram';
    return {
      data: {
        network,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        matrix: computeBestTimesMatrix(user.workspace, blogId, network)
      }
    };
  });

  app.get('/api/v2/planner/autolists', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    return { data: user.workspace.autolists.filter((a) => a.blogId === blogId) };
  });

  app.post('/api/v2/planner/autolists', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<AutoList>;
    if (!body.name?.trim()) {
      reply.code(400);
      return { error: 'AutoList name is required.' };
    }
    const blogId = resolveTargetBlogId(user.workspace, body.blogId);
    const item: AutoList = {
      id: randomToken('al', 4),
      blogId,
      name: body.name.trim(),
      active: true,
      networks: body.networks?.length ? body.networks : ['instagram'],
      scheduleRule: body.scheduleRule?.trim() || 'Every Wednesday at 10:00',
      postsCount: 0
    };
    user.workspace.autolists.unshift(item);
    await repo.saveUser(user);
    return { data: item };
  });

  app.patch('/api/v2/planner/autolists/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<AutoList>;
    const item = user.workspace.autolists.find((a) => a.id === id);
    if (!item) {
      reply.code(404);
      return { error: 'AutoList not found.' };
    }
    if (typeof body.active === 'boolean') item.active = body.active;
    if (typeof body.name === 'string') item.name = body.name.trim();
    await repo.saveUser(user);
    return { data: item };
  });

  // ==========================================
  // SmartLinks (Global Cross-Device Public Resolution)
  // ==========================================
  app.get('/api/v2/smart-links/links/lite', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string };
    const blogId = resolveTargetBlogId(user.workspace, q.blogId);
    return { data: user.workspace.smartLinks.filter((s) => s.blogId === blogId) };
  });

  app.get('/api/v2/smart-links/links/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const link = user.workspace.smartLinks.find((s) => s.id === id);
    if (!link) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }
    return { data: link };
  });

  app.post('/api/v2/smart-links/links', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as { blogId?: number; title?: string; slug?: string };
    const blogId = resolveTargetBlogId(user.workspace, body.blogId);
    const slug = (body.slug || `brand-${blogId}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug || slug.length < 2) {
      reply.code(400);
      return { error: 'SmartLink slug must contain at least 2 characters.' };
    }

    const existingGlobal = await repo.getPublicSmartLinkOwner(slug);
    if (existingGlobal) {
      reply.code(409);
      return { error: `The public URL /bio/${slug} is already taken. Choose another slug.` };
    }

    const created: SmartLink = {
      id: randomToken('sl', 4),
      blogId,
      slug,
      title: body.title?.trim() || 'Official Links',
      description: 'Official links and latest resources.',
      theme: {
        backgroundColor: '#ffffff',
        buttonColor: '#17191c',
        buttonTextColor: '#ffffff'
      },
      buttons: [],
      views: 0
    };
    user.workspace.smartLinks.push(created);
    await repo.saveUser(user);
    return { data: created };
  });

  app.put('/api/v2/smart-links/links/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<SmartLink>;
    const link = user.workspace.smartLinks.find((s) => s.id === id);
    if (!link) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }

    if (typeof body.slug === 'string' && body.slug.trim()) {
      const nextSlug = body.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '');
      if (nextSlug !== link.slug) {
        const conflict = await repo.getPublicSmartLinkOwner(nextSlug);
        if (conflict && conflict.linkId !== link.id) {
          reply.code(409);
          return { error: `The public URL /bio/${nextSlug} is already taken.` };
        }
        link.slug = nextSlug;
      }
    }

    if (typeof body.title === 'string') link.title = body.title.trim();
    if (typeof body.description === 'string') link.description = body.description.trim();
    if (body.theme) link.theme = { ...link.theme, ...body.theme };
    if (Array.isArray(body.buttons)) link.buttons = body.buttons;
    await repo.saveUser(user);
    return { data: link };
  });

  app.get('/api/v2/public/smart-links/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const cleanSlug = slug.trim().toLowerCase();
    const ownerRef = await repo.getPublicSmartLinkOwner(cleanSlug);
    if (!ownerRef) {
      reply.code(404);
      return { error: 'Public SmartLink profile not found.' };
    }

    const owner = await repo.getUserById(ownerRef.userId);
    const link = owner?.workspace.smartLinks.find((s) => s.id === ownerRef.linkId);
    const brand = owner?.workspace.brands.find((b) => b.blogId === ownerRef.blogId);
    if (!owner || !link) {
      reply.code(404);
      return { error: 'Public SmartLink profile not found.' };
    }

    link.views += 1;
    if (brand) {
      await recordBrandWebHit({
        repo,
        workspace: owner.workspace,
        brand,
        visitorId: getCookieValue(req, '_bm') || randomToken('vis', 6),
        sessionId: randomToken('ses', 6),
        eventType: 'pageview',
        eventName: 'smartlink_view',
        path: `/bio/${link.slug}`,
        referrer: req.headers?.referer || null,
        countryCode: req.countryCode || req.headers?.['cf-ipcountry'] || null
      });
    }
    await repo.saveUser(owner);
    return { data: link };
  });

  app.post('/api/v2/public/smart-links/:slug/click', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const body = (req.body ?? {}) as { buttonId?: string };
    const ownerRef = await repo.getPublicSmartLinkOwner(slug.trim().toLowerCase());
    if (!ownerRef) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }

    const owner = await repo.getUserById(ownerRef.userId);
    const link = owner?.workspace.smartLinks.find((s) => s.id === ownerRef.linkId);
    const brand = owner?.workspace.brands.find((b) => b.blogId === ownerRef.blogId);
    if (!owner || !link) {
      reply.code(404);
      return { error: 'SmartLink not found.' };
    }

    const btn = link.buttons.find((b) => b.id === body.buttonId);
    if (btn) {
      btn.clicks += 1;
      if (brand) {
        await recordBrandWebHit({
          repo,
          workspace: owner.workspace,
          brand,
          visitorId: getCookieValue(req, '_bm') || randomToken('vis', 6),
          sessionId: randomToken('ses', 6),
          eventType: 'smartlink_click',
          eventName: `click:${btn.label.slice(0, 40)}`,
          path: `/bio/${link.slug}`,
          referrer: req.headers?.referer || null,
          countryCode: req.countryCode || req.headers?.['cf-ipcountry'] || null
        });
      }
      await repo.saveUser(owner);
    }
    return { ok: true, clicks: btn?.clicks ?? 0, url: btn?.url ?? '' };
  });

  // ==========================================
  // Advertising Campaigns
  // ==========================================
  app.get('/api/v2/advertising/campaigns', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const q = (req.query ?? {}) as { blogId?: string; platform?: string };
    const brand = findBrand(user.workspace, q.blogId);
    const blogId = brand?.blogId ?? 0;
    const connectedAdPlatforms = (['metaAds', 'googleAds', 'tiktokAds'] as const).filter(
      (p) => brand?.connections[p]?.connected
    );
    let campaigns = user.workspace.adCampaigns.filter((c) => c.blogId === blogId);
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
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const body = (req.body ?? {}) as Partial<AdCampaign>;
    if (!body.name?.trim() || !body.platform) {
      reply.code(400);
      return { error: 'Campaign name and platform are required.' };
    }
    const blogId = resolveTargetBlogId(user.workspace, body.blogId);
    const campaign: AdCampaign = {
      id: randomToken('cmp', 4),
      blogId,
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
    user.workspace.adCampaigns.unshift(campaign);
    await repo.saveUser(user);
    return { data: campaign };
  });

  app.patch('/api/v2/advertising/campaigns/:id', async (req, reply) => {
    const user = await requireUser(req, reply, repo);
    if (!user) return { error: 'Authentication required.' };
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Partial<AdCampaign>;
    const cmp = user.workspace.adCampaigns.find((c) => c.id === id);
    if (!cmp) {
      reply.code(404);
      return { error: 'Campaign not found.' };
    }
    if (body.status === 'ACTIVE' || body.status === 'PAUSED') cmp.status = body.status;
    if (typeof body.dailyBudget === 'number' && body.dailyBudget > 0) cmp.dailyBudget = body.dailyBudget;
    await repo.saveUser(user);
    return { data: cmp };
  });
}
