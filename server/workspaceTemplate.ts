import { buildConnectionMap } from './seed.js';
import { randomToken } from './security/crypto.js';
import type {
  BeeloftDatabase,
  Brand,
  FlowTemplate,
  ReportTemplate,
  UserAccountRow,
  UserProfile
} from './types.js';

export const NEW_USER_TRIAL_DAYS = 7;
export const NEW_USER_TRIAL_PLAN: UserProfile['plan'] = 'STARTER';
export const UNLIMITED_BRAND_LIMIT = 999_999;

export interface PlanQuotaSpec {
  id: UserProfile['plan'];
  label: string;
  brandLimit: number;
  monthlyScheduledPostLimit: number | null;
  priceIdr: number;
  priceUsd: number;
  allowPptxExport: boolean;
  allowWhiteLabel: boolean;
}

export const PLAN_QUOTAS: Record<UserProfile['plan'], PlanQuotaSpec> = {
  FREE: {
    id: 'FREE',
    label: 'Free',
    brandLimit: 1,
    monthlyScheduledPostLimit: 20,
    priceIdr: 0,
    priceUsd: 0,
    allowPptxExport: false,
    allowWhiteLabel: false
  },
  STARTER: {
    id: 'STARTER',
    label: 'Starter',
    brandLimit: 5,
    monthlyScheduledPostLimit: 2000,
    priceIdr: 285_000,
    priceUsd: 18,
    allowPptxExport: false,
    allowWhiteLabel: false
  },
  ADVANCED: {
    id: 'ADVANCED',
    label: 'Advanced',
    brandLimit: 15,
    monthlyScheduledPostLimit: null,
    priceIdr: 715_000,
    priceUsd: 45,
    allowPptxExport: true,
    allowWhiteLabel: false
  },
  ENTERPRISE_CUSTOM: {
    id: 'ENTERPRISE_CUSTOM',
    label: 'Enterprise Custom',
    brandLimit: 50,
    monthlyScheduledPostLimit: null,
    priceIdr: 2_350_000,
    priceUsd: 149,
    allowPptxExport: true,
    allowWhiteLabel: true
  }
};

export const SYSTEM_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tpl-monthly',
    name: 'Monthly Cross-Channel Performance',
    description: 'Executive summary of reach, impressions, follower growth, and top posts across connected channels.',
    kind: 'system',
    sections: ['Brand Summary KPIs', 'Daily Evolution Curve', 'Top Performing Posts', 'Channel Breakdown']
  },
  {
    id: 'tpl-ads-roi',
    name: 'Paid Campaigns & Attribution Review',
    description: 'Consolidated spend, clicks, conversions, ROAS, and first-party UTM session attribution.',
    kind: 'system',
    sections: ['Campaign Spend & ROAS', 'Ad Groups & Keywords', 'SmartLink Clicks', 'Web Attribution']
  }
];

export const SYSTEM_FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'ftpl-keyword-guide',
    name: 'Keyword Resource Delivery',
    description: 'Reply publicly to comments containing a trigger keyword and send the resource URL via DM.',
    network: 'instagram',
    commentTrigger: 'withKeywords',
    keywords: ['GUIDE', 'INFO', 'LINK'],
    publicReplies: ['Sent to your DM, check your inbox.', 'Just messaged you the link.'],
    dmText: 'Thanks for commenting. Here is the direct link you requested:',
    buttonText: 'Open resource'
  },
  {
    id: 'ftpl-launch-waitlist',
    name: 'Product Launch Registration DM',
    description: 'Automatically DM anyone commenting on release announcements with your registration SmartLink.',
    network: 'instagram',
    commentTrigger: 'withKeywords',
    keywords: ['JOIN', 'ACCESS'],
    publicReplies: ['Details are in your inbox.'],
    dmText: 'Welcome aboard. Tap below to complete your registration:',
    buttonText: 'Register now'
  }
];

