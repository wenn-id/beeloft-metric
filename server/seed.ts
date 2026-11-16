import type {
  BeeloftDatabase,
  BrandConnection,
  DailyMetricPoint,
  NetworkKey
} from './types.js';

export const NETWORK_CATALOG: Array<{
  network: NetworkKey;
  label: string;
  category: BrandConnection['category'];
}> = [
  { network: 'web', label: 'Website & Blog', category: 'websites' },
  { network: 'instagram', label: 'Instagram', category: 'social' },
  { network: 'facebook', label: 'Facebook Page', category: 'social' },
  { network: 'tiktok', label: 'TikTok', category: 'social' },
  { network: 'youtube', label: 'YouTube', category: 'social' },
  { network: 'linkedin', label: 'LinkedIn', category: 'social' },
  { network: 'twitter', label: 'X (Twitter)', category: 'social' },
  { network: 'pinterest', label: 'Pinterest', category: 'social' },
  { network: 'threads', label: 'Threads', category: 'social' },
  { network: 'bluesky', label: 'Bluesky', category: 'social' },
  { network: 'twitch', label: 'Twitch', category: 'social' },
  { network: 'gmb', label: 'Google Business Profile', category: 'business' },
  { network: 'metaAds', label: 'Meta Ads', category: 'advertising' },
  { network: 'googleAds', label: 'Google Ads', category: 'advertising' },
  { network: 'tiktokAds', label: 'TikTok Ads', category: 'advertising' }
];

export function buildConnectionMap(
  connectedOverrides: Partial<Record<NetworkKey, string>>
): Record<NetworkKey, BrandConnection> {
  const map = {} as Record<NetworkKey, BrandConnection>;
  const now = new Date('2026-11-16T09:00:00Z').toISOString();
  for (const item of NETWORK_CATALOG) {
    const handle = connectedOverrides[item.network] ?? null;
    map[item.network] = {
      network: item.network,
      label: item.label,
      category: item.category,
      connected: Boolean(handle),
      accountId: handle ? `${item.network}-${handle.replace(/[^a-zA-Z0-9]/g, '')}` : null,
      accountHandle: handle,
      lastSync: handle ? now : null
    };
  }
  return map;
}

function buildDailySeries(
  baseFollowers: number,
  dailyImpressions: number,
  dailyReach: number,
  seedOffset: number
): DailyMetricPoint[] {
  const points: DailyMetricPoint[] = [];
  const start = new Date('2026-09-18T00:00:00Z');
  for (let i = 0; i < 60; i += 1) {
    const d = new Date(start.getTime() + i * 86400000);
    const trend = 0.88 + (i / 60) * 0.24;
    const wave = Math.sin((i + seedOffset) * 0.55) * 0.16 + trend;
    const impressions = Math.round(dailyImpressions * wave);
    const reach = Math.round(dailyReach * wave);
    const interactions = Math.round(reach * 0.048);
    const clicks = Math.round(reach * 0.019);
    points.push({
      date: d.toISOString().slice(0, 10),
      impressions,
      reach,
      followers: baseFollowers + i * 14 + (i % 3) * 3,
      interactions,
      clicks
    });
  }
  return points;
}

