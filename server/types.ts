export type NetworkKey =
  | 'web'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'twitter'
  | 'pinterest'
  | 'threads'
  | 'bluesky'
  | 'twitch'
  | 'gmb'
  | 'metaAds'
  | 'googleAds'
  | 'tiktokAds';

export interface BrandConnection {
  network: NetworkKey;
  label: string;
  category: 'websites' | 'social' | 'business' | 'advertising' | 'integrations';
  connected: boolean;
  accountId: string | null;
  accountHandle: string | null;
  lastSync: string | null;
}

export interface BrandWhiteLabel {
  enabled: boolean;
  logoText: string;
  primaryColor: string;
  footerNote: string;
}

export interface BrandAiConfig {
  tone: string;
  targetAudience: string;
  brandVoice: string;
  bannedWords: string;
}

export interface BrandIntegrations {
  canva: boolean;
  googleDrive: boolean;
  slack: boolean;
  zapier: boolean;
  adobeExpress: boolean;
  lookerStudio: boolean;
}

export interface Brand {
  blogId: number;
  userId: number;
  name: string;
  timezone: string;
  currency: string;
  isSample: boolean;
  trackingKey?: string;
  websiteDomain?: string;
  deleted?: boolean;
  engagementRatioMode: 'REACH' | 'FOLLOWERS';
  tags: string[];
  whiteLabel: BrandWhiteLabel;
  aiConfig: BrandAiConfig;
  integrations: BrandIntegrations;
  connections: Record<NetworkKey, BrandConnection>;
}

export interface UserProfile {
  userId: number;
  email: string;
  name: string;
  passwordHash: string;
  registered: string;
  trialUsed: boolean;
  trialDays: number;
  trialActive?: boolean;
  trialEndsAt?: string | null;
  trialDaysRemaining?: number;
  plan: 'FREE' | 'STARTER' | 'ADVANCED' | 'ENTERPRISE_CUSTOM';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified?: boolean;
  role?: 'ADMIN' | 'USER';
  validUntil: string;
  brandLimit: number;
  apiToken: string;
  totpEnabled: boolean;
  approvedMcpScopes: string[];
  features: Record<string, boolean>;
  authorities: string[];
}

export interface DailyMetricPoint {
  date: string;
  impressions: number;
  reach: number;
  followers: number;
  interactions: number;
  clicks: number;
}

export interface EvolutionPostRow {
  id: string;
  blogId: number;
  network: NetworkKey;
  title: string;
  publishedAt: string;
  format: string;
  impressions: number;
  reach: number;
  engagementRate: number;
  clicks: number;
}

export interface HashtagTrack {
  id: string;
  blogId: number;
  hashtag: string;
  network: 'instagram' | 'twitter' | 'tiktok';
  postsCount: number;
  impressions: number;
  trackedAt: string;
}

export interface CompetitorProfile {
  id: string;
  blogId: number;
  network: NetworkKey;
  handle: string;
  name: string;
  followers: number;
  postsCount: number;
  likesPerPost: number;
  engagementRate: number;
}

export interface RealtimeOverview {
  connected: boolean;
  isSample?: boolean;
  trackingKey?: string;
  trackerUrl?: string;
  activeVisitors: number;
  pageViewsLast30m: number;
  topActivePages: Array<{ path: string; visitors: number }>;
  topReferrers: Array<{ source: string; visitors: number }>;
  countries: Array<{ country: string; code: string; visitors: number }>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  kind: 'system' | 'custom';
  sections: string[];
}

export interface ReportArchiveItem {
  id: string;
  blogId: number;
  title: string;
  templateId: string;
  format: 'PDF' | 'PPTX';
  dateFrom: string;
  dateTo: string;
  createdAt: string;
  status: 'READY' | 'GENERATING';
  summaryMetrics: {
    impressions: number;
    reach: number;
    followersDelta: number;
    postsPublished: number;
  };
}

export interface StudioBlock {
  id: string;
  type: 'KPI_GRID' | 'LINE_CHART' | 'TOP_POSTS' | 'TEXT_BLOCK';
  title: string;
  content?: string;
}

export interface StudioReport {
  id: string;
  blogId: number;
  title: string;
  updatedAt: string;
  publicEnabled: boolean;
  blocks: StudioBlock[];
}

export interface CampaignDashboardItem {
  id: string;
  blogId: number;
  name: string;
  tag: string;
  startDate: string;
  endDate: string;
  postsCount: number;
  impressions: number;
  clicks: number;
  archived: boolean;
}

export interface InboxMessage {
  id: string;
  sender: 'contact' | 'operator';
  authorName: string;
  text: string;
  sentAt: string;
}

