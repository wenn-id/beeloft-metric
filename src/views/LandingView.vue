<template>
  <div class="bm-landing">
    <a href="#landing-main" class="bm-skip-link">Skip to content</a>
    <BrandHeaderPublic />

    <main id="landing-main">
      <!-- Section 1: Split Spatial Hero with Interactive Three.js Telemetry Core -->
      <section class="bm-hero-section">
        <div class="bm-container">
          <div class="bm-hero-split">
            <div class="bm-hero-copy">
              <h1 class="bm-display-title">
                Social metrics that read with <em>editorial clarity</em> across every channel.
              </h1>
              <p class="bm-hero-sub">
                BeeloftMetric unifies channel evolution, publishing calendars, Comment-to-DM flows,
                unified inbox triage, SmartLinks, and first-party web attribution on Cloudflare Edge.
              </p>
              <div class="bm-hero-actions">
                <router-link
                  :to="store.isAuthenticated ? '/evolution/brandSummary' : '/register'"
                  class="bm-pill-filled bm-transition"
                >
                  {{ store.isAuthenticated ? 'Open workspace' : 'Start 7-day free trial' }}
                </router-link>
                <router-link to="/pricing" class="bm-pill-ghost bm-transition">
                  Compare plans
                </router-link>
              </div>

              <!-- Live Interactive AI Caption Composer -->
              <article class="bm-card bm-composer-card">
                <div class="bm-composer-card__head">
                  <strong>Test Live Caption Assistant</strong>
                  <span class="bm-ghost-tag">Workers AI · Edge Endpoint</span>
                </div>
                <form class="bm-composer-box" @submit.prevent="runAiComposer">
                  <button
                    type="button"
                    class="bm-circle-ghost"
                    aria-label="Insert sample Indonesian prompt"
                    @click="aiPrompt = 'Tulis pengumuman peluncuran koleksi akhir tahun untuk Instagram'"
                  >
                    @
                  </button>
                  <button
                    type="button"
                    class="bm-circle-ghost"
                    aria-label="Show API endpoint details"
                    @click="aiInfoShown = !aiInfoShown"
                  >
                    i
                  </button>
                  <label for="hero-ai-input" class="sr-only">Draft a social post</label>
                  <input
                    id="hero-ai-input"
                    v-model="aiPrompt"
                    type="text"
                    class="bm-composer-input"
                    placeholder="Write a prompt (e.g. Ringkas update fitur baru untuk LinkedIn)"
                  />
                  <button
                    type="submit"
                    class="bm-circle-send bm-transition"
                    aria-label="Generate post draft"
                    :disabled="aiLoading"
                  >
                    Go
                  </button>
                </form>
                <p v-if="aiInfoShown" class="bm-composer-reply">
                  Calls <code>POST /api/v2/integrations/ai/natural-language-scheduling</code> on the
                  live Cloudflare Worker.
                </p>
                <p v-if="aiResult" class="bm-composer-reply" role="status">
                  <strong>Draft:</strong> {{ aiResult }}
                </p>
              </article>
            </div>

            <!-- Interactive 3D Stage + Tactile Channel Matrix -->
            <div class="bm-hero-stage-col">
              <OrbitalHeroScene
                :theme="store.theme"
                :status-label="readinessLabel"
                active-channels-label="15 channel connectors"
              />

              <div class="bm-hero-mini-row">
                <TiltSurface class="bm-card bm-mini-stat">
                  <span class="bm-ghost-tag">Auto-Publisher Cron</span>
                  <p class="bm-stat-val tabular-nums">Every 5 min</p>
                  <p class="bm-stat-delta">Publishes scheduled posts, AutoLists, and DM flows</p>
                </TiltSurface>

                <TiltSurface class="bm-card bm-mini-stat">
                  <span class="bm-ghost-tag">Edge Runtime</span>
                  <p class="bm-stat-val">{{ readinessLabel }}</p>
                  <p class="bm-stat-delta">{{ readinessSub }}</p>
                </TiltSurface>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Asymmetric Capability Composition (Varied Hierarchy per R-05 & R-14) -->
      <section id="capabilities" class="bm-fog-band">
        <div class="bm-container">
          <div class="bm-band-head">
            <h2 class="bm-section-heading">
              Isolated multi-brand workspaces with live spatial analytics and edge storage.
            </h2>
            <p class="bm-band-sub">
              Manage client brands, embed real-time <code>tracker.js</code> beacons, preview
              SmartLinks in 3D, and publish across connected networks.
            </p>
          </div>

          <div class="bm-asymmetric-showcase">
            <!-- Flagship Wide Card -->
            <TiltSurface class="bm-artifact bm-flagship-card" :max-deg="2.5">
              <div class="bm-flagship-card__copy">
                <span class="bm-ghost-tag">Flagship Analytics & 3D Geography</span>
                <h3>Evolution Curves, Competitor Benchmarks & 3D Visitor Globe</h3>
                <p>
                  Inspect daily reach and impressions with interactive crosshair charts, track
                  competitor handles, and spin a live 3D WebGL globe lit by real visitor country
                  headers from <code>/tracker.js</code>.
                </p>
                <router-link
                  :to="store.isAuthenticated ? '/evolution/web/real-time' : '/register'"
                  class="bm-arrow-link"
                >
                  Open 3D Real-Time Analytics
                </router-link>
              </div>

              <div class="bm-flagship-card__table-wrap">
                <table class="bm-mini-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Auth</th>
                      <th class="bm-num-col">Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in channelCapabilityRows" :key="row.name">
                      <td><strong>{{ row.name }}</strong></td>
                      <td class="bm-muted-cell">{{ row.auth }}</td>
                      <td class="bm-num-col">{{ row.sync }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TiltSurface>

            <!-- Secondary Pair with Distinct Layouts -->
            <div class="bm-secondary-pair">
              <TiltSurface class="bm-card bm-secondary-card">
                <span class="bm-ghost-tag">Publishing & Automation</span>
                <h3>Calendar Queue, Cloudflare R2 Media & Comment-to-DM Flows</h3>
                <p>
                  Upload campaign images and video to R2, preview posts inside a 3D smartphone
                  frame, and trigger automatic DM replies when followers comment keywords.
                </p>
                <router-link
                  :to="store.isAuthenticated ? '/planner' : '/register'"
                  class="bm-arrow-link"
                >
                  Open Planning Calendar
                </router-link>
              </TiltSurface>

              <TiltSurface class="bm-card bm-secondary-card">
                <span class="bm-ghost-tag">Client Operations & Bio Studio</span>
                <h3>3D SmartLink Studio, Unified Inbox & Branded PDF/PPTX Decks</h3>
                <p>
                  Customize trackable <code>/bio/:slug</code> microsites with live 3D device tilt,
                  resolve incoming DMs in one inbox, and export white-label client reports.
                </p>
                <router-link
                  :to="store.isAuthenticated ? '/smartlink' : '/register'"
                  class="bm-arrow-link"
                >
                  Open SmartLinks Studio
                </router-link>
              </TiltSurface>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Warm Accent Telemetry Callout -->
      <section class="bm-paper-band">
        <div class="bm-container">
          <article class="bm-peach-card bm-attribution-callout" aria-label="Live Attribution Telemetry">
            <div class="bm-peach-head">
              <div>
                <p class="bm-peach-eyebrow">First-party session telemetry</p>
                <h2>Live Attribution Engine (_bm) on beeloftmetric.biz.id</h2>
              </div>
              <button type="button" class="bm-peach-btn bm-transition" @click="loadTelemetry">
                Refresh session log
              </button>
            </div>

            <p class="bm-peach-quote">
              Embed <code>/tracker.js</code> on any domain to stream real visitor sessions, UTM
              parameters, outbound clicks, and Cloudflare country headers directly into your brand
              analytics.
            </p>

            <div class="bm-peach-meta">
              <div>
                <strong>Your Visitor ID</strong>
                <div class="tabular-nums">{{ snapshot.visitorId || 'Initializing...' }}</div>
              </div>
              <div>
                <strong>Session Cookie (_bm)</strong>
                <div class="bm-code-wrap">{{ snapshot.cookie || 'Pending session init' }}</div>
              </div>
              <div>
                <strong>Latest Recorded Event</strong>
                <div v-if="recentEvents.length > 0" class="tabular-nums">
                  {{ recentEvents[0].eventName }} on {{ recentEvents[0].path }} ({{ recentEvents[0].timestamp.slice(11, 19) }})
                </div>
                <div v-else>Navigate across pages to inspect your live session events.</div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer class="bm-footer">
      <div class="bm-container bm-footer__inner">
        <div>
          <strong class="bm-footer__brand">BeeloftMetric</strong>
          <p class="bm-footer__copy">Multi-channel social analytics, scheduling, and attribution platform.</p>
        </div>
        <nav aria-label="Footer navigation" class="bm-footer__links">
          <router-link to="/pricing" class="bm-arrow-link">Pricing</router-link>
          <router-link to="/login" class="bm-arrow-link">Sign in</router-link>
          <router-link to="/register" class="bm-arrow-link">Create account</router-link>
          <router-link to="/legal" class="bm-arrow-link">Terms & Privacy</router-link>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, h, onMounted, ref } from 'vue';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import TiltSurface from '@/components/common/motion/TiltSurface.vue';
