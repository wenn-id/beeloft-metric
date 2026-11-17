import { randomToken } from '../security/crypto.js';
import type {
  BrandIndexRow,
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

export interface PlatformSnapshot {
  users: UserAccountRow[];
  sessions: SessionRow[];
  passwordResets: PasswordResetRow[];
  invitations: InvitationRow[];
  brandsIndex: BrandIndexRow[];
  publicSmartlinks: Array<{ slug: string; userId: number; blogId: number; linkId: string; updatedAt: string }>;
  publicStudioReports: Array<{ reportId: string; userId: number; blogId: number; updatedAt: string }>;
  webEvents: WebEventRow[];
  oauthStates: OAuthStateRow[];
  oauthCredentials: OAuthCredentialRow[];
  mediaAssets: MediaAssetRow[];
  paymentOrders: PaymentOrderRow[];
  globalMeta: PlatformGlobalMeta;
}

export function createEmptySnapshot(): PlatformSnapshot {
  return {
    users: [],
    sessions: [],
    passwordResets: [],
    invitations: [],
    brandsIndex: [],
    publicSmartlinks: [],
    publicStudioReports: [],
    webEvents: [],
    oauthStates: [],
    oauthCredentials: [],
    mediaAssets: [],
    paymentOrders: [],
    globalMeta: {
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
    }
  };
}

export class MemoryPlatformRepository implements PlatformRepository {
  driver: 'local-file' | 'memory' = 'memory';
  protected data: PlatformSnapshot;
  protected onMutate?: (snapshot: PlatformSnapshot) => Promise<void>;

  constructor(initial?: PlatformSnapshot, onMutate?: (snapshot: PlatformSnapshot) => Promise<void>) {
    this.data = initial ?? createEmptySnapshot();
    this.onMutate = onMutate;
  }

  protected async flush(): Promise<void> {
    if (this.onMutate) {
      await this.onMutate(this.data);
    }
  }

  async ensureReady(): Promise<void> {}

  async countUsers(): Promise<number> {
    await this.ensureReady();
    return this.data.users.length;
  }

  async listUsers() {
    await this.ensureReady();
    return this.data.users.map((u) => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      plan: u.plan,
      status: u.status,
      role: u.role,
      createdAt: u.createdAt
    }));
  }

  async getUserById(userId: number): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const hit = this.data.users.find((u) => u.userId === userId);
    return hit ? JSON.parse(JSON.stringify(hit)) : null;
  }

  async getUserByEmail(email: string): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const target = email.trim().toLowerCase();
    const hit = this.data.users.find((u) => u.email.toLowerCase() === target);
    return hit ? JSON.parse(JSON.stringify(hit)) : null;
  }

  async getUserByApiToken(apiToken: string): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const target = apiToken.trim();
    const hit = this.data.users.find((u) => u.apiToken === target);
    return hit ? JSON.parse(JSON.stringify(hit)) : null;
  }

  async getUserByVerificationToken(token: string): Promise<UserAccountRow | null> {
    await this.ensureReady();
    const target = token.trim();
    const hit = this.data.users.find((u) => u.verificationToken === target);
    return hit ? JSON.parse(JSON.stringify(hit)) : null;
  }

  async allocateIds(): Promise<{ userId: number; blogId: number }> {
    await this.ensureReady();
    const maxU = this.data.users.reduce((acc, u) => Math.max(acc, u.userId), 100000);
    const maxB = this.data.brandsIndex.reduce((acc, b) => Math.max(acc, b.blogId), 900000);
    return { userId: maxU + 1, blogId: maxB + 1 };
  }

  async allocateBlogId(): Promise<number> {
    await this.ensureReady();
    const maxB = this.data.brandsIndex.reduce((acc, b) => Math.max(acc, b.blogId), 900000);
    return maxB + 1;
  }

  async saveUser(user: UserAccountRow): Promise<void> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const copy: UserAccountRow = JSON.parse(JSON.stringify(user));
    copy.email = copy.email.trim().toLowerCase();
    copy.updatedAt = now;
    copy.workspace.user.email = copy.email;
    copy.workspace.user.name = copy.name;
    copy.workspace.user.plan = copy.plan;
    copy.workspace.user.status = copy.status;
    copy.workspace.user.apiToken = copy.apiToken;
    copy.workspace.user.totpEnabled = copy.totpEnabled;
    copy.workspace.user.emailVerified = copy.emailVerified;
    copy.workspace.user.role = copy.role;

    for (const brand of copy.workspace.brands) {
      if (!brand.trackingKey) {
        brand.trackingKey = randomToken('bm_trk', 12);
      }
      const existingIdx = this.data.brandsIndex.findIndex((b) => b.blogId === brand.blogId);
      const idxRow: BrandIndexRow = {
        blogId: brand.blogId,
        userId: copy.userId,
        trackingKey: brand.trackingKey,
        domain: brand.websiteDomain || null,
        updatedAt: now
      };
      if (existingIdx >= 0) this.data.brandsIndex[existingIdx] = idxRow;
      else this.data.brandsIndex.push(idxRow);
    }

    this.data.publicSmartlinks = this.data.publicSmartlinks.filter((s) => s.userId !== copy.userId);
    for (const link of copy.workspace.smartLinks) {
      this.data.publicSmartlinks.push({
        slug: link.slug.toLowerCase(),
        userId: copy.userId,
        blogId: link.blogId,
        linkId: link.id,
        updatedAt: now
      });
    }

    this.data.publicStudioReports = this.data.publicStudioReports.filter((r) => r.userId !== copy.userId);
    for (const rep of copy.workspace.studioReports) {
      if (rep.publicEnabled) {
        this.data.publicStudioReports.push({
          reportId: rep.id,
          userId: copy.userId,
          blogId: rep.blogId,
          updatedAt: now
        });
      }
    }

    const pos = this.data.users.findIndex((u) => u.userId === copy.userId);
    if (pos >= 0) this.data.users[pos] = copy;
    else this.data.users.push(copy);

    await this.flush();
  }

  async createSession(session: SessionRow): Promise<void> {
    await this.ensureReady();
    this.data.sessions = this.data.sessions.filter((s) => s.tokenHash !== session.tokenHash);
    this.data.sessions.push({ ...session });
    await this.flush();
  }

  async getSession(tokenHash: string): Promise<SessionRow | null> {
    await this.ensureReady();
    const hit = this.data.sessions.find((s) => s.tokenHash === tokenHash);
    if (!hit) return null;
    if (hit.expiresAt <= new Date().toISOString()) {
      await this.deleteSession(tokenHash);
      return null;
    }
    return { ...hit };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.ensureReady();
    this.data.sessions = this.data.sessions.filter((s) => s.tokenHash !== tokenHash);
    await this.flush();
  }

  async deleteUserSessions(userId: number): Promise<void> {
    await this.ensureReady();
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    await this.flush();
  }

  async createPasswordReset(reset: PasswordResetRow): Promise<void> {
    await this.ensureReady();
    this.data.passwordResets = this.data.passwordResets.filter((r) => r.tokenHash !== reset.tokenHash);
    this.data.passwordResets.push({ ...reset });
    await this.flush();
  }

  async getPasswordReset(tokenHash: string): Promise<PasswordResetRow | null> {
    await this.ensureReady();
    const hit = this.data.passwordResets.find((r) => r.tokenHash === tokenHash);
    return hit ? { ...hit } : null;
  }

  async markPasswordResetUsed(tokenHash: string): Promise<void> {
    await this.ensureReady();
    const hit = this.data.passwordResets.find((r) => r.tokenHash === tokenHash);
    if (hit) {
      hit.used = true;
      await this.flush();
    }
  }

  async createInvitation(inv: InvitationRow): Promise<void> {
    await this.ensureReady();
    this.data.invitations = this.data.invitations.filter((i) => i.token !== inv.token);
    this.data.invitations.push({ ...inv, email: inv.email.toLowerCase() });
    await this.flush();
  }

  async getInvitation(token: string): Promise<InvitationRow | null> {
    await this.ensureReady();
    const hit = this.data.invitations.find((i) => i.token === token);
    return hit ? { ...hit, assignedBrands: [...hit.assignedBrands] } : null;
  }

  async markInvitationAccepted(token: string): Promise<void> {
    await this.ensureReady();
    const hit = this.data.invitations.find((i) => i.token === token);
    if (hit) {
      hit.status = 'ACCEPTED';
      await this.flush();
    }
  }

  async getBrandOwner(blogId: number): Promise<BrandIndexRow | null> {
    await this.ensureReady();
    const hit = this.data.brandsIndex.find((b) => b.blogId === blogId);
    return hit ? { ...hit } : null;
  }

  async getBrandByTrackingKey(trackingKey: string): Promise<BrandIndexRow | null> {
    await this.ensureReady();
    const hit = this.data.brandsIndex.find((b) => b.trackingKey === trackingKey);
    return hit ? { ...hit } : null;
  }

  async getPublicSmartLinkOwner(slug: string) {
    await this.ensureReady();
    const target = slug.toLowerCase();
    const hit = this.data.publicSmartlinks.find((s) => s.slug === target);
    return hit ? { userId: hit.userId, blogId: hit.blogId, linkId: hit.linkId } : null;
  }

  async getPublicStudioReportOwner(reportId: string) {
    await this.ensureReady();
    const hit = this.data.publicStudioReports.find((r) => r.reportId === reportId);
    return hit ? { userId: hit.userId, blogId: hit.blogId } : null;
  }

  async insertWebEvent(ev: WebEventRow): Promise<void> {
    await this.ensureReady();
    this.data.webEvents.unshift({ ...ev });
    if (this.data.webEvents.length > 5000) {
      this.data.webEvents = this.data.webEvents.slice(0, 5000);
    }
    await this.flush();
  }

  async listWebEventsSince(blogId: number, sinceIso: string, limit = 500): Promise<WebEventRow[]> {
    await this.ensureReady();
    return this.data.webEvents
      .filter((e) => e.blogId === blogId && e.createdAt >= sinceIso)
      .slice(0, limit);
  }

  async listVisitorEvents(visitorId: string, limit = 50): Promise<WebEventRow[]> {
    await this.ensureReady();
    return this.data.webEvents.filter((e) => e.visitorId === visitorId).slice(0, limit);
  }

  async saveOAuthState(row: OAuthStateRow): Promise<void> {
    await this.ensureReady();
    this.data.oauthStates = this.data.oauthStates.filter((s) => s.state !== row.state);
    this.data.oauthStates.push({ ...row });
    await this.flush();
  }

  async consumeOAuthState(state: string): Promise<OAuthStateRow | null> {
    await this.ensureReady();
    const idx = this.data.oauthStates.findIndex((s) => s.state === state);
    if (idx === -1) return null;
    const [hit] = this.data.oauthStates.splice(idx, 1);
    await this.flush();
    return hit;
  }

  async saveOAuthCredential(row: OAuthCredentialRow): Promise<void> {
    await this.ensureReady();
    this.data.oauthCredentials = this.data.oauthCredentials.filter(
      (c) => !(c.blogId === row.blogId && c.network === row.network)
    );
    this.data.oauthCredentials.push({ ...row });
    await this.flush();
  }

  async getOAuthCredential(blogId: number, network: NetworkKey): Promise<OAuthCredentialRow | null> {
    await this.ensureReady();
    const hit = this.data.oauthCredentials.find((c) => c.blogId === blogId && c.network === network);
    return hit ? { ...hit } : null;
  }

  async deleteOAuthCredential(blogId: number, network: NetworkKey): Promise<void> {
    await this.ensureReady();
    this.data.oauthCredentials = this.data.oauthCredentials.filter(
      (c) => !(c.blogId === blogId && c.network === network)
    );
    await this.flush();
  }

  async saveMediaAsset(row: MediaAssetRow): Promise<void> {
    await this.ensureReady();
    this.data.mediaAssets = this.data.mediaAssets.filter((m) => m.id !== row.id);
    this.data.mediaAssets.unshift({ ...row });
    await this.flush();
  }

  async getMediaAsset(id: string): Promise<MediaAssetRow | null> {
    await this.ensureReady();
    const hit = this.data.mediaAssets.find((m) => m.id === id);
    return hit ? { ...hit } : null;
  }

  async listMediaAssets(blogId: number) {
    await this.ensureReady();
    return this.data.mediaAssets
      .filter((m) => m.blogId === blogId)
      .slice(0, 100)
      .map(({ dataBase64: _ignored, ...rest }) => rest);
  }

  async savePaymentOrder(row: PaymentOrderRow): Promise<void> {
    await this.ensureReady();
    const idx = this.data.paymentOrders.findIndex((p) => p.orderId === row.orderId);
    if (idx >= 0) this.data.paymentOrders[idx] = { ...row };
    else this.data.paymentOrders.unshift({ ...row });
    await this.flush();
  }

  async getPaymentOrder(orderId: string): Promise<PaymentOrderRow | null> {
    await this.ensureReady();
    const hit = this.data.paymentOrders.find((p) => p.orderId === orderId);
    return hit ? { ...hit } : null;
  }

  async listUserPaymentOrders(userId: number): Promise<PaymentOrderRow[]> {
    await this.ensureReady();
    return this.data.paymentOrders.filter((p) => p.userId === userId).slice(0, 50);
  }

  async getGlobalMeta(): Promise<PlatformGlobalMeta> {
    await this.ensureReady();
    return JSON.parse(JSON.stringify(this.data.globalMeta));
  }

  async saveGlobalMeta(meta: PlatformGlobalMeta): Promise<void> {
    await this.ensureReady();
    this.data.globalMeta = JSON.parse(JSON.stringify(meta));
    await this.flush();
  }

  async incrementApiCallCounter(): Promise<number> {
    await this.ensureReady();
    const today = new Date().toISOString().slice(0, 10);
    if (this.data.globalMeta.apiCallsDate !== today) {
      this.data.globalMeta.apiCallsDate = today;
      this.data.globalMeta.apiCallsToday = 1;
    } else {
      this.data.globalMeta.apiCallsToday += 1;
    }
    await this.flush();
    return this.data.globalMeta.apiCallsToday;
  }
}