export interface InboxThread {
  id: string;
  blogId: number;
  network: NetworkKey;
  channelType: 'DM' | 'COMMENT' | 'REVIEW';
  contactName: string;
  contactHandle: string;
  status: 'UNREAD' | 'PENDING' | 'RESOLVED';
  updatedAt: string;
  messages: InboxMessage[];
}

export interface PlannerPost {
  id: string;
  blogId: number;
  scheduledAt: string;
  text: string;
  firstComment: string;
  media: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }>;
  networks: NetworkKey[];
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  notes: string;
}

export interface DeletedPlannerPost extends PlannerPost {
  deletedAt: string;
}

export interface LibraryPostTemplate {
  id: string;
  blogId: number;
  title: string;
  text: string;
  networks: NetworkKey[];
  tags: string[];
  createdAt: string;
}

export interface FlowExecutionLog {
  id: string;
  triggeredBy: string;
  actionTaken: string;
  status: 'SUCCESS' | 'SKIPPED';
  timestamp: string;
}

export interface AutomationFlow {
  id: string;
  blogId: number;
  name: string;
  network: 'instagram' | 'tiktok' | 'facebook';
  commentTrigger: 'all' | 'withKeywords';
  keywords: string[];
  publicReplies: string[];
  dmText: string;
  followUpText: string;
  buttonText: string;
  buttonUrl: string;
  status: 'ACTIVE' | 'PAUSED';
  executionsCount: number;
  executions: FlowExecutionLog[];
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  network: 'instagram' | 'tiktok' | 'facebook';
  commentTrigger: 'all' | 'withKeywords';
  keywords: string[];
  publicReplies: string[];
  dmText: string;
  buttonText: string;
}

export interface ReviewTask {
  id: string;
  blogId: number;
  postId: string;
  postText: string;
  network: NetworkKey;
  scheduledAt: string;
  requesterEmail: string;
  assigneeEmail: string;
  direction: 'received' | 'sent';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerNote: string;
  createdAt: string;
}

export interface AutoList {
  id: string;
  blogId: number;
  name: string;
  active: boolean;
  networks: NetworkKey[];
  scheduleRule: string;
  postsCount: number;
}

export interface SmartLinkButton {
  id: string;
  label: string;
  url: string;
  active: boolean;
  clicks: number;
}

export interface SmartLink {
  id: string;
  blogId: number;
  slug: string;
  title: string;
  description: string;
  theme: {
    backgroundColor: string;
    buttonColor: string;
    buttonTextColor: string;
  };
  buttons: SmartLinkButton[];
  views: number;
}

