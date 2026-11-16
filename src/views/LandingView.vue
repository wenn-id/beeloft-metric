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
              BeeloftMetric unifies channel evolution, scheduling calendars, Comment-to-DM flows,
              unified inbox triage, and first-party attribution telemetry in one calm workspace.
            </p>
            <div class="bm-hero-actions">
              <router-link to="/register" class="bm-pill-filled bm-transition">
                Get started
              </router-link>
              <router-link
                to="/evolution/brandSummary?blogId=8137744&userId=6401427"
                class="bm-pill-ghost bm-transition"
              >
                Open sample workspace
              </router-link>
            </div>
          </div>

          <!-- Floating Product Artifacts Collage -->
          <div class="bm-collage">
            <!-- Artifact 1: Channel Reach & Region Table -->
            <article class="bm-artifact bm-artifact--table">
              <div class="bm-artifact__top">
                <div>
                  <span class="bm-ghost-tag">Channels · [SAMPLE DATA]</span>
                  <h3>Cross-channel reach</h3>
                </div>
                <span class="bm-avatar-wrap" aria-hidden="true">
                  <span class="bm-avatar-bubble bm-avatar--peach">BM</span>
                  <svg class="bm-cursor-arrow" width="12" height="12" viewBox="0 0 12 12">
                    <path d="M1 1l9 4-4 1.5L4.5 11 1 1z" fill="#17191c" />
                  </svg>
                </span>
              </div>
              <table class="bm-mini-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Status</th>
                    <th class="bm-num-col">30d Reach</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sampleChannelRows" :key="row.name">
                    <td>{{ row.name }}</td>
                    <td class="bm-muted-cell">{{ row.handle }}</td>
                    <td class="bm-num-col tabular-nums">{{ row.reach }}</td>
                  </tr>
                </tbody>
              </table>
            </article>

            <!-- Artifact 2: Stat Card with Gestural Sienna Line -->
            <article class="bm-artifact bm-artifact--stat">
              <div class="bm-artifact__top">
                <span class="bm-ghost-tag">Impressions · Last 30 days</span>
                <span class="bm-avatar-wrap" aria-hidden="true">
                  <span class="bm-avatar-bubble bm-avatar--mist">OP</span>
                </span>
              </div>
              <p class="bm-stat-val tabular-nums">
                {{ liveImpressions }}
              </p>
              <p class="bm-stat-delta">{{ liveDelta }}</p>
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

            <!-- Artifact 3: Activation / Engagement Curve -->
            <article class="bm-artifact bm-artifact--curve">
              <div class="bm-artifact__top">
                <div>
                  <span class="bm-ghost-tag">Engagement · Aug to Nov</span>
                  <p class="bm-stat-val tabular-nums">4.80%</p>
                </div>
                <span class="bm-radial-pill tabular-nums">36,058 acts</span>
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
              <p class="bm-stat-delta">Compared across 7 connected profiles [SAMPLE DATA]</p>
            </article>

            <!-- Artifact 4: Working AI Composer Input -->
            <article class="bm-artifact bm-artifact--composer">
              <div class="bm-artifact__top">
                <span class="bm-ghost-tag">Natural Language Scheduler · Live API</span>
              </div>
              <form class="bm-composer-box" @submit.prevent="runAiComposer">
                <button
                  type="button"
                  class="bm-circle-ghost"
                  aria-label="Insert channel mention preset"
                  @click="aiPrompt = 'Announce our Q4 content audit checklist on LinkedIn'"
                >
                  @
                </button>
                <button
                  type="button"
                  class="bm-circle-ghost"
                  aria-label="Show AI prompt tip"
                  @click="aiInfoShown = !aiInfoShown"
                >
                  i
                </button>
                <label for="hero-ai-input" class="sr-only">Ask BeeloftMetric AI</label>
                <input
                  id="hero-ai-input"
                  v-model="aiPrompt"
                  type="text"
                  class="bm-composer-input"
                  placeholder="Ask anything... (e.g. Draft a Q4 release update)"
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
                Calls <code>POST /api/v2/integrations/ai/natural-language-scheduling</code> using the
                active Brand AI Configuration.
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
            <h2 class="bm-section-heading">Built as an editorial workspace, backed by 1:1 APIs.</h2>
            <p class="bm-band-sub">
              Explore Analytics, Planning & Flows, Unified Inbox, SmartLinks, Advertising, and
              Operator Backoffice without leaving the local repository stack.
            </p>
          </div>

          <div class="bm-neutral-grid">
            <article v-for="card in featureCards" :key="card.id" class="bm-card bm-neutral-card">
              <span class="bm-ghost-tag">{{ card.category }}</span>
              <h3>{{ card.title }}</h3>
              <p>{{ card.body }}</p>
              <router-link :to="card.to" class="bm-arrow-link">
                {{ card.cta }} →
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
                <h2>Attribution Engine (_bm) recording locally</h2>
              </div>
              <button type="button" class="bm-peach-btn" @click="loadTelemetry">
                Refresh event log
              </button>
            </div>

            <p class="bm-peach-quote">
              Every navigation and CTA click fires structured telemetry to <code>/s/session</code>
              and <code>/s</code>, writing visitor cookies cleanly into local JSON persistence.
            </p>

            <div class="bm-peach-meta">
              <div>
                <strong>Visitor ID</strong>
                <div class="tabular-nums">{{ snapshot.visitorId || 'Initializing...' }}</div>
              </div>
              <div>
                <strong>Cookie (_bm)</strong>
                <div class="bm-code-wrap">{{ snapshot.cookie || 'Pending session init' }}</div>
              </div>
              <div>
                <strong>Latest Recorded Event</strong>
                <div v-if="recentEvents.length > 0" class="tabular-nums">
                  {{ recentEvents[0].eventName }} on {{ recentEvents[0].path }} ({{ recentEvents[0].timestamp.slice(11, 19) }})
                </div>
                <div v-else>Navigate across modules to populate recorded events.</div>
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
          <p class="bm-footer__copy">Local Vue 3 + Fastify social analytics and scheduling suite.</p>
        </div>
        <nav aria-label="Footer navigation" class="bm-footer__links">
          <router-link to="/pricing" class="bm-arrow-link">Pricing</router-link>
          <router-link to="/evolution/brandSummary?blogId=8137743" class="bm-arrow-link">Empty brand</router-link>
          <router-link to="/bio/beeloft-studio" class="bm-arrow-link">Sample SmartLink</router-link>
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
import type { AttributionEvent, EvolutionSummaryResponse } from '@/types/api';

