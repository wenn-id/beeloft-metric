import { randomToken } from '../security/crypto.js';
import type {
  BeeloftDatabase,
  Brand,
  DailyMetricPoint,
  PlatformRepository,
  RealtimeOverview,
  WebEventRow
} from '../types.js';

const FALLBACK_COUNTRIES: Record<string, string> = {
  ID: 'Indonesia',
  US: 'United States',
  SG: 'Singapore',
  MY: 'Malaysia',
  AU: 'Australia',
  GB: 'United Kingdom',
  DE: 'Germany',
  NL: 'Netherlands',
  JP: 'Japan',
  IN: 'India',
  ES: 'Spain',
  FR: 'France',
  CA: 'Canada',
  BR: 'Brazil',
  KR: 'South Korea',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines'
};

export function resolveCountryName(code?: string | null): { code: string; name: string } {
  const clean = (code || '').trim().toUpperCase();
  if (!clean || clean === 'XX' || clean === 'T1') {
    return { code: 'UN', name: 'Unknown' };
  }
  if (FALLBACK_COUNTRIES[clean]) {
    return { code: clean, name: FALLBACK_COUNTRIES[clean] };
  }
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      const resolved = dn.of(clean);
      if (resolved) return { code: clean, name: resolved };
    }
  } catch {
    // Fallback to code string
  }
  return { code: clean, name: clean };
}

export function buildEmbedTrackerScript(origin: string): string {
  const endpoint = `${origin.replace(/\/+$/, '')}/s/collect`;
  return `(function(){
  try {
    var s = document.currentScript || document.querySelector('script[data-key]');
    var key = s && s.getAttribute('data-key');
    if (!key) return;
    var endpoint = ${JSON.stringify(endpoint)};
    var vid = '';
    var sid = '';
    try {
      vid = localStorage.getItem('_bm_vid') || '';
      if (!vid) {
        vid = 'vis_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
        localStorage.setItem('_bm_vid', vid);
      }
      sid = sessionStorage.getItem('_bm_sid') || '';
      if (!sid) {
        sid = 'ses_' + Math.random().toString(36).slice(2, 12);
        sessionStorage.setItem('_bm_sid', sid);
      }
    } catch (_) {
      vid = 'vis_anon';
      sid = 'ses_anon';
    }
    function send(eventType, eventName, extraPath) {
      var q = new URLSearchParams(location.search);
      var payload = JSON.stringify({
        trackingKey: key,
        visitorId: vid,
        sessionId: sid,
        eventType: eventType,
        eventName: eventName,
        path: extraPath || (location.pathname + location.search),
        utmSource: q.get('utm_source'),
        utmMedium: q.get('utm_medium'),
        referrer: document.referrer || null
      });
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, mode: 'cors' }).catch(function(){});
      }
    }
    send('pageview', 'page_view');
    var origPush = history.pushState;
    if (origPush) {
      history.pushState = function() {
        origPush.apply(this, arguments);
        setTimeout(function(){ send('pageview', 'spa_route_view'); }, 0);
      };
      window.addEventListener('popstate', function(){ send('pageview', 'spa_route_view'); });
    }
    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a && a.href && a.hostname && a.hostname !== location.hostname) {
        send('event', 'outbound_click', a.href);
      }
    }, true);
    window.BeeloftTracker = { track: function(name) { send('event', name || 'custom_event'); } };
  } catch (_) {}
})();`;
}

