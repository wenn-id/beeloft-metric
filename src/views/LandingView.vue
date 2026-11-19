<template>
  <div ref="landing" class="bm-public-page bm-landing">
    <a href="#landing-main" class="bm-skip-link">Skip to content</a>
    <BrandHeaderPublic class="bm-pub-header--editorial" />

    <main id="landing-main" tabindex="-1">
      <section class="bm-hero-section" aria-labelledby="landing-title">
        <div class="bm-container bm-hero-layout">
          <div class="bm-hero-copy">
            <h1 id="landing-title">See what works. <span>Publish what’s next.</span></h1>
            <p>Social analytics and publishing for teams that manage more than one brand.</p>
            <div class="bm-hero-actions">
              <router-link
                :to="store.isAuthenticated ? '/evolution/brandSummary' : '/register'"
                class="bm-public-button bm-public-button--primary"
              >
                {{ store.isAuthenticated ? 'Open workspace' : 'Start 7-day free trial' }}
                <span aria-hidden="true">↗</span>
              </router-link>
              <router-link to="/pricing" class="bm-public-button">Compare plans</router-link>
            </div>
            <a href="#analytics-demo" class="bm-landing-link bm-hero-demo-link">
              Try the analytics demo <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div class="bm-hero-field">
            <HeroSignalField :dark="store.theme === 'dark'" />
          </div>
        </div>
      </section>

      <section id="capabilities" class="bm-container bm-capabilities">
        <h2 data-scroll-reveal>From insight to the next post.</h2>

        <article class="bm-product-panel" data-scroll-reveal>
          <div class="bm-product-copy">
            <span class="bm-feature-label">Analytics</span>
            <h3>Understand what moved the numbers.</h3>
            <p>
              Compare reach, impressions, and engagement across channels. Track competitors
              and see where your website visitors come from in real time.
            </p>
            <router-link :to="workspaceLink('/evolution/web/real-time')" class="bm-landing-link">
              Explore real-time analytics <span aria-hidden="true">↗</span>
            </router-link>
          </div>
          <section id="analytics-demo" class="bm-analytics-demo" aria-labelledby="analytics-demo-title" tabindex="-1">
            <div class="bm-demo-header">
              <div>
                <h4 id="analytics-demo-title">Brand Summary demo</h4>
                <span class="bm-feature-label">Sample data</span>
              </div>
              <select v-model.number="demoDays" class="bm-select" aria-label="Demo date range">
                <option v-for="days in [7, 14, 30]" :key="days" :value="days">Last {{ days }} days</option>
              </select>
            </div>
            <dl class="bm-demo-totals" aria-live="polite">
              <div>
                <dt>Total impressions</dt>
                <dd>{{ demoImpressions.toLocaleString() }}</dd>
              </div>
              <div>
                <dt>Average daily reach</dt>
                <dd>{{ demoAverageReach.toLocaleString() }}</dd>
              </div>
            </dl>
            <InteractiveMetricChart :key="demoDays" :series="demoSeries" />
          </section>
        </article>

        <div class="bm-feature-grid">
          <article class="bm-feature-card bm-feature-card--publishing" data-scroll-reveal>
            <span class="bm-feature-label">Publishing</span>
            <h3>Line up your next campaign.</h3>
            <p>
              Preview and schedule posts from one calendar. Save recurring content to AutoLists
              and set up automatic replies with Comment-to-DM.
            </p>
            <router-link :to="workspaceLink('/planner')" class="bm-landing-link">
              Explore Planner <span aria-hidden="true">↗</span>
            </router-link>
          </article>
          <article class="bm-feature-card" data-scroll-reveal>
            <span class="bm-feature-label">Client work</span>
            <h3>Give each brand its own space.</h3>
            <p>
              Triage messages in a unified inbox, build trackable SmartLinks, and share branded
              PDF or PowerPoint reports with clients.
            </p>
            <router-link :to="workspaceLink('/smartlink')" class="bm-landing-link">
              Explore SmartLinks <span aria-hidden="true">↗</span>
            </router-link>
          </article>
        </div>

        <details class="bm-landing-details">
          <summary>Supported channels</summary>
          <table class="bm-channel-table">
            <thead>
              <tr><th>Channel</th><th>Connection</th><th>Data</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in channelCapabilityRows" :key="row.name">
                <th scope="row">{{ row.name }}</th>
                <td>{{ row.auth }}</td>
                <td>{{ row.sync }}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </section>

      <section class="bm-container bm-landing-tools" aria-label="Product demos">
        <article class="bm-draft-card" data-scroll-reveal>
          <div>
            <h2>Draft your next post.</h2>
            <p>Give the caption assistant a topic for a LinkedIn caption in Indonesian.</p>
          </div>
          <div class="bm-draft-interaction">
            <form class="bm-draft-form" @submit.prevent="runAiComposer">
              <label for="hero-ai-input" class="sr-only">Draft a social post</label>
              <input
                id="hero-ai-input"
                v-model="aiPrompt"
                type="text"
                placeholder="What are you announcing?"
                required
              />
              <button
                type="submit"
                class="bm-public-button bm-public-button--primary"
                aria-label="Generate post draft"
                :disabled="aiLoading"
              >
                {{ aiLoading ? 'Drafting…' : 'Generate draft' }}
              </button>
            </form>
            <button
              type="button"
              class="bm-landing-link bm-sample-prompt"
              aria-label="Insert sample Indonesian prompt"
              @click="aiPrompt = 'Tulis pengumuman peluncuran koleksi akhir tahun untuk LinkedIn'"
            >
              Use an example
            </button>
            <p v-if="aiError" class="bm-draft-message" role="alert">{{ aiError }}</p>
            <p v-if="aiResult" class="bm-draft-message" role="status">{{ aiResult }}</p>
          </div>
        </article>

        <details class="bm-landing-details">
          <summary>Caption assistant API details</summary>
          <p class="bm-caption-endpoint">
            The demo sends the topic to <code>POST /api/v2/integrations/ai/natural-language-scheduling</code>.
          </p>
        </details>

        <details class="bm-landing-details">
          <summary>Live web attribution demo</summary>
          <div class="bm-telemetry">
            <p>
              See how <code>/tracker.js</code> captures sessions, campaign parameters, and clicks
              for your brand analytics.
            </p>
            <dl>
              <div><dt>Visitor ID</dt><dd>{{ snapshot.visitorId || 'Initializing…' }}</dd></div>
              <div><dt>Session cookie</dt><dd>{{ snapshot.cookie || 'Pending session' }}</dd></div>
              <div>
                <dt>Latest event</dt>
                <dd v-if="recentEvents.length">
                  {{ recentEvents[0].eventName }} on {{ recentEvents[0].path }}
                  ({{ recentEvents[0].timestamp.slice(11, 19) }})
                </dd>
                <dd v-else>Waiting for a session event.</dd>
              </div>
              <div v-if="readiness"><dt>API status</dt><dd>{{ readiness }}</dd></div>
            </dl>
            <button type="button" class="bm-public-button" @click="loadTelemetry">
              Refresh session log
            </button>
          </div>
        </details>
      </section>
    </main>

    <footer class="bm-landing-footer">
      <div class="bm-container bm-footer-inner">
        <router-link to="/" class="bm-footer-brand">BeeloftMetric</router-link>
        <nav aria-label="Footer navigation">
          <router-link to="/pricing" class="bm-landing-link">Pricing</router-link>
          <router-link to="/login" class="bm-landing-link">Sign in</router-link>
          <router-link to="/register" class="bm-landing-link">Create account</router-link>
          <router-link to="/legal" class="bm-landing-link">Terms & Privacy</router-link>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import HeroSignalField from '@/components/common/motion/HeroSignalField.vue';
