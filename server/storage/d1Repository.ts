import { randomToken } from '../security/crypto.js';
import type {
  BrandIndexRow,
  D1DatabaseLike,
  InvitationRow,
  MediaAssetRow,
  NetworkKey,
  OAuthCredentialRow,
  OAuthStateRow,
  PasswordResetRow,
  PaymentOrderRow,
  PlatformGlobalMeta,
  PlatformRepository,
  SessionRow,
  UserAccountRow,
  WebEventRow
} from '../types.js';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    api_token TEXT NOT NULL UNIQUE,
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    plan TEXT NOT NULL DEFAULT 'FREE',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    email_verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    workspace_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_api_token ON users(api_token)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS invitations (
    token TEXT PRIMARY KEY,
    owner_user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    kind TEXT NOT NULL,
    assigned_brands_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS brands_index (
    blog_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tracking_key TEXT NOT NULL UNIQUE,
    domain TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_brands_tracking_key ON brands_index(tracking_key)`,
  `CREATE TABLE IF NOT EXISTS public_smartlinks (
    slug TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blog_id INTEGER NOT NULL,
    link_id TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS public_studio_reports (
    report_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blog_id INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS web_events (
    id TEXT PRIMARY KEY,
    blog_id INTEGER NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    path TEXT NOT NULL,
    event_name TEXT NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    referrer TEXT,
    country_code TEXT,
    country_name TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_web_events_blog_time ON web_events(blog_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blog_id INTEGER NOT NULL,
    network TEXT NOT NULL,
    code_verifier TEXT,
    redirect_origin TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS oauth_credentials (
    blog_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    network TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    account_id TEXT,
    account_handle TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (blog_id, network)
  )`,
  `CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blog_id INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    filename TEXT NOT NULL,
    data_base64 TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payment_orders (
    order_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    amount_idr INTEGER NOT NULL,
    amount_usd REAL NOT NULL,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    checkout_url TEXT,
    status TEXT NOT NULL,
    coupon_code TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS platform_meta (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
  )`
];

function defaultGlobalMeta(): PlatformGlobalMeta {
  return {
    coupons: [
      {
        id: 'cpn-launch',
        code: 'LAUNCH20',
        discountPct: 20,
        planTarget: 'STARTER',
        redemptions: 0,
        maxRedemptions: 250,
        active: true
      }
    ],
    invoices: [],
    featureFlags: {
      HIDE_HASHTAG_TRACKER: false,
      ENABLE_AI_TEXT: true,
      ENABLE_STUDIO: true,
      ENABLE_FLOWS: true,
      ENABLE_BACKOFFICE: true
    },
    apiCallsToday: 0,
    apiCallsDate: new Date().toISOString().slice(0, 10)
  };
}

function mapUserRow(raw: Record<string, unknown>): UserAccountRow {
  const workspace = JSON.parse(String(raw.workspace_json));
  return {
    userId: Number(raw.user_id),
    email: String(raw.email),
    name: String(raw.name),
    passwordHash: String(raw.password_hash),
    passwordSalt: String(raw.password_salt),
    apiToken: String(raw.api_token),
    totpSecret: raw.totp_secret ? String(raw.totp_secret) : null,
    totpEnabled: Boolean(raw.totp_enabled),
    plan: String(raw.plan) as UserAccountRow['plan'],
    status: String(raw.status) as UserAccountRow['status'],
    emailVerified: Boolean(raw.email_verified),
    verificationToken: raw.verification_token ? String(raw.verification_token) : null,
    role: String(raw.role) === 'ADMIN' ? 'ADMIN' : 'USER',
    workspace,
    createdAt: String(raw.created_at),
    updatedAt: String(raw.updated_at)
  };
}

export class D1PlatformRepository implements PlatformRepository {
  readonly driver = 'd1' as const;
  private initialized = false;

  constructor(private readonly db: D1DatabaseLike) {}

  async ensureReady(): Promise<void> {
    if (this.initialized) return;
    await this.db.batch(SCHEMA_STATEMENTS.map((sql) => this.db.prepare(sql)));
    this.initialized = true;
  }

  async countUsers(): Promise<number> {
    await this.ensureReady();
    const row = await this.db.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>();
    return Number(row?.cnt ?? 0);
  }

  async listUsers() {
    await this.ensureReady();
    const res = await this.db
      .prepare('SELECT user_id, email, name, plan, status, role, created_at FROM users ORDER BY user_id ASC')
      .all<Record<string, unknown>>();
    return res.results.map((r) => ({
      userId: Number(r.user_id),
      email: String(r.email),
      name: String(r.name),
      plan: String(r.plan) as UserAccountRow['plan'],
      status: String(r.status) as UserAccountRow['status'],
      role: (String(r.role) === 'ADMIN' ? 'ADMIN' : 'USER') as 'ADMIN' | 'USER',
      createdAt: String(r.created_at)
    }));
  }

  async getUserById(userId: number): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM users WHERE user_id = ?')
      .bind(userId)
      .first<Record<string, unknown>>();
    return row ? mapUserRow(row) : null;
  }

  async getUserByEmail(email: string): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.trim().toLowerCase())
      .first<Record<string, unknown>>();
    return row ? mapUserRow(row) : null;
  }

  async getUserByApiToken(apiToken: string): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM users WHERE api_token = ?')
      .bind(apiToken.trim())
      .first<Record<string, unknown>>();
    return row ? mapUserRow(row) : null;
  }

  async getUserByVerificationToken(token: string): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM users WHERE verification_token = ?')
      .bind(token.trim())
      .first<Record<string, unknown>>();
    return row ? mapUserRow(row) : null;
  }

  async allocateIds(): Promise<{ userId: number; blogId: number }> {
    await this.ensureReady();
    const uRow = await this.db.prepare('SELECT MAX(user_id) as mx FROM users').first<{ mx: number | null }>();
    const bRow = await this.db.prepare('SELECT MAX(blog_id) as mx FROM brands_index').first<{ mx: number | null }>();
    const userId = Math.max(100000, Number(uRow?.mx ?? 100000)) + 1;
    const blogId = Math.max(900000, Number(bRow?.mx ?? 900000)) + 1;
    return { userId, blogId };
  }

  async allocateBlogId(): Promise<number> {
    await this.ensureReady();
    const bRow = await this.db.prepare('SELECT MAX(blog_id) as mx FROM brands_index').first<{ mx: number | null }>();
    return Math.max(900000, Number(bRow?.mx ?? 900000)) + 1;
  }

  async saveUser(user: UserAccountRow): Promise<void> {
    await this.ensureReady();
    const now = new Date().toISOString();
    user.updatedAt = now;
    user.workspace.user.email = user.email;
    user.workspace.user.name = user.name;
    user.workspace.user.plan = user.plan;
    user.workspace.user.status = user.status;
    user.workspace.user.apiToken = user.apiToken;
    user.workspace.user.totpEnabled = user.totpEnabled;
    user.workspace.user.emailVerified = user.emailVerified;
    user.workspace.user.role = user.role;

    const stmts = [
      this.db
        .prepare(
          `INSERT INTO users (
            user_id, email, name, password_hash, password_salt, api_token, totp_secret, totp_enabled,
            plan, status, email_verified, verification_token, role, workspace_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            password_hash = excluded.password_hash,
            password_salt = excluded.password_salt,
            api_token = excluded.api_token,
            totp_secret = excluded.totp_secret,
            totp_enabled = excluded.totp_enabled,
            plan = excluded.plan,
            status = excluded.status,
            email_verified = excluded.email_verified,
            verification_token = excluded.verification_token,
            role = excluded.role,
            workspace_json = excluded.workspace_json,
            updated_at = excluded.updated_at`
        )
        .bind(
          user.userId,
          user.email.toLowerCase(),
          user.name,
          user.passwordHash,
          user.passwordSalt,
          user.apiToken,
          user.totpSecret,
          user.totpEnabled ? 1 : 0,
          user.plan,
          user.status,
          user.emailVerified ? 1 : 0,
          user.verificationToken,
          user.role,
          JSON.stringify(user.workspace),
          user.createdAt,
          now
        ),
      this.db.prepare('DELETE FROM public_smartlinks WHERE user_id = ?').bind(user.userId),
      this.db.prepare('DELETE FROM public_studio_reports WHERE user_id = ?').bind(user.userId)
    ];

    for (const brand of user.workspace.brands) {
      if (!brand.trackingKey) {
        brand.trackingKey = randomToken('bm_trk', 12);
      }
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO brands_index (blog_id, user_id, tracking_key, domain, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(blog_id) DO UPDATE SET
               tracking_key = excluded.tracking_key,
               domain = excluded.domain,
               updated_at = excluded.updated_at`
          )
          .bind(brand.blogId, user.userId, brand.trackingKey, brand.websiteDomain || null, now)
      );
    }

    for (const link of user.workspace.smartLinks) {
      stmts.push(
        this.db
          .prepare(
            `INSERT OR REPLACE INTO public_smartlinks (slug, user_id, blog_id, link_id, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(link.slug, user.userId, link.blogId, link.id, now)
      );
    }

    for (const rep of user.workspace.studioReports) {
      if (rep.publicEnabled) {
        stmts.push(
          this.db
            .prepare(
              `INSERT OR REPLACE INTO public_studio_reports (report_id, user_id, blog_id, updated_at)
               VALUES (?, ?, ?, ?)`
            )
            .bind(rep.id, user.userId, rep.blogId, now)
        );
      }
    }

    await this.db.batch(stmts);
  }

  async createSession(session: SessionRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO sessions (token_hash, user_id, expires_at, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        session.tokenHash,
        session.userId,
        session.expiresAt,
        session.ip,
        session.userAgent,
        session.createdAt
      )
      .run();
  }

  async getSession(tokenHash: string): Promise<SessionRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM sessions WHERE token_hash = ?')
      .bind(tokenHash)
      .first<Record<string, unknown>>();
    if (!row) return null;
    if (String(row.expires_at) <= new Date().toISOString()) {
      await this.deleteSession(tokenHash);
      return null;
    }
    return {
      tokenHash: String(row.token_hash),
      userId: Number(row.user_id),
      expiresAt: String(row.expires_at),
      ip: row.ip ? String(row.ip) : null,
      userAgent: row.user_agent ? String(row.user_agent) : null,
      createdAt: String(row.created_at)
    };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.ensureReady();
    await this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  async deleteUserSessions(userId: number): Promise<void> {
    await this.ensureReady();
    await this.db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  }

  async createPasswordReset(reset: PasswordResetRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO password_resets (token_hash, user_id, expires_at, used, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(reset.tokenHash, reset.userId, reset.expiresAt, reset.used ? 1 : 0, reset.createdAt)
      .run();
  }

  async getPasswordReset(tokenHash: string): Promise<PasswordResetRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM password_resets WHERE token_hash = ?')
      .bind(tokenHash)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      tokenHash: String(row.token_hash),
      userId: Number(row.user_id),
      expiresAt: String(row.expires_at),
      used: Boolean(row.used),
      createdAt: String(row.created_at)
    };
  }

  async markPasswordResetUsed(tokenHash: string): Promise<void> {
    await this.ensureReady();
    await this.db.prepare('UPDATE password_resets SET used = 1 WHERE token_hash = ?').bind(tokenHash).run();
  }

  async createInvitation(inv: InvitationRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO invitations (token, owner_user_id, email, name, role, kind, assigned_brands_json, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        inv.token,
        inv.ownerUserId,
        inv.email.toLowerCase(),
        inv.name,
        inv.role,
        inv.kind,
        JSON.stringify(inv.assignedBrands),
        inv.status,
        inv.createdAt
      )
      .run();
  }

  async getInvitation(token: string): Promise<InvitationRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM invitations WHERE token = ?')
      .bind(token)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      token: String(row.token),
      ownerUserId: Number(row.owner_user_id),
      email: String(row.email),
      name: String(row.name),
      role: String(row.role) as InvitationRow['role'],
      kind: String(row.kind) as InvitationRow['kind'],
      assignedBrands: JSON.parse(String(row.assigned_brands_json || '[]')),
      status: String(row.status) === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
      createdAt: String(row.created_at)
    };
  }

  async markInvitationAccepted(token: string): Promise<void> {
    await this.ensureReady();
    await this.db.prepare("UPDATE invitations SET status = 'ACCEPTED' WHERE token = ?").bind(token).run();
  }

  async getBrandOwner(blogId: number): Promise<BrandIndexRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM brands_index WHERE blog_id = ?')
      .bind(blogId)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      blogId: Number(row.blog_id),
      userId: Number(row.user_id),
      trackingKey: String(row.tracking_key),
      domain: row.domain ? String(row.domain) : null,
      updatedAt: String(row.updated_at)
    };
  }

  async getBrandByTrackingKey(trackingKey: string): Promise<BrandIndexRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM brands_index WHERE tracking_key = ?')
      .bind(trackingKey)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      blogId: Number(row.blog_id),
      userId: Number(row.user_id),
      trackingKey: String(row.tracking_key),
      domain: row.domain ? String(row.domain) : null,
      updatedAt: String(row.updated_at)
    };
  }

  async getPublicSmartLinkOwner(slug: string) {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM public_smartlinks WHERE slug = ?')
      .bind(slug.toLowerCase())
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      userId: Number(row.user_id),
      blogId: Number(row.blog_id),
      linkId: String(row.link_id)
    };
  }

  async getPublicStudioReportOwner(reportId: string) {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM public_studio_reports WHERE report_id = ?')
      .bind(reportId)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      userId: Number(row.user_id),
      blogId: Number(row.blog_id)
    };
  }

  async insertWebEvent(ev: WebEventRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT INTO web_events (
          id, blog_id, visitor_id, session_id, event_type, path, event_name,
          utm_source, utm_medium, referrer, country_code, country_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        ev.id,
        ev.blogId,
        ev.visitorId,
        ev.sessionId,
        ev.eventType,
        ev.path,
        ev.eventName,
        ev.utmSource,
        ev.utmMedium,
        ev.referrer,
        ev.countryCode,
        ev.countryName,
        ev.createdAt
      )
      .run();
  }

  async listWebEventsSince(blogId: number, sinceIso: string, limit = 500): Promise<WebEventRow[]> {
    await this.ensureReady();
    const res = await this.db
      .prepare(
        `SELECT * FROM web_events WHERE blog_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`
      )
      .bind(blogId, sinceIso, limit)
      .all<Record<string, unknown>>();
    return res.results.map(mapWebEventRow);
  }

  async listVisitorEvents(visitorId: string, limit = 50): Promise<WebEventRow[]> {
    await this.ensureReady();
    const res = await this.db
      .prepare(`SELECT * FROM web_events WHERE visitor_id = ? ORDER BY created_at DESC LIMIT ?`)
      .bind(visitorId, limit)
      .all<Record<string, unknown>>();
    return res.results.map(mapWebEventRow);
  }

  async saveOAuthState(row: OAuthStateRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO oauth_states (state, user_id, blog_id, network, code_verifier, redirect_origin, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.state,
        row.userId,
        row.blogId,
        row.network,
        row.codeVerifier,
        row.redirectOrigin,
        row.createdAt
      )
      .run();
  }

  async consumeOAuthState(state: string): Promise<OAuthStateRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM oauth_states WHERE state = ?')
      .bind(state)
      .first<Record<string, unknown>>();
    if (!row) return null;
    await this.db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
    return {
      state: String(row.state),
      userId: Number(row.user_id),
      blogId: Number(row.blog_id),
      network: String(row.network) as NetworkKey,
      codeVerifier: row.code_verifier ? String(row.code_verifier) : null,
      redirectOrigin: String(row.redirect_origin),
      createdAt: String(row.created_at)
    };
  }

  async saveOAuthCredential(row: OAuthCredentialRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO oauth_credentials (
          blog_id, user_id, network, access_token, refresh_token, expires_at, account_id, account_handle, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.blogId,
        row.userId,
        row.network,
        row.accessToken,
        row.refreshToken,
        row.expiresAt,
        row.accountId,
        row.accountHandle,
        row.updatedAt
      )
      .run();
  }

  async getOAuthCredential(blogId: number, network: NetworkKey): Promise<OAuthCredentialRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM oauth_credentials WHERE blog_id = ? AND network = ?')
      .bind(blogId, network)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      blogId: Number(row.blog_id),
      userId: Number(row.user_id),
      network: String(row.network) as NetworkKey,
      accessToken: String(row.access_token),
      refreshToken: row.refresh_token ? String(row.refresh_token) : null,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      accountId: row.account_id ? String(row.account_id) : null,
      accountHandle: row.account_handle ? String(row.account_handle) : null,
      updatedAt: String(row.updated_at)
    };
  }

  async deleteOAuthCredential(blogId: number, network: NetworkKey): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare('DELETE FROM oauth_credentials WHERE blog_id = ? AND network = ?')
      .bind(blogId, network)
      .run();
  }

  async saveMediaAsset(row: MediaAssetRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO media_assets (
          id, user_id, blog_id, r2_key, mime_type, size_bytes, filename, data_base64, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.id,
        row.userId,
        row.blogId,
        row.r2Key,
        row.mimeType,
        row.sizeBytes,
        row.filename,
        row.dataBase64,
        row.createdAt
      )
      .run();
  }

  async getMediaAsset(id: string): Promise<MediaAssetRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM media_assets WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return {
      id: String(row.id),
      userId: Number(row.user_id),
      blogId: Number(row.blog_id),
      r2Key: String(row.r2_key),
      mimeType: String(row.mime_type),
      sizeBytes: Number(row.size_bytes),
      filename: String(row.filename),
      dataBase64: row.data_base64 ? String(row.data_base64) : null,
      createdAt: String(row.created_at)
    };
  }

  async listMediaAssets(blogId: number) {
    await this.ensureReady();
    const res = await this.db
      .prepare(
        'SELECT id, user_id, blog_id, r2_key, mime_type, size_bytes, filename, created_at FROM media_assets WHERE blog_id = ? ORDER BY created_at DESC LIMIT 100'
      )
      .bind(blogId)
      .all<Record<string, unknown>>();
    return res.results.map((row) => ({
      id: String(row.id),
      userId: Number(row.user_id),
      blogId: Number(row.blog_id),
      r2Key: String(row.r2_key),
      mimeType: String(row.mime_type),
      sizeBytes: Number(row.size_bytes),
      filename: String(row.filename),
      createdAt: String(row.created_at)
    }));
  }

  async savePaymentOrder(row: PaymentOrderRow): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO payment_orders (
          order_id, user_id, plan, amount_idr, amount_usd, provider, provider_ref, checkout_url, status, coupon_code, created_at, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.orderId,
        row.userId,
        row.plan,
        row.amountIdr,
        row.amountUsd,
        row.provider,
        row.providerRef,
        row.checkoutUrl,
        row.status,
        row.couponCode,
        row.createdAt,
        row.paidAt
      )
      .run();
  }

  async getPaymentOrder(orderId: string): Promise<PaymentOrderRow | null> {
    await this.ensureReady();
    const row = await this.db
      .prepare('SELECT * FROM payment_orders WHERE order_id = ?')
      .bind(orderId)
      .first<Record<string, unknown>>();
    return row ? mapPaymentRow(row) : null;
  }

  async listUserPaymentOrders(userId: number): Promise<PaymentOrderRow[]> {
    await this.ensureReady();
    const res = await this.db
      .prepare('SELECT * FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .bind(userId)
      .all<Record<string, unknown>>();
    return res.results.map(mapPaymentRow);
  }

  async getGlobalMeta(): Promise<PlatformGlobalMeta> {
    await this.ensureReady();
    const row = await this.db
      .prepare("SELECT value_json FROM platform_meta WHERE key = 'global'")
      .first<{ value_json: string }>();
    if (!row?.value_json) {
      const defaults = defaultGlobalMeta();
      await this.saveGlobalMeta(defaults);
      return defaults;
    }
    return { ...defaultGlobalMeta(), ...JSON.parse(row.value_json) };
  }

  async saveGlobalMeta(meta: PlatformGlobalMeta): Promise<void> {
    await this.ensureReady();
    await this.db
      .prepare("INSERT OR REPLACE INTO platform_meta (key, value_json) VALUES ('global', ?)")
      .bind(JSON.stringify(meta))
      .run();
  }

  async incrementApiCallCounter(): Promise<number> {
    const meta = await this.getGlobalMeta();
    const today = new Date().toISOString().slice(0, 10);
    if (meta.apiCallsDate !== today) {
      meta.apiCallsDate = today;
      meta.apiCallsToday = 1;
    } else {
      meta.apiCallsToday += 1;
    }
    await this.saveGlobalMeta(meta);
    return meta.apiCallsToday;
  }
}

function mapWebEventRow(r: Record<string, unknown>): WebEventRow {
  return {
    id: String(r.id),
    blogId: Number(r.blog_id),
    visitorId: String(r.visitor_id),
    sessionId: String(r.session_id),
    eventType: String(r.event_type) as WebEventRow['eventType'],
    path: String(r.path),
    eventName: String(r.event_name),
    utmSource: r.utm_source ? String(r.utm_source) : null,
    utmMedium: r.utm_medium ? String(r.utm_medium) : null,
    referrer: r.referrer ? String(r.referrer) : null,
    countryCode: r.country_code ? String(r.country_code) : null,
    countryName: r.country_name ? String(r.country_name) : null,
    createdAt: String(r.created_at)
  };
}

function mapPaymentRow(r: Record<string, unknown>): PaymentOrderRow {
  return {
    orderId: String(r.order_id),
    userId: Number(r.user_id),
    plan: String(r.plan) as PaymentOrderRow['plan'],
    amountIdr: Number(r.amount_idr),
    amountUsd: Number(r.amount_usd),
    provider: String(r.provider) as PaymentOrderRow['provider'],
    providerRef: r.provider_ref ? String(r.provider_ref) : null,
    checkoutUrl: r.checkout_url ? String(r.checkout_url) : null,
    status: String(r.status) as PaymentOrderRow['status'],
    couponCode: r.coupon_code ? String(r.coupon_code) : null,
    createdAt: String(r.created_at),
    paidAt: r.paid_at ? String(r.paid_at) : null
  };
}