export async function recordBrandWebHit(params: {
  repo: PlatformRepository;
  workspace: BeeloftDatabase;
  brand: Brand;
  visitorId: string;
  sessionId: string;
  eventType: WebEventRow['eventType'];
  eventName: string;
  path: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
  countryCode?: string | null;
}): Promise<WebEventRow> {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);
  const country = resolveCountryName(params.countryCode);

  const row: WebEventRow = {
    id: randomToken('wev', 8),
    blogId: params.brand.blogId,
    visitorId: params.visitorId,
    sessionId: params.sessionId,
    eventType: params.eventType,
    path: params.path || '/',
    eventName: params.eventName || 'page_view',
    utmSource: params.utmSource || null,
    utmMedium: params.utmMedium || null,
    referrer: params.referrer || null,
    countryCode: country.code,
    countryName: country.name,
    createdAt: nowIso
  };

  await params.repo.insertWebEvent(row);

  params.workspace.attributionEvents.unshift({
    id: row.id,
    visitorId: row.visitorId,
    sessionId: row.sessionId,
    type:
      row.eventType === 'session'
        ? 'session'
        : row.eventType === 'telemetry'
          ? 'telemetry'
          : 'event',
    path: row.path,
    eventName: row.eventName,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    referral: row.referrer,
    timestamp: nowIso
  });
  params.workspace.attributionEvents = params.workspace.attributionEvents.slice(0, 150);

  const blogKey = String(params.brand.blogId);
  if (!params.workspace.metricsSeries[blogKey]) {
    params.workspace.metricsSeries[blogKey] = {};
  }
  if (!params.workspace.metricsSeries[blogKey].web) {
    params.workspace.metricsSeries[blogKey].web = [];
  }

  const webSeries = params.workspace.metricsSeries[blogKey].web;
  let todayPoint: DailyMetricPoint | undefined = webSeries.find((p) => p.date === today);

  const todayStartIso = `${today}T00:00:00.000Z`;
  const todayEvents = await params.repo.listWebEventsSince(params.brand.blogId, todayStartIso, 2000);
  const uniqueVisitorsToday = new Set(todayEvents.map((e) => e.visitorId)).size;

  if (!todayPoint) {
    todayPoint = {
      date: today,
      impressions: 0,
      reach: 0,
      followers: uniqueVisitorsToday,
      interactions: 0,
      clicks: 0
    };
    webSeries.push(todayPoint);
    webSeries.sort((a, b) => a.date.localeCompare(b.date));
  }

  if (params.eventType === 'pageview' || params.eventType === 'session') {
    todayPoint.impressions += 1;
  }
  if (params.eventType === 'smartlink_click' || params.eventName.includes('click')) {
    todayPoint.clicks += 1;
    todayPoint.interactions += 1;
  } else if (params.eventType === 'event') {
    todayPoint.interactions += 1;
  }
  todayPoint.reach = Math.max(todayPoint.reach, uniqueVisitorsToday);
  todayPoint.followers = Math.max(todayPoint.followers, uniqueVisitorsToday);

  if (params.brand.connections.web?.connected) {
    params.brand.connections.web.lastSync = nowIso;
  }

  return row;
}

export async function computeRealtimeAnalytics(
  repo: PlatformRepository,
  blogId: number,
  webConnected: boolean
): Promise<RealtimeOverview> {
  if (!webConnected) {
    return {
      connected: false,
      isSample: false,
      activeVisitors: 0,
      pageViewsLast30m: 0,
      topActivePages: [],
      topReferrers: [],
      countries: []
    };
  }

  const nowMs = Date.now();
  const since30mIso = new Date(nowMs - 30 * 60 * 1000).toISOString();
  const since5mIso = new Date(nowMs - 5 * 60 * 1000).toISOString();

  const events30m = await repo.listWebEventsSince(blogId, since30mIso, 1000);
  const activeSet5m = new Set<string>();
  const pageVisitors = new Map<string, Set<string>>();
  const referrerVisitors = new Map<string, Set<string>>();
  const countryVisitors = new Map<string, { country: string; code: string; set: Set<string> }>();

  let pageViews30m = 0;

  for (const ev of events30m) {
    if (ev.createdAt >= since5mIso) {
      activeSet5m.add(ev.visitorId);
    }
    if (ev.eventType === 'pageview' || ev.eventType === 'session' || ev.eventType === 'smartlink_click') {
      pageViews30m += 1;
    }

    const p = ev.path || '/';
    if (!pageVisitors.has(p)) pageVisitors.set(p, new Set());
    pageVisitors.get(p)!.add(ev.visitorId);

    let refLabel = 'Direct / None';
    if (ev.utmSource && ev.utmSource !== 'direct') {
      refLabel = ev.utmSource;
    } else if (ev.referrer) {
      try {
        refLabel = new URL(ev.referrer).hostname || ev.referrer;
      } catch {
        refLabel = ev.referrer;
      }
    }
    if (!referrerVisitors.has(refLabel)) referrerVisitors.set(refLabel, new Set());
    referrerVisitors.get(refLabel)!.add(ev.visitorId);

    const cCode = ev.countryCode || 'UN';
    const cName = ev.countryName || 'Unknown';
    if (!countryVisitors.has(cCode)) {
      countryVisitors.set(cCode, { country: cName, code: cCode, set: new Set() });
    }
    countryVisitors.get(cCode)!.set.add(ev.visitorId);
  }

  const topActivePages = Array.from(pageVisitors.entries())
    .map(([path, set]) => ({ path, visitors: set.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 8);

  const topReferrers = Array.from(referrerVisitors.entries())
    .map(([source, set]) => ({ source, visitors: set.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 8);

  const countries = Array.from(countryVisitors.values())
    .map((c) => ({ country: c.country, code: c.code, visitors: c.set.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 8);

  return {
    connected: true,
    isSample: false,
    activeVisitors: activeSet5m.size,
    pageViewsLast30m: pageViews30m,
    topActivePages,
    topReferrers,
    countries
  };
}