import InteractiveMetricChart from '@/components/common/motion/InteractiveMetricChart.vue';
import { apiRequest } from '@/services/api';
import { getAttributionSnapshot } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';
import type { AttributionEvent, DailyMetricPoint } from '@/types/api';

const store = useAppStore();
const landing = ref<HTMLElement | null>(null);
let revealObserver: IntersectionObserver | undefined;
const recentEvents = ref<AttributionEvent[]>([]);
const snapshot = ref(getAttributionSnapshot());
const readiness = ref('');

const demoDays = ref(14);
const demoSample: DailyMetricPoint[] = [
  3400, 4200, 5700, 5300, 4600, 2800, 3100, 3800, 5100, 6600,
  5800, 6000, 3500, 3700, 4500, 6100, 7200, 8600, 6400, 3800,
  4100, 5900, 7500, 6300, 8400, 9600, 5100, 4300, 6700, 8100
].map((impressions, index) => {
  const reach = Math.round(impressions * (0.62 + (index % 4) * 0.035));
  return {
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    impressions,
    reach,
    followers: 8360 + index * 21,
    interactions: Math.round(reach * 0.048),
    clicks: Math.round(reach * 0.019)
  };
});
const demoSeries = computed(() => demoSample.slice(-demoDays.value));
const demoImpressions = computed(() => demoSeries.value.reduce((total, day) => total + day.impressions, 0));
const demoAverageReach = computed(() => {
  const total = demoSeries.value.reduce((sum, day) => sum + day.reach, 0);
  return Math.round(total / demoSeries.value.length);
});

