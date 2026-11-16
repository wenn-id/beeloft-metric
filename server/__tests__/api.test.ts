import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../app.js';
import { JsonStore } from '../store.js';

describe('BeeloftMetric Backend API & Attribution Engine', () => {
  let tmpDir: string;
  let dbFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beeloft-test-'));
    dbFile = path.join(tmpDir, 'db.json');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns true on healthcheck and expected userstatus + v2 metadata schemas', async () => {
    const app = await buildApp(new JsonStore(dbFile));
    const hc = await app.inject({ method: 'GET', url: '/api/admin/healthcheck' });
    expect(hc.statusCode).toBe(200);
    expect(hc.json()).toBe(true);

    const status = await app.inject({ method: 'GET', url: '/api/admin/userstatus' });
    expect(status.statusCode).toBe(200);
    const body = status.json();
    expect(body.userId).toBe(6401427);
    expect(body.plan).toBe('ENTERPRISE_CUSTOM');
    expect(body.brands.length).toBe(2);

    const flags = await app.inject({ method: 'GET', url: '/api/v2/features/check-all' });
    expect(flags.json().data.HIDE_HASHTAG_TRACKER).toBe(false);

    const loc = await app.inject({ method: 'GET', url: '/api/v2/settings/users/location-from-ip' });
    expect(loc.json().data.countryCode).toBe('ID');

    await app.close();
  });

  it('initializes _bm attribution session cookie and records events', async () => {
    const app = await buildApp(new JsonStore(dbFile));
    const ses = await app.inject({
      method: 'POST',
      url: '/s/session',
      payload: { path: '/', utmSource: 'instagram', utmMedium: 'bio' }
    });
    expect(ses.statusCode).toBe(200);
    const sBody = ses.json();
    expect(sBody.cookie).toMatch(/^BM1\$t\d+\$u6401427/);
    expect(sBody.f_saved).toBe(true);

    const ev = await app.inject({
      method: 'POST',
      url: '/s',
      payload: { visitorId: sBody.visitorId, sessionId: sBody.sessionId, path: '/planner', eventName: 'route_view' }
    });
    expect(ev.statusCode).toBe(200);
    expect(ev.json().ok).toBe(true);

    const hist = await app.inject({ method: 'GET', url: `/s/apvid/${sBody.visitorId}` });
    expect(hist.json().events.length).toBe(2);
    await app.close();
  });

  it('toggles network connections on Empty brand and reflects in Evolution summary', async () => {
    const app = await buildApp(new JsonStore(dbFile));

    const before = await app.inject({
      method: 'GET',
      url: '/api/v2/evolution/summary?blogId=8137743&network=brandSummary'
    });
    expect(before.json().data.connected).toBe(false);

    const toggle = await app.inject({
      method: 'POST',
      url: '/api/v2/settings/brands/connections/instagram/toggle',
      payload: { blogId: 8137743, handle: '@my_new_brand', connect: true }
    });
    expect(toggle.statusCode).toBe(200);
    expect(toggle.json().data.connected).toBe(true);

    const after = await app.inject({
      method: 'GET',
      url: '/api/v2/evolution/summary?blogId=8137743&network=brandSummary'
    });
    expect(after.json().data.connected).toBe(true);
    expect(after.json().data.kpis.length).toBe(4);
    await app.close();
  });

  it('supports Planner CRUD, Inbox reply, SmartLink update & public click tracking', async () => {
    const app = await buildApp(new JsonStore(dbFile));

    const createdPost = await app.inject({
      method: 'POST',
      url: '/api/v2/planner/posts',
      payload: {
        blogId: 8137744,
        scheduledAt: '2026-11-18T10:00',
        text: 'Launch note',
        networks: ['instagram']
      }
    });
    expect(createdPost.statusCode).toBe(200);
    const postId = createdPost.json().data.id;

    const del = await app.inject({ method: 'DELETE', url: `/api/v2/planner/posts/${postId}` });
    expect(del.statusCode).toBe(200);

    const reply = await app.inject({
      method: 'POST',
      url: '/api/v2/inbox/threads/thr-1/messages',
      payload: { text: 'Sudah didukung di Planner.' }
    });
    expect(reply.json().data.status).toBe('PENDING');

    const click = await app.inject({
      method: 'POST',
      url: '/api/v2/public/smart-links/beeloft-studio/click',
      payload: { buttonId: 'btn-1' }
    });
    expect(click.json().clicks).toBe(319);
    await app.close();
  });

  it('supports 1:1 Legacy, Real-Time, Competitors, Flows, AI, Tasks, Ads 5-Tab, Studio, Brand Details, Tokens, Org & Backoffice endpoints', async () => {
    const app = await buildApp(new JsonStore(dbFile));

    // Legacy
    const profiles = await app.inject({ method: 'GET', url: '/api/admin/simpleProfiles' });
    expect(profiles.statusCode).toBe(200);
    expect(profiles.json().length).toBe(2);

    const sub = await app.inject({ method: 'GET', url: '/api/profile/subscription' });
    expect(sub.json().plan).toBe('ENTERPRISE_CUSTOM');

    // Real-time & Competitors
    const rt = await app.inject({ method: 'GET', url: '/api/v2/evolution/realtime?blogId=8137744' });
    expect(rt.json().data.connected).toBe(true);
    expect(rt.json().data.activeVisitors).toBeGreaterThan(0);

    const compAdd = await app.inject({
      method: 'POST',
      url: '/api/v2/evolution/competitors',
      payload: { blogId: 8137744, network: 'instagram', handle: '@acme_comp' }
    });
    expect(compAdd.statusCode).toBe(200);
    expect(compAdd.json().data.handle).toBe('@acme_comp');

    // Planner Deleted & Restore + Flows + AI
    const post = await app.inject({
      method: 'POST',
      url: '/api/v2/planner/posts',
      payload: { blogId: 8137744, scheduledAt: '2026-11-20T09:00', text: 'Soft delete check', networks: ['instagram'] }
    });
    const postId = post.json().data.id;
    await app.inject({ method: 'DELETE', url: `/api/v2/planner/posts/${postId}` });
    const delList = await app.inject({ method: 'GET', url: '/api/v2/planner/deleted?blogId=8137744' });
    expect(delList.json().data.some((p: { id: string }) => p.id === postId)).toBe(true);
    const restored = await app.inject({ method: 'POST', url: `/api/v2/planner/deleted/${postId}/restore` });
    expect(restored.statusCode).toBe(200);

    const flowCreate = await app.inject({
      method: 'POST',
      url: '/api/v2/flows',
      payload: { blogId: 8137744, name: 'Test Flow', dmText: 'Sent asset link.' }
    });
    expect(flowCreate.statusCode).toBe(200);

    const aiGen = await app.inject({
      method: 'POST',
      url: '/api/v2/integrations/ai/natural-language-scheduling',
      payload: { blogId: 8137744, prompt: 'Announce weekly webinar', network: 'linkedin' }
    });
    expect(aiGen.json().data.generatedCopy).toContain('Announce weekly webinar');

    // Tasks approval
    const taskRes = await app.inject({
      method: 'PATCH',
      url: '/api/v2/tasks/tsk-1',
      payload: { status: 'APPROVED', reviewerNote: 'Ready to schedule' }
    });
    expect(taskRes.json().data.status).toBe('APPROVED');

    // Ads 5-tab suite
    const kws = await app.inject({ method: 'GET', url: '/api/v2/advertising/keywords?blogId=8137744' });
    expect(kws.json().data.length).toBeGreaterThanOrEqual(2);
    const recApply = await app.inject({ method: 'POST', url: '/api/v2/advertising/recommendations/rec-1/apply' });
    expect(recApply.json().data.applied).toBe(true);

    // Reporting Studio & Brand Details
    const studioCreate = await app.inject({
      method: 'POST',
      url: '/api/v2/reporting/studio/reports',
      payload: { blogId: 8137744, title: 'Board Deck' }
    });
    expect(studioCreate.statusCode).toBe(200);

    const brandDet = await app.inject({
      method: 'PUT',
      url: '/api/v2/settings/brands/8137744/details',
      payload: { tags: ['Q4-Launch', 'Verified'] }
    });
    expect(brandDet.json().data.tags).toContain('Verified');

    // User Token rotation (requires REGENERATE)
    const badRot = await app.inject({
      method: 'POST',
      url: '/api/v2/settings/users/tokens/regenerate',
      payload: { confirmWord: 'wrong' }
    });
    expect(badRot.statusCode).toBe(400);
    const goodRot = await app.inject({
      method: 'POST',
      url: '/api/v2/settings/users/tokens/regenerate',
      payload: { confirmWord: 'REGENERATE' }
    });
    expect(goodRot.json().data.token).toMatch(/^bm_live_6401427_/);

    // Agency SMTP Test + Affiliation + Backoffice
    const smtp = await app.inject({ method: 'POST', url: '/api/v2/agency-CK/org-1/test-mail', payload: {} });
    expect(smtp.statusCode).toBe(200);
    const aff = await app.inject({ method: 'GET', url: '/api/v2/affiliation' });
    expect(aff.json().data.referralCode).toBe('BEELOFT-PARTNER-640');
    const cpn = await app.inject({
      method: 'POST',
      url: '/api/v2/backoffice/coupons',
      payload: { code: 'PARITY50', discountPct: 50 }
    });
    expect(cpn.json().data.code).toBe('PARITY50');
    const flagToggle = await app.inject({ method: 'PATCH', url: '/api/v2/backoffice/feature-flags/ENABLE_STUDIO' });
    expect(flagToggle.json().data.ENABLE_STUDIO).toBe(false);

    await app.close();
  });
});