export function createInitialDatabase(): BeeloftDatabase {
  const sampleBlogId = 8137744;
  const emptyBlogId = 8137743;
  const userId = 6401427;

  return {
    user: {
      userId,
      email: 'operator@beeloftmetric.local',
      name: 'Beeloft Operator',
      passwordHash: 'demo-local-only',
      registered: '2026-10-01T08:00:00Z',
      trialUsed: false,
      trialDays: 30,
      plan: 'ENTERPRISE_CUSTOM',
      status: 'ACTIVE',
      validUntil: '2027-10-01T08:00:00Z',
      brandLimit: 10,
      apiToken: 'bm_live_6401427_9f2a4b8c1d0e',
      totpEnabled: true,
      approvedMcpScopes: ['mcp:evolution:read', 'mcp:planner:write', 'mcp:reports:read'],
      features: {
        HIDE_HASHTAG_TRACKER: false,
        ENABLE_AI_TEXT: true,
        ENABLE_STUDIO: true,
        ENABLE_FLOWS: true,
        ENABLE_BACKOFFICE: true
      },
      authorities: ['ROLE_USER', 'ROLE_ENTERPRISE', 'ROLE_ADMIN']
    },
    brands: [
      {
        blogId: sampleBlogId,
        userId,
        name: 'Beeloft Studio [SAMPLE DATA]',
        timezone: 'Asia/Jakarta',
        currency: 'USD',
        isSample: true,
        engagementRatioMode: 'REACH',
        tags: ['Q4-Launch', 'Product-Demo', 'Evergreen'],
        whiteLabel: {
          enabled: true,
          logoText: 'Beeloft Studio Reporting',
          primaryColor: '#5d2a1a',
          footerNote: 'Prepared inside BeeloftMetric WhiteLabel Studio'
        },
        aiConfig: {
          tone: 'Clear, direct, practitioner-focused',
          targetAudience: 'Social media managers and performance marketers',
          brandVoice: 'Avoid hype words; lead with concrete workflow outcomes.',
          bannedWords: 'revolutionary, unlock, seamless'
        },
        integrations: {
          canva: true,
          googleDrive: true,
          slack: true,
          zapier: false,
          adobeExpress: false,
          lookerStudio: true
        },
        connections: buildConnectionMap({
          web: 'beeloft-studio.example',
          instagram: '@beeloft.studio',
          tiktok: '@beeloftstudio',
          youtube: 'Beeloft Studio Lab',
          linkedin: 'Beeloft Digital Co.',
          metaAds: 'act_813774401',
          googleAds: 'gads_813774402'
        })
      },
      {
        blogId: emptyBlogId,
        userId,
        name: 'Empty brand',
        timezone: 'Asia/Jakarta',
        currency: 'USD',
        isSample: false,
        engagementRatioMode: 'REACH',
        tags: [],
        whiteLabel: {
          enabled: false,
          logoText: 'Empty brand',
          primaryColor: '#17191c',
          footerNote: ''
        },
        aiConfig: {
          tone: 'Neutral informative',
          targetAudience: 'General audience',
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
      }
    ],
    metricsSeries: {
      [String(sampleBlogId)]: {
        web: buildDailySeries(0, 3200, 2100, 1),
        instagram: buildDailySeries(14200, 8400, 6100, 2),
        tiktok: buildDailySeries(9800, 12500, 9400, 4),
        youtube: buildDailySeries(4150, 5100, 3900, 6),
        linkedin: buildDailySeries(2890, 2700, 1950, 8)
      }
    },
    topPosts: [
      {
        id: 'post-101',
        blogId: sampleBlogId,
        network: 'instagram',
        title: 'Product release checklist for Q4 social campaigns [SAMPLE DATA]',
        publishedAt: '2026-11-12T10:30:00Z',
        format: 'Carousel',
        impressions: 18420,
        reach: 13910,
        engagementRate: 5.4,
        clicks: 412
      },
      {
        id: 'post-102',
        blogId: sampleBlogId,
        network: 'tiktok',
        title: 'Behind the scenes: scheduling a full week in 15 minutes [SAMPLE DATA]',
        publishedAt: '2026-11-10T14:00:00Z',
        format: 'Short Video',
        impressions: 34200,
        reach: 28900,
        engagementRate: 6.8,
        clicks: 618
      },
      {
        id: 'post-103',
        blogId: sampleBlogId,
        network: 'linkedin',
        title: 'How we measure paid ROAS alongside organic reach [SAMPLE DATA]',
        publishedAt: '2026-11-08T08:15:00Z',
        format: 'Document',
        impressions: 7450,
        reach: 5210,
        engagementRate: 4.1,
        clicks: 289
      },
      {
        id: 'post-104',
        blogId: sampleBlogId,
        network: 'youtube',
        title: 'Monthly reporting walkthrough for client stakeholders [SAMPLE DATA]',
        publishedAt: '2026-11-05T11:00:00Z',
        format: 'Video',
        impressions: 11200,
        reach: 8430,
        engagementRate: 4.9,
        clicks: 374
      }
    ],
    hashtags: [
      {
        id: 'ht-1',
        blogId: sampleBlogId,
        hashtag: '#beeloftworkflow',
        network: 'instagram',
        postsCount: 42,
        impressions: 58400,
        trackedAt: '2026-11-15T07:00:00Z'
      },
      {
        id: 'ht-2',
        blogId: sampleBlogId,
        hashtag: '#contentops',
        network: 'tiktok',
        postsCount: 28,
        impressions: 41900,
        trackedAt: '2026-11-14T16:30:00Z'
      }
    ],
    competitors: [
      {
        id: 'comp-1',
        blogId: sampleBlogId,
        network: 'instagram',
        handle: '@socialbenchmark.lab',
        name: 'Social Benchmark Lab [SAMPLE DATA]',
        followers: 24800,
        postsCount: 31,
        likesPerPost: 620,
        engagementRate: 4.3
      },
      {
        id: 'comp-2',
        blogId: sampleBlogId,
        network: 'tiktok',
        handle: '@creativemetrics.id',
        name: 'Creative Metrics ID [SAMPLE DATA]',
        followers: 19200,
        postsCount: 24,
        likesPerPost: 910,
        engagementRate: 5.7
      }
    ],
    systemTemplates: [
      {
        id: 'tpl-monthly',
        name: 'Monthly Channel Summary',
        description: 'Follower growth, impressions, and top performing content across connected profiles.',
        kind: 'system',
        sections: ['Brand Summary KPIs', 'Instagram Overview', 'TikTok Overview', 'Top 5 Posts']
      },
      {
        id: 'tpl-executive',
        name: 'Executive Paid + Organic Overview',
        description: 'Combines organic community metrics with Meta Ads and Google Ads ROAS performance.',
        kind: 'system',
        sections: ['Executive KPIs', 'Meta Ads Performance', 'Google Ads Keywords']
      },
      {
        id: 'tpl-social',
        name: 'Social Media Deck',
        description: 'Visual comparison of Reels, Carousels, Shorts, and posting frequency.',
        kind: 'system',
        sections: ['Posting Cadence', 'Format Breakdown', 'Engagement Comparison']
      }
    ],
    customTemplates: [
      {
        id: 'tpl-custom-1',
        name: 'Beeloft Weekly Sprint Report [SAMPLE DATA]',
        description: 'Internal weekly review focusing on SmartLink clicks and Inbox resolution speed.',
        kind: 'custom',
        sections: ['Weekly Deltas', 'SmartLink Conversions', 'Inbox SLAs']
      }
    ],
    reportsHistory: [
      {
        id: 'rep-201',
        blogId: sampleBlogId,
        title: 'October 2026 Monthly Summary [SAMPLE DATA]',
        templateId: 'tpl-monthly',
        format: 'PDF',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
        createdAt: '2026-11-01T09:15:00Z',
        status: 'READY',
        summaryMetrics: {
          impressions: 184300,
          reach: 132400,
          followersDelta: 612,
          postsPublished: 24
        }
      }
    ],
    studioReports: [
      {
        id: 'stu-1',
        blogId: sampleBlogId,
        title: 'Q4 Cross-Channel Studio Deck [SAMPLE DATA]',
        updatedAt: '2026-11-15T12:00:00Z',
        publicEnabled: true,
        blocks: [
          { id: 'blk-1', type: 'KPI_GRID', title: '30-Day Core Growth KPIs' },
          { id: 'blk-2', type: 'LINE_CHART', title: 'Organic Reach Trend' },
          { id: 'blk-3', type: 'TOP_POSTS', title: 'Top Content Ranking' },
          {
            id: 'blk-4',
            type: 'TEXT_BLOCK',
            title: 'Analyst Summary',
            content: 'Short-form video drove 62% of referral clicks into SmartLink campaigns.'
          }
        ]
      }
    ],
    campaignsDashboard: [
      {
        id: 'cd-1',
        blogId: sampleBlogId,
        name: 'Q4 Product Release Sprint [SAMPLE DATA]',
        tag: 'Q4-Launch',
        startDate: '2026-10-20',
        endDate: '2026-11-30',
        postsCount: 14,
        impressions: 124500,
        clicks: 3120,
        archived: false
      }
    ],
    inboxThreads: [
      {
        id: 'thr-1',
        blogId: sampleBlogId,
        network: 'instagram',
        channelType: 'DM',
        contactName: 'Rina P. [SAMPLE DATA]',
        contactHandle: '@rina.crafts',
        status: 'UNREAD',
        updatedAt: '2026-11-16T08:42:00Z',
        messages: [
          {
            id: 'msg-1',
            sender: 'contact',
            authorName: 'Rina P.',
            text: 'Halo tim, apakah jadwal posting TikTok bisa otomatis dengan komentar pertama?',
            sentAt: '2026-11-16T08:42:00Z'
          }
        ]
      },
      {
        id: 'thr-2',
        blogId: sampleBlogId,
        network: 'youtube',
        channelType: 'COMMENT',
        contactName: 'Doni K. [SAMPLE DATA]',
        contactHandle: '@doni.kreatif',
        status: 'PENDING',
        updatedAt: '2026-11-15T19:10:00Z',
        messages: [
          {
            id: 'msg-2',
            sender: 'contact',
            authorName: 'Doni K.',
            text: 'Template laporan PDF bulanan sangat membantu saat meeting klien.',
            sentAt: '2026-11-15T18:55:00Z'
          },
          {
            id: 'msg-3',
            sender: 'operator',
            authorName: 'Beeloft Operator',
            text: 'Terima kasih Doni, versi PPTX editable juga tersedia di tab Reports.',
            sentAt: '2026-11-15T19:10:00Z'
          }
        ]
      }
    ],
    plannerPosts: [
      {
        id: 'pln-301',
        blogId: sampleBlogId,
        scheduledAt: '2026-11-16T12:00',
        text: 'Jadwal siaran ulang demo SmartLinks dan pelacakan UTM hari ini. [SAMPLE DATA]',
        firstComment: 'Link detail tersedia di bio SmartLink.',
        media: [],
        networks: ['instagram', 'linkedin'],
        status: 'SCHEDULED',
        notes: 'Checked copy length'
      },
      {
        id: 'pln-302',
        blogId: sampleBlogId,
        scheduledAt: '2026-11-17T18:30',
        text: 'Checklist audit mingguan untuk kampanye Meta dan Google Ads. [SAMPLE DATA]',
        firstComment: '',
        media: [],
        networks: ['tiktok', 'youtube'],
        status: 'SCHEDULED',
        notes: 'Best time peak window'
      },
      {
        id: 'pln-303',
        blogId: sampleBlogId,
        scheduledAt: '2026-11-14T09:00',
        text: 'Rangkuman performa konten minggu ke-2 November telah tersedia di studio laporan. [SAMPLE DATA]',
        firstComment: '',
        media: [],
        networks: ['instagram', 'tiktok'],
        status: 'PUBLISHED',
        notes: 'Published cleanly'
      }
    ],
    deletedPosts: [
      {
        id: 'pln-299',
        blogId: sampleBlogId,
        scheduledAt: '2026-11-19T11:00',
        text: 'Archived draft reminder for October recap. [SAMPLE DATA]',
        firstComment: '',
        media: [],
        networks: ['linkedin'],
        status: 'DRAFT',
        notes: 'Moved to trash during cleanup',
        deletedAt: '2026-11-15T16:00:00Z'
      }
    ],
    libraryPosts: [
      {
        id: 'lib-1',
        blogId: sampleBlogId,
        title: 'Weekly Case Study Prompt',
        text: 'How our content operations team tracks organic reach next to paid attribution in one sheet.',
        networks: ['linkedin', 'twitter'],
        tags: ['Evergreen'],
        createdAt: '2026-11-02T10:00:00Z'
      }
    ],
    flows: [
      {
        id: 'flw-1',
        blogId: sampleBlogId,
        name: 'Checklist Comment-to-DM [SAMPLE DATA]',
        network: 'instagram',
        commentTrigger: 'withKeywords',
        keywords: ['CHECKLIST', 'TEMPLATE', 'PDF'],
        publicReplies: ['Sent the checklist link directly to your DM.'],
        dmText: 'Here is the Q4 campaign checklist link from our latest post.',
        followUpText: 'Let us know if you need the PPTX export version.',
        buttonText: 'Open Checklist',
        buttonUrl: 'https://beeloftmetric.local/bio/beeloft-studio',
        status: 'ACTIVE',
        executionsCount: 19,
        executions: [
          {
            id: 'exe-1',
            triggeredBy: '@rina.crafts commented "TEMPLATE"',
            actionTaken: 'Sent public reply + DM with button',
            status: 'SUCCESS',
            timestamp: '2026-11-16T08:15:00Z'
          }
        ]
      }
    ],
    flowTemplates: [
      {
        id: 'ftpl-1',
        name: 'Comment-to-DM Lead Magnet',
        description: 'Replies publicly to keyword comments and delivers your asset link in direct messages.',
        network: 'instagram',
        commentTrigger: 'withKeywords',
        keywords: ['GUIDE', 'LINK'],
        publicReplies: ['Just sent the link to your messages.'],
        dmText: 'Thanks for commenting. Open the guide using the button below.',
        buttonText: 'Download Guide'
      },
      {
        id: 'ftpl-2',
        name: 'Support Keyword Triage',
        description: 'Routes pricing or billing inquiries to your support booking page automatically.',
        network: 'instagram',
        commentTrigger: 'withKeywords',
        keywords: ['PRICE', 'HARGA', 'SUPPORT'],
        publicReplies: ['Check your DM for plan details.'],
        dmText: 'You can compare all workspace tiers on our pricing page.',
        buttonText: 'View Pricing'
      }
    ],
    reviewTasks: [
      {
        id: 'tsk-1',
        blogId: sampleBlogId,
        postId: 'pln-301',
        postText: 'Jadwal siaran ulang demo SmartLinks dan pelacakan UTM hari ini. [SAMPLE DATA]',
        network: 'instagram',
        scheduledAt: '2026-11-16T12:00',
        requesterEmail: 'editor@beeloftmetric.local',
        assigneeEmail: 'operator@beeloftmetric.local',
        direction: 'received',
        status: 'PENDING',
        reviewerNote: '',
        createdAt: '2026-11-15T14:20:00Z'
      }
    ],
    autolists: [
      {
        id: 'al-1',
        blogId: sampleBlogId,
        name: 'Evergreen Tips & Checklists [SAMPLE DATA]',
        active: true,
        networks: ['linkedin', 'twitter'],
        scheduleRule: 'Every Tuesday and Thursday at 10:00',
        postsCount: 8
      }
    ],
    smartLinks: [
      {
        id: 'sl-1',
        blogId: sampleBlogId,
        slug: 'beeloft-studio',
        title: 'Beeloft Studio [SAMPLE DATA]',
        description: 'Tautan kampanye aktif, jadwal webinar, dan template laporan publik.',
        theme: {
          backgroundColor: '#ffffff',
          buttonColor: '#17191c',
          buttonTextColor: '#ffffff'
        },
        buttons: [
          {
            id: 'btn-1',
            label: 'Unduh Checklist Audit Konten Q4',
            url: 'https://beeloftmetric.local/checklist-q4',
            active: true,
            clicks: 318
          },
          {
            id: 'btn-2',
            label: 'Jadwalkan Demo Pelaporan Agensi',
            url: 'https://beeloftmetric.local/demo',
            active: true,
            clicks: 147
          }
        ],
        views: 1290
      }
    ],
    adCampaigns: [
      {
        id: 'cmp-401',
        blogId: sampleBlogId,
        platform: 'metaAds',
        name: 'Q4 Awareness Carousel [SAMPLE DATA]',
        objective: 'Traffic & Conversions',
        status: 'ACTIVE',
        dailyBudget: 45,
        spend: 630,
        impressions: 94200,
        clicks: 2410,
        conversions: 78,
        revenue: 2340
      },
      {
        id: 'cmp-402',
        blogId: sampleBlogId,
        platform: 'googleAds',
        name: 'Search Brand Keywords ID [SAMPLE DATA]',
        objective: 'Search Conversions',
        status: 'ACTIVE',
        dailyBudget: 35,
        spend: 490,
        impressions: 28400,
        clicks: 1860,
        conversions: 64,
        revenue: 2112
      }
    ],
    adGroups: [
      {
        id: 'ag-1',
        blogId: sampleBlogId,
        campaignId: 'cmp-401',
        campaignName: 'Q4 Awareness Carousel [SAMPLE DATA]',
        platform: 'metaAds',
        name: 'Lookalike 2% Marketing Leads',
        bidStrategy: 'Lowest Cost Cap',
        dailyBudget: 25,
        spend: 390,
        clicks: 1490,
        cpa: 7.5,
        status: 'ACTIVE'
      },
      {
        id: 'ag-2',
        blogId: sampleBlogId,
        campaignId: 'cmp-402',
        campaignName: 'Search Brand Keywords ID [SAMPLE DATA]',
        platform: 'googleAds',
        name: 'Exact Intent SaaS Tools',
        bidStrategy: 'Target CPA',
        dailyBudget: 35,
        spend: 490,
        clicks: 1860,
        cpa: 7.65,
        status: 'ACTIVE'
      }
    ],
    adCreatives: [
      {
        id: 'ad-1',
        blogId: sampleBlogId,
        adGroupName: 'Lookalike 2% Marketing Leads',
        platform: 'metaAds',
        headline: 'Schedule and measure 10 social channels in one workspace',
        format: 'Carousel',
        impressions: 58200,
        clicks: 1490,
        ctr: 2.56,
        conversions: 52,
        status: 'ACTIVE'
      }
    ],
    adKeywords: [
      {
        id: 'kw-1',
        blogId: sampleBlogId,
        keyword: 'social media analytics tool',
        matchType: 'EXACT',
        cpc: 0.42,
        impressions: 12400,
        clicks: 820,
        conversions: 34,
        qualityScore: 9
      },
      {
        id: 'kw-2',
        blogId: sampleBlogId,
        keyword: 'instagram post scheduler',
        matchType: 'PHRASE',
        cpc: 0.36,
        impressions: 9800,
        clicks: 610,
        conversions: 21,
        qualityScore: 8
      }
    ],
    adRecommendations: [
      {
        id: 'rec-1',
        blogId: sampleBlogId,
        platform: 'googleAds',
        title: 'Shift $10/day toward exact match keyword "social media analytics tool"',
        impact: 'Estimated +8 weekly conversions at current CPA',
        category: 'Budget',
        applied: false
      },
      {
        id: 'rec-2',
        blogId: sampleBlogId,
        platform: 'metaAds',
        title: 'Enable automatic placement optimization on Carousel ad set',
        impact: 'Estimated -11% cost per link click',
        category: 'Creative',
        applied: false
      }
    ],
    teamMembers: [
      {
        id: 'tm-1',
        name: 'Beeloft Operator',
        email: 'operator@beeloftmetric.local',
        role: 'OWNER',
        kind: 'user',
        assignedBrands: [sampleBlogId, emptyBlogId],
        status: 'ACTIVE'
      },
      {
        id: 'tm-2',
        name: 'Content Editor',
        email: 'editor@beeloftmetric.local',
        role: 'EDITOR',
        kind: 'team',
        assignedBrands: [sampleBlogId],
        status: 'ACTIVE'
      },
      {
        id: 'tm-3',
        name: 'External Brand Reviewer',
        email: 'reviewer@client.example',
        role: 'CLIENT_REVIEWER',
        kind: 'client',
        assignedBrands: [sampleBlogId],
        status: 'INVITED'
      }
    ],
    agencySettings: {
      id: 'org-1',
      organizationName: 'Beeloft Digital Workspace',
      customDomain: 'metrics.beeloftmetric.local',
      defaultLocale: 'en',
      smtpHost: 'smtp.beeloftmetric.local',
      smtpPort: 587,
      smtpUser: 'mailer@beeloftmetric.local',
      senderEmail: 'reports@beeloftmetric.local',
      lastTestStatus: null
    },
    affiliation: {
      referralCode: 'BEELOFT-PARTNER-640',
      referralUrl: 'http://127.0.0.1:5173/register?ref=BEELOFT-PARTNER-640',
      payoutEmail: 'payouts@beeloftmetric.local',
      commissionRatePct: 25,
      clicks: 342,
      signups: 48,
      paidConversions: 12,
      pendingCommissionUsd: 180,
      paidCommissionUsd: 540,
      payouts: [
        { id: 'pay-1', date: '2026-10-15', amountUsd: 270, status: 'PAID' },
        { id: 'pay-2', date: '2026-11-01', amountUsd: 270, status: 'PAID' }
      ]
    },
    coupons: [
      {
        id: 'cpn-1',
        code: 'BEELOFTQ4',
        discountPct: 25,
        planTarget: 'STARTER',
        redemptions: 14,
        maxRedemptions: 100,
        active: true
      }
    ],
    invoices: [
      {
        id: 'inv-901',
        date: '2026-11-01',
        customerEmail: 'operator@beeloftmetric.local',
        plan: 'ENTERPRISE_CUSTOM',
        amountUsd: 149,
        status: 'PAID'
      }
    ],
    attributionEvents: [
      {
        id: 'att-1',
        visitorId: 'vis-seed-001',
        sessionId: 'ses-seed-001',
        type: 'session',
        path: '/',
        eventName: 'page_view',
        utmSource: 'direct',
        utmMedium: 'none',
        referral: null,
        timestamp: '2026-11-16T08:00:00Z'
      }
    ],
    notifications: [
      {
        id: 'not-1',
        title: 'Attribution engine v1 aktif',
        body: 'Endpoint /s/session, /s, dan /p kini merekam peristiwa navigasi ke penyimpanan lokal.',
        category: 'update',
        createdAt: '2026-11-16T07:30:00Z',
        read: false
      },
      {
        id: 'not-2',
        title: 'Sinkronisasi koneksi Beeloft Studio',
        body: 'Data sampel terakhir diperbarui pada 16 Nov 2026 untuk kanal Instagram, TikTok, dan Ads.',
        category: 'unread',
        createdAt: '2026-11-16T08:15:00Z',
        read: false
      }
    ]
  };
}