const recentEvents = ref<AttributionEvent[]>([]);
const snapshot = ref(getAttributionSnapshot());
const liveImpressions = ref('1,021,567');
const liveDelta = ref('+14.4% vs previous 30 days');

const aiPrompt = ref('');
const aiLoading = ref(false);
const aiInfoShown = ref(false);
const aiResult = ref('');

const sampleChannelRows = [
  { name: 'Instagram', handle: '@beeloft.studio', reach: '198,240' },
  { name: 'TikTok', handle: '@beeloftstudio', reach: '305,400' },
  { name: 'YouTube', handle: 'Beeloft Studio Lab', reach: '126,720' },
  { name: 'LinkedIn', handle: 'Beeloft Digital Co.', reach: '63,360' },
  { name: 'Website & Blog', handle: 'beeloft-studio.example', reach: '57,413' }
];

const featureCards = [
  {
    id: 'analytics',
    category: 'Analytics',
    title: 'Evolution, Real-Time Web & Competitors',
    body: 'Track 30-day reach trends, active site visitors, competitor engagement rates, and historical hashtags side by side.',
    cta: 'Explore Analytics',
    to: '/evolution/brandSummary?blogId=8137744&userId=6401427'
  },
  {
    id: 'planning',
    category: 'Scheduling',
    title: 'Calendar, AutoLists, Flows & AI Drafts',
    body: 'Schedule multi-network campaigns, automate Comment-to-DM replies, and approve queued posts via My Tasks.',
    cta: 'Open Planning',
    to: '/planner/flows?blogId=8137744&userId=6401427'
  },
  {
    id: 'operations',
    category: 'Operations',
    title: 'Reporting Studio, Ads, Inbox & SmartLinks',
    body: 'Build shareable Studio decks, triage Unified Inbox threads, manage Meta and Google keywords, and track /bio/ clicks.',
    cta: 'Open Reporting Studio',
    to: '/reporting/studio?blogId=8137744&userId=6401427'
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
          blogId: 8137744,
          prompt: aiPrompt.value,
          network: 'linkedin'
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
  const [attRes, evoRes] = await Promise.all([
    apiRequest<{ data: AttributionEvent[] }>('/api/v2/attribution/recent').catch(() => ({ data: [] })),
    apiRequest<{ data: EvolutionSummaryResponse }>(
      '/api/v2/evolution/summary?blogId=8137744&network=brandSummary&days=30'
    ).catch(() => null)
  ]);
  recentEvents.value = attRes.data;
  if (evoRes?.data?.kpis?.[0]) {
    const first = evoRes.data.kpis[0];
    liveImpressions.value = typeof first.value === 'number' ? first.value.toLocaleString() : String(first.value);
    liveDelta.value = first.deltaText;
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

.bm-cursor-arrow {
  position: relative;
  margin-left: -4px;
  margin-top: 24px;
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
  color: var(--color-ink-black);
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
  background: var(--color-paper-white);
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
  color: var(--color-ink-black);
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
  font-size: clamp(32px, 4.5vw, 64px);
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
  color: var(--color-ink-black);
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
