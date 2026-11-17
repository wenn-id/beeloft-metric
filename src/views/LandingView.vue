<template>
  <div class="bm-landing">
    <a href="#landing-main" class="bm-skip-link">Skip to content</a>
    <BrandHeaderPublic />

    <main id="landing-main">
      <!-- Section 1: Steep Hero Spread on Paper White #ffffff -->
      <section class="bm-hero-section">
        <div class="bm-container">
          <div class="bm-hero-header">
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
                {{ store.isAuthenticated ? 'Open workspace' : 'Create free workspace' }}
              </router-link>
              <router-link to="/pricing" class="bm-pill-ghost bm-transition">
                Compare plans
              </router-link>
            </div>
          </div>

          <!-- Floating Product Artifacts Collage (Honest Product Interface Preview) -->
          <div class="bm-collage">
            <!-- Artifact 1: Supported Channels & Sync Modes -->
            <article class="bm-artifact bm-artifact--table">
              <div class="bm-artifact__top">
                <div>
                  <span class="bm-ghost-tag">Supported Integrations</span>
                  <h3>Connected channel modes</h3>
                </div>
                <span class="bm-avatar-wrap" aria-hidden="true">
                  <span class="bm-avatar-bubble bm-avatar--peach">BM</span>
                </span>
              </div>
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
                    <td>{{ row.name }}</td>
                    <td class="bm-muted-cell">{{ row.auth }}</td>
                    <td class="bm-num-col">{{ row.sync }}</td>
                  </tr>
                </tbody>
              </table>
            </article>

            <!-- Artifact 2: Edge Infrastructure Readiness -->
            <article class="bm-artifact bm-artifact--stat">
              <div class="bm-artifact__top">
                <span class="bm-ghost-tag">Edge Runtime Status</span>
                <span class="bm-avatar-wrap" aria-hidden="true">
                  <span class="bm-avatar-bubble bm-avatar--mist">CF</span>
                </span>
              </div>
              <p class="bm-stat-val">
                {{ readinessLabel }}
              </p>
              <p class="bm-stat-delta">{{ readinessSub }}</p>
              <svg viewBox="0 0 220 56" class="bm-gestural-svg" aria-hidden="true">
                <path
                  d="M4 46 C 36 42, 52 24, 84 28 C 116 32, 144 12, 176 18 C 194 21, 206 10, 216 8"
                  fill="none"
                  stroke="#5d2a1a"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
              </svg>
            </article>

            <!-- Artifact 3: Scheduler & Cron Cadence -->
            <article class="bm-artifact bm-artifact--curve">
              <div class="bm-artifact__top">
                <div>
                  <span class="bm-ghost-tag">Auto-Publisher Cron</span>
                  <p class="bm-stat-val tabular-nums">5 min</p>
                </div>
                <span class="bm-radial-pill">D1 + R2 Edge</span>
              </div>
              <svg viewBox="0 0 240 62" class="bm-gestural-svg" aria-hidden="true">
                <path
                  d="M4 50 Q 48 48 80 34 T 156 26 T 236 12"
                  fill="none"
                  stroke="#5d2a1a"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
              </svg>
              <p class="bm-stat-delta">Executes scheduled posts, AutoLists, and webhook flows</p>
            </article>

            <!-- Artifact 4: Working AI Composer Input -->
            <article class="bm-artifact bm-artifact--composer">
              <div class="bm-artifact__top">
                <span class="bm-ghost-tag">Natural Language Caption Assistant · Live API</span>
              </div>
              <form class="bm-composer-box" @submit.prevent="runAiComposer">
                <button
                  type="button"
                  class="bm-circle-ghost"
                  aria-label="Insert sample prompt"
                  @click="aiPrompt = 'Tulis pengumuman peluncuran koleksi akhir tahun untuk Instagram'"
                >
                  @
                </button>
                <button
                  type="button"
                  class="bm-circle-ghost"
                  aria-label="Show AI endpoint details"
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
                  class="bm-circle-send"
                  aria-label="Generate post draft"
                  :disabled="aiLoading"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
              <p v-if="aiInfoShown" class="bm-composer-reply">
                Calls <code>POST /api/v2/integrations/ai/natural-language-scheduling</code> on the
                edge API using Workers AI, Gemini, or OpenAI.
              </p>
              <p v-if="aiResult" class="bm-composer-reply" role="status">
                <strong>Draft:</strong> {{ aiResult }}
              </p>
            </article>
          </div>
        </div>
      </section>

      <!-- Section 2: Alternating Fog White #fafafb Band with Flat Mist Gray Cards #f2f2f3 -->
      <section id="capabilities" class="bm-fog-band">
        <div class="bm-container">
          <div class="bm-band-head">
            <h2 class="bm-section-heading">Every module isolated per workspace and backed by live edge storage.</h2>
            <p class="bm-band-sub">
              Register an account to manage multiple client brands, embed real-time web tracking,
              upload campaign media to R2, and publish across connected networks.
            </p>
          </div>

          <div class="bm-neutral-grid">
            <article v-for="card in featureCards" :key="card.id" class="bm-card bm-neutral-card">
              <span class="bm-ghost-tag">{{ card.category }}</span>
              <h3>{{ card.title }}</h3>
              <p>{{ card.body }}</p>
              <router-link :to="store.isAuthenticated ? card.authedTo : '/register'" class="bm-arrow-link">
                {{ card.cta }}
              </router-link>
            </article>
          </div>
        </div>
      </section>

      <!-- Section 3: Single Blush Peach Editorial Accent Card on #ffffff Canvas -->
      <section class="bm-paper-band">
        <div class="bm-container">
          <article class="bm-peach-card bm-attribution-callout" aria-label="Live Attribution Telemetry">
            <div class="bm-peach-head">
              <div>
                <p class="bm-peach-eyebrow">First-party session telemetry</p>
                <h2>Live Attribution Engine (_bm) on beeloftmetric.biz.id</h2>
              </div>
              <button type="button" class="bm-peach-btn" @click="loadTelemetry">
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
import { onMounted, ref } from 'vue';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import { apiRequest } from '@/services/api';
import { getAttributionSnapshot } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';
import type { AttributionEvent } from '@/types/api';

