import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../app.js';
import { NodeFilePlatformRepository } from '../storage/nodeFileRepository.js';
import { generateCurrentTotpCode, sha512Hex } from '../security/crypto.js';
import workerEntry from '../../worker/index.js';

function extractCookieHeader(setCookieHeader: string | string[] | undefined): string {
  if (!setCookieHeader) return '';
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return list.map((item) => item.split(';')[0]).join('; ');
}

describe('BeeloftMetric Production Multi-Tenant API, Security, Real-Time & Billing', () => {
  let tmpDir: string;
  let dbFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beeloft-prod-'));
    dbFile = path.join(tmpDir, 'platform-db.json');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('enforces 401 on unauthenticated workspace endpoints and isolates multi-tenant accounts + RBAC', async () => {
    const app = await buildApp(new NodeFilePlatformRepository(dbFile));

    const hc = await app.inject({ method: 'GET', url: '/api/admin/healthcheck' });
    expect(hc.statusCode).toBe(200);
    expect(hc.json()).toBe(true);

    const unauth = await app.inject({ method: 'GET', url: '/api/admin/userstatus' });
    expect(unauth.statusCode).toBe(401);

    // First account becomes ADMIN on ENTERPRISE_CUSTOM
    const regAdmin = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { name: 'Founder Admin', email: 'founder@beeloftmetric.biz.id', password: 'StrongPassword123' }
    });
    expect(regAdmin.statusCode).toBe(200);
    const adminCookie = extractCookieHeader(regAdmin.headers['set-cookie']);
    expect(adminCookie).toContain('_bm_session=');
    const adminBlogId = regAdmin.json().primaryBlogId;

    // Second public signup starts on a 7-day STARTER free trial with USER role
    const regUser = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { name: 'Client Studio', email: 'client@agency.id', password: 'ClientPassword123' }
    });
    expect(regUser.statusCode).toBe(200);
    const userCookie = extractCookieHeader(regUser.headers['set-cookie']);
    const userBlogId = regUser.json().primaryBlogId;
    expect(userBlogId).not.toBe(adminBlogId);

    const userStatus = await app.inject({
      method: 'GET',
      url: '/api/admin/userstatus',
      headers: { cookie: userCookie }
    });
    expect(userStatus.statusCode).toBe(200);
    expect(userStatus.json().plan).toBe('STARTER');
    expect(userStatus.json().trialActive).toBe(true);
    expect(userStatus.json().trialDays).toBe(7);
    expect(userStatus.json().trialDaysRemaining).toBe(7);
    expect(userStatus.json().brandLimit).toBe(5);
    expect(userStatus.json().role).toBe('USER');
    expect(userStatus.json().brands).toHaveLength(1);
    expect(userStatus.json().brands[0].isSample).toBe(false);

    // Non-admin user gets 403 on Backoffice
    const forbiddenBo = await app.inject({
      method: 'GET',
      url: '/api/v2/backoffice/overview',
      headers: { cookie: userCookie }
    });
    expect(forbiddenBo.statusCode).toBe(403);

    // Admin user accesses Backoffice cleanly
    const okBo = await app.inject({
      method: 'GET',
      url: '/api/v2/backoffice/overview',
      headers: { cookie: adminCookie }
    });
    expect(okBo.statusCode).toBe(200);
    expect(okBo.json().data.usersList).toHaveLength(2);

    await app.close();
  });

  it('verifies RFC 6238 TOTP 2FA challenge on login and X-Mc-Auth API token access', async () => {
    const app = await buildApp(new NodeFilePlatformRepository(dbFile));

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { name: 'Security Ops', email: 'sec@beeloftmetric.biz.id', password: 'SecPassword99!' }
    });
    const sessionCookie = extractCookieHeader(reg.headers['set-cookie']);

    const tokRes = await app.inject({
      method: 'GET',
      url: '/api/v2/settings/users/tokens/current',
      headers: { cookie: sessionCookie }
    });
    const apiToken = tokRes.json().data.token as string;
    expect(apiToken).toMatch(/^bm_live_/);

    // Authenticate with X-Mc-Auth header without cookies
    const viaToken = await app.inject({
      method: 'GET',
      url: '/api/admin/userstatus',
      headers: { 'x-mc-auth': apiToken }
    });
    expect(viaToken.statusCode).toBe(200);
    expect(viaToken.json().email).toBe('sec@beeloftmetric.biz.id');

    // Setup & enable RFC 6238 TOTP 2FA
    const setup = await app.inject({
      method: 'POST',
      url: '/api/v2/settings/users/totp/setup',
      headers: { cookie: sessionCookie }
    });
    const secret = setup.json().data.secret as string;
    const liveCode = await generateCurrentTotpCode(secret);

    const enable = await app.inject({
      method: 'POST',
      url: '/api/v2/settings/users/totp/tokens',
      headers: { cookie: sessionCookie },
      payload: { code: liveCode }
    });
    expect(enable.statusCode).toBe(200);
    expect(enable.json().data.totpEnabled).toBe(true);

    // Login without totpCode prompts requiresTwoFactor
    const step1 = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: 'sec@beeloftmetric.biz.id', password: 'SecPassword99!' }
    });
    expect(step1.statusCode).toBe(200);
    expect(step1.json().requiresTwoFactor).toBe(true);

    // Login with valid totpCode succeeds
    const step2 = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: 'sec@beeloftmetric.biz.id', password: 'SecPassword99!', totpCode: liveCode }
    });
    expect(step2.statusCode).toBe(200);
    expect(step2.json().ok).toBe(true);

    await app.close();
  });

  it('streams real-time tracker.js beacons, Cloudflare geolocation, R2/DB media uploads, and public SmartLinks', async () => {
    const app = await buildApp(new NodeFilePlatformRepository(dbFile));

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { name: 'Growth Team', email: 'growth@beeloftmetric.biz.id', password: 'GrowthPassword123' }
    });
    const cookie = extractCookieHeader(reg.headers['set-cookie']);
    const blogId = reg.json().primaryBlogId as number;

    // Fetch tracker.js script
    const scriptRes = await app.inject({ method: 'GET', url: '/tracker.js' });
    expect(scriptRes.statusCode).toBe(200);
    expect(scriptRes.body).toContain('/s/collect');

    // Inspect trackingKey & send external website beacon with Cloudflare country header
    const connRes = await app.inject({
      method: 'GET',
      url: `/api/v2/settings/brands/connections?blogId=${blogId}`,
      headers: { cookie }
    });
    const trackingKey = connRes.json().trackingKey as string;
    expect(trackingKey).toMatch(/^bm_trk_/);

    const collect = await app.inject({
      method: 'POST',
      url: '/s/collect',
      headers: { 'cf-ipcountry': 'ID' },
      payload: {
        trackingKey,
        visitorId: 'vis-jakarta-1',
        sessionId: 'ses-jakarta-1',
        eventType: 'pageview',
        eventName: 'page_view',
        path: '/produk-baru',
        utmSource: 'instagram'
      }
    });
    expect(collect.statusCode).toBe(200);

    const rt = await app.inject({
      method: 'GET',
      url: `/api/v2/evolution/realtime?blogId=${blogId}`,
      headers: { cookie }
    });
    expect(rt.statusCode).toBe(200);
    expect(rt.json().data.connected).toBe(true);
    expect(rt.json().data.activeVisitors).toBe(1);
    expect(rt.json().data.countries[0].code).toBe('ID');
    expect(rt.json().data.countries[0].country).toBe('Indonesia');

    // Upload real PNG image & retrieve binary bytes
    const tinyPngB64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const up = await app.inject({
      method: 'POST',
      url: '/api/v2/media/upload',
      headers: { cookie },
      payload: {
        blogId,
        filename: 'banner.png',
        mimeType: 'image/png',
        dataBase64: tinyPngB64
      }
    });
    expect(up.statusCode).toBe(200);
    const mediaId = up.json().data.id as string;

    const getMedia = await app.inject({ method: 'GET', url: `/api/v2/media/${mediaId}` });
    expect(getMedia.statusCode).toBe(200);
    expect(getMedia.headers['content-type']).toBe('image/png');
    expect(getMedia.rawPayload.length).toBeGreaterThan(20);

    // Create public SmartLink and verify unauthenticated visitor views & clicks
    const createdSl = await app.inject({
      method: 'POST',
      url: '/api/v2/smart-links/links',
      headers: { cookie },
      payload: { blogId, title: 'Beeloft Bio', slug: 'beeloft-live' }
    });
    expect(createdSl.statusCode).toBe(200);
    const slId = createdSl.json().data.id as string;

    await app.inject({
      method: 'PUT',
      url: `/api/v2/smart-links/links/${slId}`,
      headers: { cookie },
      payload: {
        buttons: [{ id: 'btn-1', label: 'Shop Now', url: 'https://beeloftmetric.biz.id/pricing', active: true, clicks: 0 }]
      }
    });

    const pubGet = await app.inject({ method: 'GET', url: '/api/v2/public/smart-links/beeloft-live' });
    expect(pubGet.statusCode).toBe(200);
    expect(pubGet.json().data.views).toBe(1);

    const pubClick = await app.inject({
      method: 'POST',
      url: '/api/v2/public/smart-links/beeloft-live/click',
      payload: { buttonId: 'btn-1' }
    });
    expect(pubClick.statusCode).toBe(200);
    expect(pubClick.json().clicks).toBe(1);

    await app.close();
  });

  it('executes Comment-to-DM webhook flows, Cron due post scheduler, and signed Midtrans plan upgrades', async () => {
    const midtransKey = 'SB-Mid-server-testkey123';
    const app = await buildApp(new NodeFilePlatformRepository(dbFile), {
      MIDTRANS_SERVER_KEY: midtransKey
    });

    // Admin first so second user gets FREE plan
    await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { name: 'Root', email: 'root@beeloftmetric.biz.id', password: 'RootPassword123' }
    });

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { name: 'Merchant ID', email: 'merchant@toko.id', password: 'MerchantPassword123' }
    });
    const cookie = extractCookieHeader(reg.headers['set-cookie']);
    const blogId = reg.json().primaryBlogId as number;

    // During active 7-day Starter trial, user CAN create additional brands (up to 5)
    const trialSecondBrand = await app.inject({
      method: 'POST',
      url: '/api/v2/brands',
      headers: { cookie },
      payload: { name: 'Trial Brand Two' }
    });
    expect(trialSecondBrand.statusCode).toBe(200);

    // Simulate 7-day trial expiration (fast-forwarding trialEndsAt into the past)
    const expRepo = new NodeFilePlatformRepository(dbFile);
    const expiringUser = await expRepo.getUserByEmail('merchant@toko.id');
    expect(expiringUser).not.toBeNull();
    expiringUser!.workspace.user.trialEndsAt = new Date(Date.now() - 60_000).toISOString();
    await expRepo.saveUser(expiringUser!);

    await app.close();
    const appExpired = await buildApp(new NodeFilePlatformRepository(dbFile), {
      MIDTRANS_SERVER_KEY: midtransKey
    });

    // Next request automatically downgrades expired 7-day trial to FREE plan (limit 1)
    const statusAfterExpiry = await appExpired.inject({
      method: 'GET',
      url: '/api/admin/userstatus',
      headers: { cookie }
    });
    expect(statusAfterExpiry.statusCode).toBe(200);
    expect(statusAfterExpiry.json().plan).toBe('FREE');
    expect(statusAfterExpiry.json().trialActive).toBe(false);
    expect(statusAfterExpiry.json().trialDaysRemaining).toBe(0);

    // Expired trial (now FREE) blocks adding another brand
    const blockedBrand = await appExpired.inject({
      method: 'POST',
      url: '/api/v2/brands',
      headers: { cookie },
      payload: { name: 'Blocked Post-Trial Brand' }
    });
    expect(blockedBrand.statusCode).toBe(403);

    // Create Comment-to-DM flow & trigger via webhook
    await appExpired.inject({
      method: 'POST',
      url: '/api/v2/flows',
      headers: { cookie },
      payload: {
        blogId,
        name: 'Catalog DM Flow',
        network: 'instagram',
        commentTrigger: 'withKeywords',
        keywords: ['KATALOG'],
        dmText: 'Ini link katalog lengkap kami:',
        buttonUrl: 'https://beeloftmetric.biz.id/bio/katalog'
      }
    });

    const wh = await appExpired.inject({
      method: 'POST',
      url: '/api/v2/webhooks/instagram',
      payload: {
        blogId,
        channelType: 'COMMENT',
        contactName: 'Siti',
        contactHandle: '@siti_id',
        text: 'Kak minta info KATALOG terbaru ya'
      }
    });
    expect(wh.statusCode).toBe(200);
    expect(wh.json().triggeredFlows).toBe(1);

    // Schedule a post in the past and run scheduler job
    const pastIso = new Date(Date.now() - 10 * 60 * 1000).toISOString().slice(0, 16);
    await appExpired.inject({
      method: 'POST',
      url: '/api/v2/planner/posts',
      headers: { cookie },
      payload: {
        blogId,
        scheduledAt: pastIso,
        text: 'Promo akhir pekan resmi dibuka.',
        networks: ['instagram']
      }
    });

    const cronRes = await appExpired.inject({
      method: 'POST',
      url: '/api/v2/planner/run-scheduler',
      headers: { cookie }
    });
    expect(cronRes.statusCode).toBe(200);
    expect(cronRes.json().data.publishedCount).toBe(1);

    await appExpired.close();

    // Simulate signed Midtrans settlement webhook upgrading user to paid STARTER
    const repo = new NodeFilePlatformRepository(dbFile);
    const userRow = await repo.getUserByEmail('merchant@toko.id');
    expect(userRow).not.toBeNull();
    const orderId = `BM-${userRow!.userId}-99999`;
    await repo.savePaymentOrder({
      orderId,
      userId: userRow!.userId,
      plan: 'STARTER',
      amountIdr: 285000,
      amountUsd: 18,
      provider: 'midtrans',
      providerRef: 'snap-tok',
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test',
      status: 'PENDING',
      couponCode: null,
      createdAt: new Date().toISOString(),
      paidAt: null
    });

    // Rebuild app to reload disk state and verify Midtrans SHA-512 webhook
    const app2 = await buildApp(new NodeFilePlatformRepository(dbFile), {
      MIDTRANS_SERVER_KEY: midtransKey
    });
    const sig = await sha512Hex(`${orderId}200285000.00${midtransKey}`);
    const payWh = await app2.inject({
      method: 'POST',
      url: '/api/v2/webhooks/billing/midtrans',
      payload: {
        order_id: orderId,
        status_code: '200',
        gross_amount: '285000.00',
        transaction_status: 'settlement',
        fraud_status: 'accept',
        signature_key: sig
      }
    });
    expect(payWh.statusCode).toBe(200);

    // Merchant is now paid STARTER (trialActive: false) and can create a 3rd brand!
    const allowedBrand = await app2.inject({
      method: 'POST',
      url: '/api/v2/brands',
      headers: { cookie },
      payload: { name: 'Third Brand Unlocked' }
    });
    expect(allowedBrand.statusCode).toBe(200);

    await app2.close();
  });

  it('serves API & tracker requests directly through the Cloudflare Worker fetch handler', async () => {
    const reqReady = new Request('https://beeloftmetric.biz.id/api/v2/system/readiness');
    const resReady = await workerEntry.fetch(reqReady, {});
    expect(resReady.status).toBe(200);
    const json = (await resReady.json()) as { ok: boolean; domain: string };
    expect(json.ok).toBe(true);
    expect(json.domain).toBe('beeloftmetric.biz.id');

    const reqTracker = new Request('https://beeloftmetric.biz.id/tracker.js');
    const resTracker = await workerEntry.fetch(reqTracker, {});
    expect(resTracker.status).toBe(200);
    expect(await resTracker.text()).toContain('https://beeloftmetric.biz.id/s/collect');
  });
});
