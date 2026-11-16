import { apiRequest } from './api';

const VISITOR_STORAGE_KEY = 'bm_visitor_id';
const SESSION_STORAGE_KEY = 'bm_session_id';
const COOKIE_PREVIEW_KEY = 'bm_cookie_preview';

function getStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage unavailability
  }
}

export async function initAttributionSession(path: string): Promise<{
  visitorId: string;
  sessionId: string;
  cookie: string;
}> {
  const params = new URLSearchParams(window.location.search);
  const existingVisitor = getStored(VISITOR_STORAGE_KEY);
  const res = await apiRequest<{
    visitorId: string;
    sessionId: string;
    cookie: string;
  }>('/s/session', {
    method: 'POST',
    body: JSON.stringify({
      visitorId: existingVisitor,
      path,
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      referral: document.referrer || null
    })
  });

  setStored(VISITOR_STORAGE_KEY, res.visitorId);
  setStored(SESSION_STORAGE_KEY, res.sessionId);
  setStored(COOKIE_PREVIEW_KEY, res.cookie);
  return res;
}

export async function trackAttributionEvent(
  eventName: string,
  path: string
): Promise<void> {
  const visitorId = getStored(VISITOR_STORAGE_KEY) || 'vis-anon';
  const sessionId = getStored(SESSION_STORAGE_KEY) || 'ses-anon';
  const params = new URLSearchParams(window.location.search);

  await apiRequest('/s', {
    method: 'POST',
    body: JSON.stringify({
      visitorId,
      sessionId,
      path,
      eventName,
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium')
    })
  }).catch(() => undefined);
}

export async function trackTelemetry(eventName: string, path: string): Promise<void> {
  const visitorId = getStored(VISITOR_STORAGE_KEY) || 'vis-anon';
  const sessionId = getStored(SESSION_STORAGE_KEY) || 'ses-anon';
  await apiRequest('/p', {
    method: 'POST',
    body: JSON.stringify({ visitorId, sessionId, path, eventName })
  }).catch(() => undefined);
}

export function getAttributionSnapshot(): {
  visitorId: string | null;
  sessionId: string | null;
  cookie: string | null;
} {
  return {
    visitorId: getStored(VISITOR_STORAGE_KEY),
    sessionId: getStored(SESSION_STORAGE_KEY),
    cookie: getStored(COOKIE_PREVIEW_KEY)
  };
}