import { apiRequest } from '@/services/api';
import { getAttributionSnapshot } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';
import type { AttributionEvent } from '@/types/api';

const OrbitalHeroScene = defineAsyncComponent({
  loader: () => import('@/components/three/OrbitalHeroScene.vue'),
  loadingComponent: () =>
    h(
      'div',
      {
        style:
          'height:390px;border-radius:22px;border:1px solid var(--bm-divider);background:var(--bm-elevated);display:flex;align-items:center;justify-content:center;color:var(--bm-text-muted);font-size:14px;'
      },
      'Initializing 3D orbital telemetry stage...'
    )
});

const store = useAppStore();
const recentEvents = ref<AttributionEvent[]>([]);
const snapshot = ref(getAttributionSnapshot());
const readinessLabel = ref('Operational');
const readinessSub = ref('Cloudflare Edge API + Multi-tenant D1');

const aiPrompt = ref('');
const aiLoading = ref(false);
const aiInfoShown = ref(false);
const aiResult = ref('');

const channelCapabilityRows = [
  { name: 'Website & Blog', auth: 'tracker.js', sync: 'Real-time 3D' },
  { name: 'Instagram & Facebook', auth: 'Meta OAuth2', sync: 'Graph + Webhook' },
  { name: 'TikTok & YouTube', auth: 'OAuth2', sync: 'Metrics + Video' },
  { name: 'X (Twitter) & LinkedIn', auth: 'OAuth2 PKCE', sync: 'Live Publish' },
  { name: 'SmartLink (/bio/:slug)', auth: 'Built-in', sync: 'Instant Clicks' }
];