const store = useAppStore();
const recentEvents = ref<AttributionEvent[]>([]);
const snapshot = ref(getAttributionSnapshot());
const readinessLabel = ref('Operational');
const readinessSub = ref('Cloudflare Edge API + Multi-tenant isolation');

const aiPrompt = ref('');
const aiLoading = ref(false);
const aiInfoShown = ref(false);
const aiResult = ref('');

const channelCapabilityRows = [
  { name: 'Website & Blog', auth: 'tracker.js', sync: 'Real-time' },
  { name: 'Instagram & Facebook', auth: 'Meta OAuth2', sync: 'Graph + Webhook' },
  { name: 'TikTok & YouTube', auth: 'OAuth2', sync: 'Metrics + Video' },
  { name: 'X (Twitter) & LinkedIn', auth: 'OAuth2 PKCE', sync: 'Live Publish' },
  { name: 'SmartLink (/bio/:slug)', auth: 'Built-in', sync: 'Instant Clicks' }
];

const featureCards = [
  {
    id: 'analytics',
    category: 'Analytics',
    title: 'Evolution, Real-Time Web & Competitors',
    body: 'Monitor real-time active website visitors via tracker.js, inspect Cloudflare country breakdowns, and benchmark competitor handles.',
    cta: 'Open Analytics workspace',
    authedTo: '/evolution/brandSummary'
  },
  {
    id: 'planning',
    category: 'Scheduling',
    title: 'Calendar, R2 Media, Flows & Cron Queue',
    body: 'Upload campaign visuals to R2, schedule multi-network queues executed by 5-minute Cron triggers, and automate Comment-to-DM replies.',
    cta: 'Open Planning calendar',
    authedTo: '/planner'
  },
  {
    id: 'operations',
    category: 'Operations',
    title: 'Reporting Studio, Inbox & Public SmartLinks',
    body: 'Publish shareable /bio/:slug microsites across devices, triage webhook DMs in Unified Inbox, and export branded reports.',
    cta: 'Open SmartLinks & Reports',
    authedTo: '/smartlink'
  }
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
  background: var(--color-paper-white);
}

.bm-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
}

.bm-hero-section {
  background: var(--color-paper-white);
  padding: 56px 0 80px;
}

.bm-hero-header {
  max-width: 920px;
  margin: 0 auto 56px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.bm-display-title {
  font-family: var(--font-signifier);
  font-weight: 400;
  font-size: clamp(42px, 6.2vw, 84px);
  line-height: 1.15;
  letter-spacing: -0.025em;
  color: var(--color-ink-black);
}

.bm-display-title em {
  font-style: italic;
}

.bm-hero-sub {
  max-width: 58ch;
  font-size: 17px;
  line-height: 1.45;
  color: var(--bm-text-muted);
}

.bm-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.bm-pill-filled,
.bm-pill-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: var(--radius-buttons);
  font-family: var(--font-sohne);
  font-size: 16px;
  font-weight: 400;
  text-decoration: none;
}

.bm-pill-filled {
  background: var(--color-ink-black);
  color: var(--color-paper-white);
  border: 1px solid var(--color-ink-black);
}

.bm-pill-filled:hover {
  background: var(--bm-brand-hover);
}