const aiPrompt = ref('');
const aiLoading = ref(false);
const aiResult = ref('');
const aiError = ref('');

const channelCapabilityRows = [
  { name: 'Website & Blog', auth: 'tracker.js', sync: 'Live visits and events' },
  { name: 'Instagram & Facebook', auth: 'Meta OAuth2', sync: 'Metrics and webhooks' },
  { name: 'TikTok & YouTube', auth: 'OAuth2', sync: 'Metrics and video' },
  { name: 'X (Twitter) & LinkedIn', auth: 'OAuth2 PKCE', sync: 'Publishing' },
  { name: 'SmartLinks', auth: 'Built in', sync: 'Link clicks' }
];

function workspaceLink(path: string): string {
  return store.isAuthenticated ? path : '/register';
}

async function runAiComposer(): Promise<void> {
  if (!aiPrompt.value.trim() || aiLoading.value) return;
  aiLoading.value = true;
  aiError.value = '';
  aiResult.value = '';
  try {
    const res = await apiRequest<{ data: { generatedCopy: string; suggestedHashtags: string[] } }>(
      '/api/v2/integrations/ai/natural-language-scheduling',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt: aiPrompt.value.trim(),
          network: 'linkedin',
          language: 'id'
        })
      }
    );
    aiResult.value = `${res.data.generatedCopy} ${res.data.suggestedHashtags.join(' ')}`;
  } catch {
    aiError.value = 'Could not generate a draft. Try again.';
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
  if (readyRes?.ok) readiness.value = `Online · ${readyRes.storageDriver}`;
}

onMounted(() => {
  setTimeout(loadTelemetry, 200);
  if (typeof IntersectionObserver === 'undefined') return;

  revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('bm-landing-revealed');
      observer.unobserve(entry.target);
    }
  });
  landing.value?.querySelectorAll('[data-scroll-reveal]').forEach((element) => {
    if (element.getBoundingClientRect().top >= window.innerHeight) revealObserver?.observe(element);
  });
});

onBeforeUnmount(() => {
  revealObserver?.disconnect();
});
</script>

<style scoped>
.bm-container {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(18px, 3vw, 36px);
}

.bm-hero-section {
  --bm-hero-paper: #fdfcf9;
  --bm-hero-glow: #ece8fc;

  overflow: clip;
  border-bottom: 1px solid var(--bm-divider);
  background: radial-gradient(ellipse at 79% 52%, var(--bm-hero-glow), transparent 53%), var(--bm-hero-paper);
}