async function runAiComposer(): Promise<void> {
  if (!aiPrompt.value.trim()) return;
  aiLoading.value = true;
  try {
    const res = await apiRequest<{ data: { generatedCopy: string; suggestedHashtags: string[] } }>(
      '/api/v2/integrations/ai/natural-language-scheduling',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: aiPrompt.value,
          network: 'linkedin',
          language: 'id'
        })
      }
    );
    aiResult.value = `${res.data.generatedCopy} ${res.data.suggestedHashtags.join(' ')}`;
  } finally {
    aiLoading.value = false;
  }
}

async function loadTelemetry(): Promise<void> {
  snapshot.value = getAttributionSnapshot();
  const vidQuery = snapshot.value.visitorId ? `?visitorId=${encodeURIComponent(snapshot.value.visitorId)}` : '';
  const [attRes, readyRes] = await Promise.all([
    apiRequest<{ data: AttributionEvent[] }>(`/api/v2/attribution/recent${vidQuery}`).catch(() => ({ data: [] })),
    apiRequest<{ ok: boolean; storageDriver: string; d1Bound: boolean }>('/api/v2/system/readiness').catch(() => null)
  ]);
  recentEvents.value = attRes.data;
  if (readyRes?.ok) {
    readinessLabel.value = readyRes.d1Bound ? 'Cloudflare D1 Live' : 'API Online';
    readinessSub.value = `Storage driver: ${readyRes.storageDriver}`;
  }
}

onMounted(() => {
  setTimeout(loadTelemetry, 200);
});
</script>

<style scoped>
.bm-landing {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.bm-container {
  max-width: 1220px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
}

.bm-hero-section {
  padding: 48px 0 72px;
}

.bm-hero-split {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 36px;
  align-items: center;
}

.bm-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bm-display-title {
  font-family: var(--font-signifier);
  font-weight: 400;
  font-size: clamp(38px, 5vw, 68px);
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: var(--bm-text);
}

.bm-display-title em {
  font-style: italic;
  color: var(--bm-accent);
}

.bm-hero-sub {
  max-width: 56ch;
  font-size: 17px;
  line-height: 1.5;
  color: var(--bm-text-muted);
}

.bm-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.bm-pill-filled,
.bm-pill-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 22px;
  border-radius: var(--radius-buttons);
  font-family: var(--font-sohne);
  font-size: 15.5px;
  font-weight: 500;
  text-decoration: none;
}

.bm-pill-filled {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border: 1px solid var(--bm-brand);
  box-shadow: var(--bm-shadow-btn-primary);
}

.bm-pill-filled:hover {
  background: var(--bm-brand-hover);
  transform: translateY(-1px);
}

.bm-pill-filled:active {
  transform: translateY(2px);
  box-shadow: var(--bm-shadow-btn-primary-active);
}

.bm-pill-ghost {
  background: var(--bm-elevated);
  color: var(--bm-text);
  border: 1px solid var(--bm-control-border);
  box-shadow: 0 1px 0 var(--bm-border-specular) inset;
}

.bm-pill-ghost:hover {
  background: var(--bm-surface);
  transform: translateY(-1px);
}