.bm-pill-ghost {
  background: transparent;
  color: var(--color-ink-black);
  border: 1px solid var(--color-ink-black);
}

.bm-pill-ghost:hover {
  background: var(--color-mist-gray);
}

.bm-collage {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}

.bm-artifact {
  padding: 20px;
  min-width: 0;
}

.bm-artifact--table {
  grid-column: span 5;
}

.bm-artifact--stat {
  grid-column: span 3;
}

.bm-artifact--curve {
  grid-column: span 4;
}

.bm-artifact--composer {
  grid-column: 3 / span 8;
}

.bm-artifact__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.bm-artifact__top h3 {
  font-size: 18px;
  font-weight: 500;
  margin-top: 2px;
}

.bm-ghost-tag {
  font-size: 14px;
  font-weight: 400;
  color: var(--bm-text-muted);
}

.bm-avatar-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.bm-avatar-bubble {
  width: 38px;
  height: 38px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
}

.bm-avatar--peach {
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
}

.bm-avatar--mist {
  background: var(--color-mist-gray);
  color: var(--color-ink-black);
}

.bm-mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.bm-mini-table th,
.bm-mini-table td {
  padding: 8px 4px;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
}

.bm-mini-table th {
  font-weight: 500;
  color: var(--bm-text-muted);
}

.bm-muted-cell {
  color: var(--bm-text-muted);
}

.bm-num-col {
  text-align: right;
}

.bm-stat-val {
  font-size: 24px;
  font-weight: 500;
  color: var(--bg-text, var(--bm-text));
  line-height: 1.2;
}

.bm-stat-delta {
  font-size: 14px;
  color: var(--bm-text-muted);
  margin-top: 4px;
}

.bm-gestural-svg {
  width: 100%;
  height: 58px;
  display: block;
  margin-top: 12px;
}

.bm-radial-pill {
  padding: 4px 10px;
  border-radius: 9999px;
  background: var(--color-mist-gray);
  color: var(--color-ink-black);
  font-size: 13px;
  font-weight: 500;
}

.bm-composer-box {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-inputs);
  padding: 8px 12px;
  background: var(--bm-surface);
}

.bm-circle-ghost {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: var(--bm-text-muted);
  font-size: 16px;
}

.bm-circle-ghost:hover {
  background: var(--color-mist-gray);
  color: var(--color-ink-black);
}

.bm-composer-input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: var(--bm-text);
}

.bm-composer-input:focus-visible {
  outline: none;
}

.bm-circle-send {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 9999px;
  border: none;
  background: var(--color-ink-black);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bm-composer-reply {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-smallcards);
  background: var(--color-mist-gray);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.bm-fog-band {
  background: var(--color-fog-white);
  padding: 80px 0;
}

.bm-band-head {
  max-width: 760px;
  margin-bottom: 40px;
}

.bm-section-heading {
  font-size: clamp(32px, 4.5vw, 56px);
  line-height: 1.2;
  letter-spacing: -0.96px;
  margin-bottom: 12px;
}

.bm-band-sub {
  font-size: 18px;
  color: var(--bm-text-muted);
}

.bm-neutral-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.bm-neutral-card {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bm-neutral-card h3 {
  font-size: 20px;
  font-weight: 500;
  color: var(--bm-text);
}

.bm-neutral-card p {
  font-size: 16px;
  line-height: 1.5;
  color: var(--bm-text);
  margin-bottom: auto;
}

.bm-paper-band {
  background: var(--color-paper-white);
  padding: 80px 0;
}

.bm-attribution-callout {
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bm-peach-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.bm-peach-eyebrow {
  font-size: 14px;
  margin-bottom: 4px;
}

.bm-peach-head h2 {
  font-size: clamp(24px, 3vw, 32px);
}

.bm-peach-btn {
  min-height: 44px;
  padding: 0 20px;
  border-radius: 9999px;
  border: 1px solid var(--color-sienna-brown);
  background: transparent;
  color: var(--color-sienna-brown);
  font-size: 15px;
  font-weight: 500;
}

.bm-peach-quote {
  font-size: 18px;
  line-height: 1.45;
  max-width: 68ch;
}

.bm-peach-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(93, 42, 26, 0.25);
  font-size: 14px;
}

.bm-code-wrap {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-wrap: anywhere;
}

.bm-footer {
  margin-top: auto;
  background: var(--color-paper-white);
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
  font-weight: 500;
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

@media (max-width: 960px) {
  .bm-artifact--table,
  .bm-artifact--stat,
  .bm-artifact--curve,
  .bm-artifact--composer {
    grid-column: span 12;
  }

  .bm-neutral-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .bm-hero-section {
    padding: 32px 0 48px;
  }

  .bm-attribution-callout {
    padding: 24px;
  }
}
</style>