:global([data-theme='dark']) .bm-hero-section {
  --bm-hero-paper: #111115;
  --bm-hero-glow: #1e1932;
}

.bm-hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr);
  align-items: center;
  gap: clamp(24px, 3.7vw, 60px);
  max-width: 1320px;
  min-height: clamp(580px, 78svh, 750px);
  padding-block: clamp(55px, 8vw, 104px);
}

.bm-hero-field {
  position: relative;
  min-width: 0;
  aspect-ratio: 1.13;
}

.bm-hero-copy h1 {
  font-family: var(--font-sohne);
  font-size: clamp(3rem, 5vw, 4.65rem);
  font-weight: 500;
  line-height: 0.99;
  letter-spacing: -0.075em;
  text-wrap: balance;
}

.bm-hero-copy h1 span {
  display: block;
  color: var(--bm-accent);
}

.bm-hero-copy p {
  max-width: 39ch;
  margin-top: 24px;
  color: var(--bm-text-muted);
  font-size: clamp(1rem, 2vw, 1.125rem);
}

.bm-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.bm-hero-actions .bm-public-button {
  border-radius: 999px;
  min-height: 48px;
  padding-inline: 20px;
}

.bm-hero-demo-link {
  margin-top: 8px;
}

.bm-capabilities {
  display: grid;
  gap: 16px;
  padding-block: clamp(54px, 7vw, 100px);
  scroll-margin-top: 78px;
}

.bm-capabilities h2 {
  margin-bottom: 18px;
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.05em;
}

.bm-product-panel,
.bm-feature-card,
.bm-draft-card {
  padding: clamp(24px, 3.5vw, 44px);
  border: 1px solid var(--bm-divider);
  border-radius: 24px;
  background: var(--bm-elevated);
}

.bm-product-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.65fr) minmax(0, 1.35fr);
  align-items: center;
  gap: clamp(24px, 5vw, 64px);
}

.bm-product-panel h3,
.bm-feature-card h3,
.bm-draft-card h2 {
  margin: 10px 0 12px;
  font-family: var(--font-signifier);
  font-size: clamp(2rem, 3.6vw, 3.4rem);
  font-weight: 300;
  line-height: 1.04;
  letter-spacing: -0.035em;
}

.bm-product-copy p,
.bm-feature-card p,
.bm-draft-card p,
.bm-telemetry > p {
  max-width: 48ch;
  color: var(--bm-text-muted);
}

.bm-feature-label,
.bm-telemetry dt {
  font-family: var(--font-data);
  font-size: 11px;
  letter-spacing: 0.045em;
  text-transform: uppercase;
  color: var(--bm-text-muted);
}

.bm-analytics-demo {
  --bm-chart-bar: var(--bm-accent);
  --bm-chart-bar-muted: color-mix(in srgb, var(--bm-accent) 35%, var(--bm-text-muted));
  --bm-chart-line: light-dark(#007693, #00b3dd);

  min-width: 0;
  padding: clamp(14px, 2vw, 24px);
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-cards);
  background: var(--bm-subtle);
  scroll-margin-top: 78px;
}

.bm-demo-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.bm-demo-header h4 {
  margin: 0;
  font-size: 1.125rem;
}

.bm-demo-header .bm-select {
  width: auto;
  max-width: 100%;
}

.bm-demo-totals {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  margin-block: 16px;
}

.bm-demo-totals dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--bm-text-muted);
  font-size: 0.8125rem;
}

.bm-demo-totals dt::before {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--bm-chart-bar-muted);
  content: '';
}

.bm-demo-totals div + div dt::before {
  width: 10px;
  height: 2px;
  background: var(--bm-chart-line);
}