export function createBrandRecord(params: {
  blogId: number;
  userId: number;
  name: string;
  timezone?: string;
  currency?: string;
}): Brand {
  const cleanName = params.name.trim() || 'Primary Workspace';
  return {
    blogId: params.blogId,
    userId: params.userId,
    name: cleanName,
    timezone: params.timezone || 'Asia/Jakarta',
    currency: params.currency || 'IDR',
    isSample: false,
    trackingKey: randomToken('bm_trk', 12),
    websiteDomain: '',
    engagementRatioMode: 'REACH',
    tags: [],
    whiteLabel: {
      enabled: false,
      logoText: cleanName,
      primaryColor: '#5d2a1a',
      footerNote: ''
    },
    aiConfig: {
      tone: 'Clear, direct, practitioner-focused',
      targetAudience: '',
      brandVoice: '',
      bannedWords: ''
    },
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
}

export function createCleanUserWorkspace(params: {
  userId: number;
  blogId: number;
  email: string;
  name: string;
  apiToken: string;
  plan?: UserProfile['plan'];
  startTrial?: boolean;
  isAdmin?: boolean;
  emailVerified?: boolean;
  origin?: string;
}): BeeloftDatabase {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const useTrial = !params.isAdmin && params.startTrial !== false;
  const plan: UserProfile['plan'] = params.isAdmin
    ? 'ENTERPRISE_CUSTOM'
    : useTrial
      ? NEW_USER_TRIAL_PLAN
      : params.plan || 'FREE';
  const trialEndsAt = useTrial
    ? new Date(nowMs + NEW_USER_TRIAL_DAYS * 86400000).toISOString()
    : null;
  const validUntil = params.isAdmin
    ? '2099-12-31T23:59:59.000Z'
    : (trialEndsAt ?? new Date(nowMs + 365 * 86400000).toISOString());
  const quota = PLAN_QUOTAS[plan];
  const effectiveBrandLimit = params.isAdmin ? UNLIMITED_BRAND_LIMIT : quota.brandLimit;
  const baseOrigin = (params.origin || 'https://beeloftmetric.biz.id').replace(/\/+$/, '');
  const brandName = `${params.name.trim() || 'My'} Workspace`;
  const primaryBrand = createBrandRecord({
    blogId: params.blogId,
    userId: params.userId,
    name: brandName,
    timezone: 'Asia/Jakarta',
    currency: 'IDR'
  });

  const referralCode = `BM${params.userId}`;
  const authorities = ['ROLE_USER'];
  if (plan === 'ENTERPRISE_CUSTOM') authorities.push('ROLE_ENTERPRISE');
  if (params.isAdmin) authorities.push('ROLE_ADMIN');

  return {
    user: {
      userId: params.userId,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      passwordHash: 'redacted',
      registered: now,
      trialUsed: useTrial,
      trialDays: NEW_USER_TRIAL_DAYS,
      trialActive: useTrial,
      trialEndsAt,
      trialDaysRemaining: useTrial ? NEW_USER_TRIAL_DAYS : 0,
      plan,
      status: 'ACTIVE',
      emailVerified: Boolean(params.emailVerified || params.isAdmin),
      role: params.isAdmin ? 'ADMIN' : 'USER',
      validUntil,
      brandLimit: effectiveBrandLimit,
      apiToken: params.apiToken,
      totpEnabled: false,
      approvedMcpScopes: ['mcp:evolution:read', 'mcp:planner:write', 'mcp:reports:read'],
      features: {
        HIDE_HASHTAG_TRACKER: false,
        ENABLE_AI_TEXT: true,
        ENABLE_STUDIO: true,
        ENABLE_FLOWS: true,
        ENABLE_BACKOFFICE: Boolean(params.isAdmin)
      },
      authorities
    },
    brands: [primaryBrand],
    metricsSeries: {},
    topPosts: [],
    hashtags: [],
    competitors: [],
    systemTemplates: SYSTEM_REPORT_TEMPLATES,
    customTemplates: [],
    reportsHistory: [],
    studioReports: [],
    campaignsDashboard: [],
    inboxThreads: [],
    plannerPosts: [],
    deletedPosts: [],
    libraryPosts: [],
    flows: [],
    flowTemplates: SYSTEM_FLOW_TEMPLATES,
    reviewTasks: [],
    autolists: [],
    smartLinks: [],
    adCampaigns: [],
    adGroups: [],
    adCreatives: [],
    adKeywords: [],
    adRecommendations: [],
    teamMembers: [
      {
        id: `tm-owner-${params.userId}`,
        name: params.name.trim(),
        email: params.email.trim().toLowerCase(),
        role: 'OWNER',
        kind: 'user',
        assignedBrands: [params.blogId],
        status: 'ACTIVE'
      }
    ],
    agencySettings: {
      id: `org-${params.userId}`,
      organizationName: brandName,
      customDomain: 'beeloftmetric.biz.id',
      defaultLocale: 'id',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      senderEmail: params.email.trim().toLowerCase(),
      lastTestStatus: null
    },
    affiliation: {
      referralCode,
      referralUrl: `${baseOrigin}/register?ref=${referralCode}`,
      payoutEmail: params.email.trim().toLowerCase(),
      commissionRatePct: 20,
      clicks: 0,
      signups: 0,
      paidConversions: 0,
      pendingCommissionUsd: 0,
      paidCommissionUsd: 0,
      payouts: []
    },
    coupons: [],
    invoices: [],
    attributionEvents: [],
    notifications: [
      {
        id: `ntf-welcome-${params.userId}`,
        title: params.isAdmin
          ? 'Unlimited Owner Workspace Active'
          : useTrial
            ? '7-day Starter free trial active'
            : 'Workspace ready on BeeloftMetric',
        body: params.isAdmin
          ? 'All BeeloftMetric features, brands, scheduled posts, PDF/PPTX reports, White Label branding, and Operator Backoffice are permanently unlocked without limits.'
          : useTrial
            ? `Your 7-day Starter free trial is active until ${trialEndsAt!.slice(0, 10)} (up to 5 brands, 2,000 monthly posts, and report exports).`
            : 'Connect your website tracker or social channels in Brand Connections to start recording live telemetry.',
        category: 'update',
        createdAt: now,
        read: false
      }
    ]
  };
}

export function evaluateUserTrialStatus(user: UserAccountRow, nowMs = Date.now()): boolean {
  const u = user.workspace.user;
  if (!u.trialActive || !u.trialEndsAt) {
    u.trialDaysRemaining = 0;
    return false;
  }

  const endMs = Date.parse(u.trialEndsAt);
  if (!Number.isFinite(endMs)) {
    u.trialActive = false;
    u.trialDaysRemaining = 0;
    return true;
  }

  if (nowMs >= endMs) {
    user.plan = 'FREE';
    u.plan = 'FREE';
    u.trialActive = false;
    u.trialDaysRemaining = 0;
    u.brandLimit = PLAN_QUOTAS.FREE.brandLimit;
    user.workspace.notifications.unshift({
      id: `ntf-trial-ended-${user.userId}-${nowMs}`,
      title: '7-day free trial ended',
      body: 'Your 7-day Starter free trial has ended and your workspace is now on the Free plan. Upgrade anytime in Subscription & Plan.',
      category: 'unread',
      createdAt: new Date(nowMs).toISOString(),
      read: false
    });
    user.workspace.notifications = user.workspace.notifications.slice(0, 50);
    return true;
  }

  u.trialDaysRemaining = Math.max(1, Math.ceil((endMs - nowMs) / 86400000));
  return false;
}