export interface AdCampaign {
  id: string;
  blogId: number;
  platform: 'metaAds' | 'googleAds' | 'tiktokAds';
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED';
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface AdGroup {
  id: string;
  blogId: number;
  campaignId: string;
  campaignName: string;
  platform: 'metaAds' | 'googleAds' | 'tiktokAds';
  name: string;
  bidStrategy: string;
  dailyBudget: number;
  spend: number;
  clicks: number;
  cpa: number;
  status: 'ACTIVE' | 'PAUSED';
}

export interface AdCreative {
  id: string;
  blogId: number;
  adGroupName: string;
  platform: 'metaAds' | 'googleAds' | 'tiktokAds';
  headline: string;
  format: 'Carousel' | 'Responsive Search' | 'Short Video';
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  status: 'ACTIVE' | 'PAUSED';
}

export interface AdKeyword {
  id: string;
  blogId: number;
  keyword: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  cpc: number;
  impressions: number;
  clicks: number;
  conversions: number;
  qualityScore: number;
}

export interface AdRecommendation {
  id: string;
  blogId: number;
  platform: 'metaAds' | 'googleAds' | 'tiktokAds';
  title: string;
  impact: string;
  category: 'Budget' | 'Keywords' | 'Creative';
  applied: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'CLIENT_REVIEWER';
  kind: 'user' | 'team' | 'client';
  assignedBrands: number[];
  status: 'ACTIVE' | 'INVITED';
}

export interface AgencySettings {
  id: string;
  organizationName: string;
  customDomain: string;
  defaultLocale: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  senderEmail: string;
  lastTestStatus: string | null;
}

export interface AffiliationState {
  referralCode: string;
  referralUrl: string;
  payoutEmail: string;
  commissionRatePct: number;
  clicks: number;
  signups: number;
  paidConversions: number;
  pendingCommissionUsd: number;
  paidCommissionUsd: number;
  payouts: Array<{
    id: string;
    date: string;
    amountUsd: number;
    status: 'PAID' | 'SCHEDULED';
  }>;
}

export interface CouponItem {
  id: string;
  code: string;
  discountPct: number;
  planTarget: string;
  redemptions: number;
  maxRedemptions: number;
  active: boolean;
}

export interface InvoiceItem {
  id: string;
  date: string;
  customerEmail: string;
  plan: string;
  amountUsd: number;
  status: 'PAID' | 'REFUNDED';
}

export interface AttributionEvent {
  id: string;
  visitorId: string;
  sessionId: string;
  type: 'session' | 'event' | 'telemetry';
  path: string;
  eventName: string;
  utmSource: string | null;
  utmMedium: string | null;
  referral: string | null;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: 'update' | 'unread';
  createdAt: string;
  read: boolean;
}

export interface BeeloftDatabase {
  user: UserProfile;
  brands: Brand[];
  metricsSeries: Record<string, Record<string, DailyMetricPoint[]>>;
  topPosts: EvolutionPostRow[];
  hashtags: HashtagTrack[];
  competitors: CompetitorProfile[];
  systemTemplates: ReportTemplate[];
  customTemplates: ReportTemplate[];
  reportsHistory: ReportArchiveItem[];
  studioReports: StudioReport[];
  campaignsDashboard: CampaignDashboardItem[];
  inboxThreads: InboxThread[];
  plannerPosts: PlannerPost[];
  deletedPosts: DeletedPlannerPost[];
  libraryPosts: LibraryPostTemplate[];
  flows: AutomationFlow[];
  flowTemplates: FlowTemplate[];
  reviewTasks: ReviewTask[];
  autolists: AutoList[];
  smartLinks: SmartLink[];
  adCampaigns: AdCampaign[];
  adGroups: AdGroup[];
  adCreatives: AdCreative[];
  adKeywords: AdKeyword[];
  adRecommendations: AdRecommendation[];
  teamMembers: TeamMember[];
  agencySettings: AgencySettings;
  affiliation: AffiliationState;
  coupons: CouponItem[];
  invoices: InvoiceItem[];
  attributionEvents: AttributionEvent[];
  notifications: AppNotification[];
}

export interface DataStore {
  get(): Promise<BeeloftDatabase>;
  persist(): Promise<void>;
}

export interface CookieOptions {
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  httpOnly?: boolean;
  secure?: boolean;
  maxAge?: number;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}

export interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array> | null;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
  size: number;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

export interface WorkersAiLike {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface EdgeEnv {
  DB?: D1DatabaseLike;
  MEDIA_BUCKET?: R2BucketLike;
  AI?: WorkersAiLike;
  PUBLIC_APP_URL?: string;
  ADMIN_EMAIL?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  RESEND_API_KEY?: string;
  MAILCHANNELS_API_KEY?: string;
  SMTP_RELAY_URL?: string;
  EMAIL_FROM?: string;
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_IS_PRODUCTION?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export interface UserAccountRow {
  userId: number;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  apiToken: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  plan: UserProfile['plan'];
  status: UserProfile['status'];
  emailVerified: boolean;
  verificationToken: string | null;
  role: 'ADMIN' | 'USER';
  workspace: BeeloftDatabase;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRow {
  tokenHash: string;
  userId: number;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PasswordResetRow {
  tokenHash: string;
  userId: number;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface InvitationRow {
  token: string;
  ownerUserId: number;
  email: string;
  name: string;
  role: TeamMember['role'];
  kind: TeamMember['kind'];
  assignedBrands: number[];
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
}

export interface BrandIndexRow {
  blogId: number;
  userId: number;
  trackingKey: string;
  domain: string | null;
  updatedAt: string;
}

export interface WebEventRow {
  id: string;
  blogId: number;
  visitorId: string;
  sessionId: string;
  eventType: 'session' | 'pageview' | 'event' | 'telemetry' | 'smartlink_click';
  path: string;
  eventName: string;
  utmSource: string | null;
  utmMedium: string | null;
  referrer: string | null;
  countryCode: string | null;
  countryName: string | null;
  createdAt: string;
}

export interface OAuthStateRow {
  state: string;
  userId: number;
  blogId: number;
  network: NetworkKey;
  codeVerifier: string | null;
  redirectOrigin: string;
  createdAt: string;
}

export interface OAuthCredentialRow {
  blogId: number;
  userId: number;
  network: NetworkKey;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  accountId: string | null;
  accountHandle: string | null;
  updatedAt: string;
}

export interface MediaAssetRow {
  id: string;
  userId: number;
  blogId: number;
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
  filename: string;
  dataBase64: string | null;
  createdAt: string;
}

export interface PaymentOrderRow {
  orderId: string;
  userId: number;
  plan: UserProfile['plan'];
  amountIdr: number;
  amountUsd: number;
  provider: 'midtrans' | 'stripe' | 'coupon_100';
  providerRef: string | null;
  checkoutUrl: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  couponCode: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface PlatformGlobalMeta {
  coupons: CouponItem[];
  invoices: InvoiceItem[];
  featureFlags: Record<string, boolean>;
  apiCallsToday: number;
  apiCallsDate: string;
}

export interface PlatformRepository {
  readonly driver: 'd1' | 'local-file' | 'memory';
  ensureReady(): Promise<void>;
  countUsers(): Promise<number>;
  listUsers(): Promise<Array<Pick<UserAccountRow, 'userId' | 'email' | 'name' | 'plan' | 'status' | 'role' | 'createdAt'>>>;
  getUserById(userId: number): Promise<UserAccountRow | null>;
  getUserByEmail(email: string): Promise<UserAccountRow | null>;
  getUserByApiToken(apiToken: string): Promise<UserAccountRow | null>;
  getUserByVerificationToken(token: string): Promise<UserAccountRow | null>;
  allocateIds(): Promise<{ userId: number; blogId: number }>;
  allocateBlogId(): Promise<number>;
  saveUser(user: UserAccountRow): Promise<void>;

  createSession(session: SessionRow): Promise<void>;
  getSession(tokenHash: string): Promise<SessionRow | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: number): Promise<void>;

  createPasswordReset(reset: PasswordResetRow): Promise<void>;
  getPasswordReset(tokenHash: string): Promise<PasswordResetRow | null>;
  markPasswordResetUsed(tokenHash: string): Promise<void>;

  createInvitation(inv: InvitationRow): Promise<void>;
  getInvitation(token: string): Promise<InvitationRow | null>;
  markInvitationAccepted(token: string): Promise<void>;

  getBrandOwner(blogId: number): Promise<BrandIndexRow | null>;
  getBrandByTrackingKey(trackingKey: string): Promise<BrandIndexRow | null>;

  getPublicSmartLinkOwner(slug: string): Promise<{ userId: number; blogId: number; linkId: string } | null>;
  getPublicStudioReportOwner(reportId: string): Promise<{ userId: number; blogId: number } | null>;

  insertWebEvent(ev: WebEventRow): Promise<void>;
  listWebEventsSince(blogId: number, sinceIso: string, limit?: number): Promise<WebEventRow[]>;
  listVisitorEvents(visitorId: string, limit?: number): Promise<WebEventRow[]>;

  saveOAuthState(row: OAuthStateRow): Promise<void>;
  consumeOAuthState(state: string): Promise<OAuthStateRow | null>;
  saveOAuthCredential(row: OAuthCredentialRow): Promise<void>;
  getOAuthCredential(blogId: number, network: NetworkKey): Promise<OAuthCredentialRow | null>;
  deleteOAuthCredential(blogId: number, network: NetworkKey): Promise<void>;

  saveMediaAsset(row: MediaAssetRow): Promise<void>;
  getMediaAsset(id: string): Promise<MediaAssetRow | null>;
  listMediaAssets(blogId: number): Promise<Array<Omit<MediaAssetRow, 'dataBase64'>>>;

  savePaymentOrder(row: PaymentOrderRow): Promise<void>;
  getPaymentOrder(orderId: string): Promise<PaymentOrderRow | null>;
  listUserPaymentOrders(userId: number): Promise<PaymentOrderRow[]>;

  getGlobalMeta(): Promise<PlatformGlobalMeta>;
  saveGlobalMeta(meta: PlatformGlobalMeta): Promise<void>;
  incrementApiCallCounter(): Promise<number>;
}

export interface RouteRequest {
  body?: unknown;
  rawBody?: string;
  query?: unknown;
  params?: unknown;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
  ip?: string;
  countryCode?: string;
  origin?: string;
  env?: EdgeEnv;
}

export interface RouteReply {
  code(status: number): RouteReply;
  setCookie(name: string, val: string, opts?: CookieOptions): RouteReply;
  clearCookie(name: string, opts?: CookieOptions): RouteReply;
  header(key: string, val: string): RouteReply;
}

export type RouteHandler = (req: RouteRequest, reply: RouteReply) => Promise<unknown> | unknown;

export interface RouteRegistry {
  get(path: string, h: RouteHandler): void;
  post(path: string, h: RouteHandler): void;
  put(path: string, h: RouteHandler): void;
  patch(path: string, h: RouteHandler): void;
  delete(path: string, h: RouteHandler): void;
}