.bm-demo-totals dd {
  margin: 0;
  font-size: clamp(1.375rem, 3vw, 2rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.035em;
}

.bm-feature-grid,
.bm-draft-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.bm-feature-card--publishing {
  --bm-text: var(--bm-category-text);
  --bm-text-muted: var(--bm-category-muted);
  --bm-accent: #4b49aa;

  border-color: transparent;
  background: var(--bm-category-bg);
  color: var(--bm-text);
}

.bm-product-copy .bm-landing-link,
.bm-feature-card .bm-landing-link {
  margin-top: 12px;
}

.bm-landing-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: inherit;
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.bm-landing-link:hover {
  text-decoration-thickness: 2px;
}

.bm-landing-details {
  padding-inline: 20px;
  border-block: 1px solid var(--bm-divider);
}

.bm-landing-details summary {
  min-height: 48px;
  padding-block: 13px;
  color: var(--bm-text);
  font-size: 14px;
}

.bm-channel-table {
  width: 100%;
  margin-bottom: 16px;
  border-collapse: collapse;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.bm-channel-table td,
.bm-channel-table th {
  padding: 10px 8px 10px 0;
  border-top: 1px solid var(--bm-divider);
  text-align: left;
}

.bm-channel-table td {
  color: var(--bm-text-muted);
}

.bm-landing-tools {
  display: grid;
  gap: 16px;
  padding-bottom: clamp(54px, 7vw, 96px);
}

.bm-draft-card {
  align-items: center;
  gap: 28px;
}

.bm-draft-card h2 {
  margin-top: 0;
}

.bm-draft-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bm-draft-form input {
  flex: 1 1 180px;
  min-width: 0;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--radius-inputs);
  background: var(--bm-bg);
}

.bm-draft-form input::placeholder {
  color: var(--bm-text-muted);
}

.bm-sample-prompt {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--bm-text-muted);
}

.bm-draft-card .bm-draft-message {
  max-width: none;
  padding-top: 8px;
  border-top: 1px solid var(--bm-divider);
  overflow-wrap: anywhere;
}

.bm-telemetry {
  padding-bottom: 16px;
}

.bm-caption-endpoint {
  padding-bottom: 16px;
  color: var(--bm-text-muted);
  overflow-wrap: anywhere;
}

.bm-telemetry dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 12px;
}

.bm-telemetry dd {
  margin: 4px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.bm-landing-footer {
  padding-block: 20px;
  border-top: 1px solid var(--bm-divider);
}

.bm-footer-inner,
.bm-footer-inner nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 20px;
}

.bm-footer-inner {
  justify-content: space-between;
}

.bm-footer-brand {
  font-weight: 600;
  text-decoration: none;
}

@media (prefers-reduced-motion: no-preference) {
  .bm-landing-revealed {
    animation: bm-landing-reveal 570ms var(--ease-out-quart);
  }

  .bm-landing-revealed:focus-within {
    --bm-reveal-opacity: 1;
    --bm-reveal-offset: 0px;
  }

  @supports (view-timeline-name: --bm-hero-scroll) and (animation-range: exit 0% exit 100%) {
    .bm-hero-section {
      view-timeline-name: --bm-hero-scroll;
    }

    .bm-hero-field {
      animation: bm-hero-drift auto linear both;
      animation-timeline: --bm-hero-scroll;
      animation-range: exit 0% exit 100%;
    }
  }
}

@keyframes bm-landing-reveal {
  from {
    opacity: var(--bm-reveal-opacity, 0.35);
    transform: translateY(var(--bm-reveal-offset, 24px));
  }
}

@keyframes bm-hero-drift {
  from { translate: 0 0; }
  to { translate: 0 64px; }
}

@media (max-width: 800px) {
  .bm-product-panel,
  .bm-draft-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-hero-layout {
    grid-template-columns: minmax(0, 1fr);
    padding-block: clamp(40px, 7.5vw, 60px) 22px;
    min-height: 0;
    gap: 8px;
  }

  .bm-hero-copy h1 {
    font-size: clamp(2.4rem, 11vw, 4.6rem);
  }

  .bm-hero-field {
    width: min(100%, 490px);
    margin-inline: auto;
    aspect-ratio: 1.36;
  }
}

@media (max-width: 580px) {
  .bm-feature-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-draft-form .bm-public-button {
    width: 100%;
  }
}

</style>