.bm-composer-card {
  margin-top: 8px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bm-composer-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.bm-ghost-tag {
  font-size: 13px;
  font-weight: 600;
  color: var(--bm-text-muted);
}

.bm-composer-box {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--radius-inputs);
  padding: 6px 10px;
  background: var(--bm-surface);
}

.bm-circle-ghost {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 1px solid var(--bm-divider);
  background: var(--bm-elevated);
  color: var(--bm-text);
  font-size: 14px;
  font-weight: 600;
}

.bm-circle-ghost:hover {
  border-color: var(--bm-accent);
}

.bm-composer-input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--bm-text);
}

.bm-circle-send {
  min-width: 44px;
  height: 40px;
  padding: 0 12px;
  flex-shrink: 0;
  border-radius: 9999px;
  border: none;
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  font-size: 13px;
  font-weight: 600;
}

.bm-composer-reply {
  padding: 10px 12px;
  border-radius: var(--radius-smallcards);
  background: var(--bm-surface);
  font-size: 13.5px;
  overflow-wrap: anywhere;
}

.bm-hero-stage-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.bm-hero-mini-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.bm-mini-stat {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bm-stat-val {
  font-size: 22px;
  font-weight: 600;
  color: var(--bm-text);
  line-height: 1.2;
}

.bm-stat-delta {
  font-size: 13px;
  color: var(--bm-text-muted);
}

.bm-fog-band {
  background: var(--bm-subtle);
  border-top: 1px solid var(--bm-divider);
  border-bottom: 1px solid var(--bm-divider);
  padding: 76px 0;
}

.bm-band-head {
  max-width: 760px;
  margin-bottom: 36px;
}

.bm-section-heading {
  font-size: clamp(30px, 4vw, 50px);
  line-height: 1.18;
  margin-bottom: 12px;
}

.bm-band-sub {
  font-size: 17px;
  color: var(--bm-text-muted);
}

.bm-asymmetric-showcase {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.bm-flagship-card {
  padding: 28px;
}

.bm-flagship-card :deep(.bm-tilt-surface__inner) {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 28px;
  align-items: center;
}

.bm-flagship-card__copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bm-flagship-card__copy h3,
.bm-secondary-card h3 {
  font-size: 21px;
  font-weight: 600;
  color: var(--bm-text);
}

.bm-flagship-card__copy p,
.bm-secondary-card p {
  font-size: 15.5px;
  line-height: 1.52;
  color: var(--bm-text-muted);
}

.bm-flagship-card__table-wrap {
  padding: 16px;
  border-radius: var(--radius-inputs);
  background: var(--bm-surface);
  border: 1px solid var(--bm-border-soft);
}

.bm-mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.bm-mini-table th,
.bm-mini-table td {
  padding: 8px 6px;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
}

.bm-mini-table th {
  font-weight: 600;
  color: var(--bm-text-muted);
}

.bm-muted-cell {
  color: var(--bm-text-muted);
}

.bm-num-col {
  text-align: right;
}

.bm-secondary-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.bm-secondary-card {
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bm-paper-band {
  padding: 76px 0;
}

.bm-attribution-callout {
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bm-peach-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.bm-peach-eyebrow {
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 4px;
}

.bm-peach-head h2 {
  font-size: clamp(24px, 3vw, 32px);
}

.bm-peach-btn {
  min-height: 44px;
  padding: 0 20px;
  border-radius: 9999px;
  border: 1px solid currentColor;
  background: transparent;
  color: var(--bm-accent-soft-text);
  font-size: 14.5px;
  font-weight: 600;
}

.bm-peach-btn:hover {
  background: rgba(140, 47, 20, 0.12);
}

.bm-peach-quote {
  font-size: 17px;
  line-height: 1.48;
  max-width: 68ch;
}

.bm-peach-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(140, 47, 20, 0.25);
  font-size: 14px;
}

.bm-code-wrap {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-wrap: anywhere;
}

.bm-footer {
  margin-top: auto;
  background: var(--bm-subtle);
  border-top: 1px solid var(--bm-divider);
  padding: 28px 0;
}

.bm-footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.bm-footer__brand {
  font-weight: 600;
}

.bm-footer__copy {
  font-size: 14px;
  color: var(--bm-text-muted);
}

.bm-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

@media (max-width: 980px) {
  .bm-hero-split {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-flagship-card :deep(.bm-tilt-surface__inner) {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-secondary-pair {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .bm-hero-section {
    padding: 28px 0 44px;
  }

  .bm-hero-mini-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-fog-band,
  .bm-paper-band {
    padding: 48px 0;
  }

  .bm-attribution-callout {
    padding: 24px;
  }
}
</style>
