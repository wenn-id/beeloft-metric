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

export interface BrandSummary {
  blogId: number;
  userId?: number;
  name: string;
  timezone: string;
  currency: string;
  isSample: boolean;
  trackingKey?: string;
  websiteDomain?: string;
  connectionsCount: number;
}

export interface BrandConnection {
  network: NetworkKey;
  label: string;
  category: 'websites' | 'social' | 'business' | 'advertising' | 'integrations';
  connected: boolean;
  accountId: string | null;
  accountHandle: string | null;
  lastSync: string | null;
}

export interface UserStatus {
  userId: number;
  email: string;
  name: string;
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
  features: Record<string, boolean>;
  brands: BrandSummary[];
}

export interface DailyMetricPoint {
  date: string;
  impressions: number;
  reach: number;
  followers: number;
  interactions: number;
  clicks: number;
}

export interface EvolutionKpi {
  id: string;
  label: string;
  value: number | string;
  deltaText: string;
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

export interface EvolutionSummaryResponse {
  connected: boolean;
  network: string;
  networkLabel?: string;
  accountHandle?: string | null;
  brandName: string;
  isSample: boolean;
  periodLabel: string;
  comparisonPeriodLabel: string;
  connectedCount?: number;
  kpis: EvolutionKpi[];
  series: DailyMetricPoint[];
  topPosts: EvolutionPostRow[];
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

export interface LibraryPostTemplate {
  id: string;
  blogId: number;
  title: string;
  text: string;
  networks: NetworkKey[];
  tags: string[];
  createdAt: string;
}

export interface DeletedPlannerPost extends PlannerPost {
  deletedAt: string;
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
  executions: Array<{
    id: string;
    triggeredBy: string;
    actionTaken: string;
    status: 'SUCCESS' | 'SKIPPED';
    timestamp: string;
  }>;
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

export interface BrandDetails {
  blogId: number;
  userId: number;
  name: string;
  timezone: string;
  currency: string;
  isSample: boolean;
  trackingKey?: string;
  websiteDomain?: string;
  engagementRatioMode: 'REACH' | 'FOLLOWERS';
  tags: string[];
  whiteLabel: {
    enabled: boolean;
    logoText: string;
    primaryColor: string;
    footerNote: string;
  };
  aiConfig: {
    tone: string;
    targetAudience: string;
    brandVoice: string;
    bannedWords: string;
  };
  integrations: {
    canva: boolean;
    googleDrive: boolean;
    slack: boolean;
    zapier: boolean;
    adobeExpress: boolean;
    lookerStudio: boolean;
  };
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

export interface BackofficeOverview {
  usersList: Array<{
    userId: number;
    email: string;
    name: string;
    plan: string;
    status: string;
  }>;
  deletedBrands: Array<{ blogId: number; name: string }>;
  coupons: Array<{
    id: string;
    code: string;
    discountPct: number;
    planTarget: string;
    redemptions: number;
    maxRedemptions: number;
    active: boolean;
  }>;
  invoices: Array<{
    id: string;
    date: string;
    customerEmail: string;
    plan: string;
    amountUsd: number;
    status: string;
  }>;
  featureFlags: Record<string, boolean>;
  apiConsumption: {
    callsToday: number;
    quotaPerDay: number;
  };
  buildInfo: {
    version: string;
    referenceBuild: string;
    runtime: string;
  };
}
