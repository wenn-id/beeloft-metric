<template>
  <AppShell>
    <div class="bm-evo-layout">
      <aside class="bm-evo-sidebar bm-card" aria-label="Analytics sections">
        <div class="bm-sidebar-group">
          <p class="bm-sidebar-heading">Overview</p>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'brandSummary' }"
            @click="selectSection('brandSummary')"
          >
            Brand Summary
          </button>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'web' }"
            @click="selectSection('web')"
          >
            <NetworkBadge network="web" /> Website & Blog
          </button>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'real-time' }"
            @click="selectSection('real-time')"
          >
            <NetworkBadge network="web" /> Real-Time Web
          </button>
        </div>

        <div class="bm-sidebar-group">
          <p class="bm-sidebar-heading">Social Networks</p>
          <button
            v-for="net in socialChannels"
            :key="net"
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === net }"
            @click="selectSection(net)"
          >
            <NetworkBadge :network="net" />
            <span>{{ channelLabel(net) }}</span>
            <span v-if="isConnected(net)" class="bm-conn-tag">On</span>
          </button>
        </div>

        <div class="bm-sidebar-group">
          <p class="bm-sidebar-heading">Local & Paid</p>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'gmb' }"
            @click="selectSection('gmb')"
          >
            <NetworkBadge network="gmb" /> Google Business Profile
          </button>
          <button
            v-for="adNet in adChannels"
            :key="adNet"
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === adNet }"
            @click="selectSection(adNet)"
          >
            <NetworkBadge :network="adNet" />
            <span>{{ channelLabel(adNet) }}</span>
            <span v-if="isConnected(adNet)" class="bm-conn-tag">On</span>
          </button>
        </div>

        <div class="bm-sidebar-group">
          <p class="bm-sidebar-heading">Tools & Settings</p>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'competitors' }"
            @click="selectSection('competitors')"
          >
            Competitors
          </button>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'hashtag-tracker' }"
            @click="selectSection('hashtag-tracker')"
          >
            Hashtag Tracker
          </button>
          <router-link :to="`/brands/configuration?blogId=${store.activeBlogId}`" class="bm-side-item">
            Brand Settings
          </router-link>
          <router-link :to="`/brands/connections?blogId=${store.activeBlogId}`" class="bm-side-item">
            Brand Connections
          </router-link>
        </div>
      </aside>

      <section class="bm-evo-content">
        <div class="bm-page-head">
          <div>
            <h1>{{ pageHeading }}</h1>
            <p class="bm-page-sub">
              Brand: <strong>{{ store.activeBrand?.name || 'Loading...' }}</strong>
            </p>
          </div>

          <div
            v-if="activeSection !== 'hashtag-tracker' && activeSection !== 'competitors' && activeSection !== 'real-time'"
            class="bm-date-controls"
          >
            <label for="evo-range" class="sr-only">Date range</label>
            <select id="evo-range" v-model.number="days" class="bm-select" @change="loadSummary">
              <option :value="7">Last 7 days</option>
              <option :value="14">Last 14 days</option>
              <option :value="30">Last 30 days</option>
            </select>
          </div>
        </div>

        <!-- Real-Time Web Telemetry Mode -->
        <template v-if="activeSection === 'real-time'">
          <BmStateView
            v-if="realtime && !realtime.connected"
            kind="empty"
            title="Website analytics tracking is not connected"
            description="Connect Website & Blog in Brand Connections to inspect active visitors and live page views."
            action-label="Connect Website & Blog"
            @action="connectWebNow"
          />
          <template v-else-if="realtime">
            <div class="bm-kpi-grid">
              <TiltSurface class="bm-card bm-kpi-card">
                <div class="bm-rt-head">
                  <p class="bm-kpi-card__label">Active Visitors Right Now</p>
                  <BmBadge tone="success" :dot="true">Live 5s</BmBadge>
                </div>
                <p class="bm-kpi-card__value tabular-nums">
                  <AnimatedNumber :value="realtime.activeVisitors" />
                </p>
                <p class="bm-kpi-card__delta">Unique visitors in last 5 minutes</p>
              </TiltSurface>
              <TiltSurface class="bm-card bm-kpi-card">
                <p class="bm-kpi-card__label">Page Views (30m)</p>
                <p class="bm-kpi-card__value tabular-nums">
                  <AnimatedNumber :value="realtime.pageViewsLast30m" />
                </p>
                <p class="bm-kpi-card__delta">First-party tracker.js & SmartLink hits</p>
              </TiltSurface>
            </div>

            <RealtimeGlobe3D :countries="realtime.countries" :theme="store.theme" />

            <div class="bm-rt-grid">
              <section class="bm-card bm-posts-card">
                <h2>Top Active Pages</h2>
                <table class="bm-table">
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th>Active Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pg in realtime.topActivePages" :key="pg.path">
                      <td><code>{{ pg.path }}</code></td>
                      <td class="tabular-nums">{{ pg.visitors }}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <section class="bm-card bm-posts-card">
                <h2>Referrers & Countries</h2>
                <table class="bm-table">
                  <thead>
                    <tr>
                      <th>Source / Country</th>
                      <th>Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="rf in realtime.topReferrers" :key="rf.source">
                      <td>{{ rf.source }}</td>
                      <td class="tabular-nums">{{ rf.visitors }}</td>
                    </tr>
                    <tr v-for="ct in realtime.countries" :key="ct.code">
                      <td>{{ ct.country }} ({{ ct.code }})</td>
                      <td class="tabular-nums">{{ ct.visitors }}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </div>
          </template>
        </template>

        <!-- Competitors Mode -->
        <template v-else-if="activeSection === 'competitors'">
          <div class="bm-card bm-hashtag-form-wrap">
            <h2>Add a competitor profile</h2>
            <form class="bm-hashtag-form" @submit.prevent="addCompetitor">
              <div>
                <label for="comp-handle" class="bm-label">Competitor handle</label>
                <input id="comp-handle" v-model="compHandle" type="text" class="bm-input" placeholder="@competitor" required />
              </div>
              <div>
                <label for="comp-net" class="bm-label">Network</label>
                <select id="comp-net" v-model="compNet" class="bm-select">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">X (Twitter)</option>
                </select>
              </div>
              <div>
                <BmButton type="submit" variant="primary">Track competitor</BmButton>
              </div>
            </form>
          </div>

          <BmStateView
            v-if="competitors.length === 0"
            kind="empty"
            title="No competitors tracked for this brand yet"
            description="Enter a public profile handle above to compare followers, posting cadence, and engagement rate."
          />

          <div v-else class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Channel</th>
                  <th>Followers</th>
                  <th>Posts (30d)</th>
                  <th>Avg Likes / Post</th>
                  <th>Engagement Rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in competitors" :key="c.id">
                  <td>
                    <strong>{{ c.name }}</strong>
                    <div class="bm-handle-sub">{{ c.handle }}</div>
                  </td>
                  <td><NetworkBadge :network="c.network" /></td>
                  <td class="tabular-nums">{{ c.followers.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ c.postsCount }}</td>
                  <td class="tabular-nums">{{ c.likesPerPost }}</td>
                  <td class="tabular-nums">{{ c.engagementRate }}%</td>
                  <td>
                    <BmButton variant="danger" size="sm" @click="removeCompetitor(c.id)">Remove</BmButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Hashtag Tracker Mode -->
        <template v-else-if="activeSection === 'hashtag-tracker'">
          <div class="bm-card bm-hashtag-form-wrap">
            <h2>Track a hashtag</h2>
            <form class="bm-hashtag-form" @submit.prevent="addHashtag">
              <div>
                <label for="ht-tag" class="bm-label">Hashtag</label>
                <input id="ht-tag" v-model="newHashtag" type="text" class="bm-input" placeholder="#campaign" required />
              </div>
              <div>
                <label for="ht-net" class="bm-label">Network</label>
                <select id="ht-net" v-model="newHashtagNet" class="bm-select">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">X (Twitter)</option>
                </select>
              </div>
              <div>
                <BmButton type="submit" variant="primary">Track hashtag</BmButton>
              </div>
            </form>
          </div>

          <BmStateView
            v-if="hashtags.length === 0"
            kind="empty"
            title="No hashtags tracked for this brand yet"
            description="Submit a hashtag above to monitor post count and estimated impressions."
          />

          <div v-else class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Hashtag</th>
                  <th>Network</th>
                  <th>Tracked Posts</th>
                  <th>Estimated Impressions</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in hashtags" :key="h.id">
                  <td><strong>{{ h.hashtag }}</strong></td>
                  <td><NetworkBadge :network="h.network" /></td>
                  <td class="tabular-nums">{{ h.postsCount.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ h.impressions.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ h.trackedAt.slice(0, 10) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Evolution Analytics Mode -->
        <template v-else>
          <BmStateView
            v-if="loading"
            kind="loading"
            title="Loading channel analytics"
            description="Fetching metric series and top posts for the selected period."
          />

          <BmStateView
            v-else-if="errorMsg"
            kind="error"
            title="Unable to load analytics"
            :description="errorMsg"
            action-label="Retry"
            @action="loadSummary"
          />

          <BmStateView
            v-else-if="summary && !summary.connected"
            kind="empty"
            :title="activeSection === 'brandSummary' ? 'No channels connected to this brand yet' : `${sectionTitle} is not connected`"
            :description="activeSection === 'brandSummary'
              ? 'Connect at least one social profile, website, or ad account to populate Brand Summary analytics.'
              : `Connect your ${sectionTitle} account on ${summary.brandName} to sync metrics here.`"
            :action-label="activeSection === 'brandSummary' ? 'Go to Brand Connections' : `Connect ${sectionTitle}`"
            @action="handleEmptyAction"
          />

          <template v-else-if="summary">
            <div class="bm-kpi-grid">
              <TiltSurface v-for="kpi in summary.kpis" :key="kpi.id" class="bm-artifact bm-kpi-card">
                <p class="bm-kpi-card__label">{{ kpi.label }}</p>
                <p class="bm-kpi-card__value tabular-nums">
                  <AnimatedNumber :value="kpi.value" />
                </p>
                <p class="bm-kpi-card__delta">{{ kpi.deltaText }}</p>
              </TiltSurface>
            </div>

            <section class="bm-artifact bm-chart-card" aria-label="Impressions and Reach trend chart">
              <div class="bm-chart-card__head">
                <h2>
                  How did Impressions and Reach trend per day ({{ summary.periodLabel }})?
                </h2>
                <div class="bm-chart-legend">
                  <span><i class="bm-legend-swatch bm-legend-swatch--bar"></i> Impressions</span>
                  <span><i class="bm-legend-swatch bm-legend-swatch--line"></i> Reach</span>
                </div>
              </div>

              <InteractiveMetricChart :series="summary.series" />
            </section>

            <section class="bm-card bm-posts-card">
              <div class="bm-posts-card__head">
                <h2>Top performing posts to review</h2>
                <span class="bm-posts-count tabular-nums">{{ summary.topPosts.length }} items</span>
              </div>

              <BmStateView
                v-if="summary.topPosts.length === 0"
                kind="empty"
                badge-text="No posts yet"
                title="No published posts recorded for this channel"
                description="Schedule or publish content from the Planning workspace to compare post metrics here."
                action-label="Open Planning"
                @action="router.push(`/planner?blogId=${store.activeBlogId}`)"
              />

              <div v-else class="bm-table-scroll">
                <table class="bm-table">
                  <thead>
                    <tr>
                      <th>Published</th>
                      <th>Channel</th>
                      <th>Format</th>
                      <th>Post Summary</th>
                      <th>Reach</th>
                      <th>Engagement</th>
                      <th>Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="post in summary.topPosts" :key="post.id">
                      <td class="tabular-nums">{{ post.publishedAt.slice(0, 10) }}</td>
                      <td><NetworkBadge :network="post.network" /></td>
                      <td>{{ post.format }}</td>
                      <td>{{ post.title }}</td>
                      <td class="tabular-nums">{{ post.reach.toLocaleString() }}</td>
                      <td class="tabular-nums">{{ post.engagementRate }}%</td>
                      <td class="tabular-nums">{{ post.clicks.toLocaleString() }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
        </template>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, h, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import NetworkBadge from '@/components/common/designSystem/atoms/NetworkBadge.vue';
import AnimatedNumber from '@/components/common/motion/AnimatedNumber.vue';
import InteractiveMetricChart from '@/components/common/motion/InteractiveMetricChart.vue';
import TiltSurface from '@/components/common/motion/TiltSurface.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';

const RealtimeGlobe3D = defineAsyncComponent({
  loader: () => import('@/components/three/RealtimeGlobe3D.vue'),
  loadingComponent: () =>
    h(
      'div',
      {
        class: 'bm-card',
        style: 'padding:24px;text-align:center;color:var(--bm-text-muted);'
      },
      'Loading 3D visitor globe...'
    )
});
import type {
  CompetitorProfile,
  EvolutionSummaryResponse,
  HashtagTrack,
  NetworkKey,
  RealtimeOverview
} from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const socialChannels: NetworkKey[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'twitter',
  'pinterest',
  'threads',
  'bluesky',
  'twitch'
];

const adChannels: NetworkKey[] = ['metaAds', 'googleAds', 'tiktokAds'];

const days = ref(30);
const loading = ref(true);
const errorMsg = ref('');
const summary = ref<EvolutionSummaryResponse | null>(null);
const realtime = ref<RealtimeOverview | null>(null);
const competitors = ref<CompetitorProfile[]>([]);
const hashtags = ref<HashtagTrack[]>([]);

const newHashtag = ref('');
const newHashtagNet = ref<'instagram' | 'twitter' | 'tiktok'>('instagram');
const compHandle = ref('');
const compNet = ref<NetworkKey>('instagram');

const activeSection = computed(() => {
  if (route.path.includes('/web/real-time')) return 'real-time';
  if (route.path.includes('competitors')) return 'competitors';
  if (route.path.includes('hashtag-tracker')) return 'hashtag-tracker';
  const net = String(route.params.network || 'brandSummary');
  if (net === 'facebookPage') return 'facebook';
  if (net === 'facebookAds') return 'metaAds';
  return net;
});

function channelLabel(net: string): string {
  const found = store.connections.find((c) => c.network === net);
  if (found) return found.label;
  if (net === 'brandSummary') return 'Brand Summary';
  return net.charAt(0).toUpperCase() + net.slice(1);
}

const sectionTitle = computed(() => channelLabel(activeSection.value));

const pageHeading = computed(() => {
  if (activeSection.value === 'real-time') return 'Real-Time Website Activity';
  if (activeSection.value === 'competitors') return 'Competitor Benchmark';
  if (activeSection.value === 'hashtag-tracker') return 'Hashtag Tracker';
  return sectionTitle.value;
});

function isConnected(net: NetworkKey): boolean {
  return Boolean(store.connections.find((c) => c.network === net)?.connected);
}

async function selectSection(sec: string): Promise<void> {
  let path = `/evolution/${sec}`;
  if (sec === 'real-time') path = '/evolution/web/real-time';
  if (sec === 'competitors') path = '/evolution/competitors';
  if (sec === 'hashtag-tracker') path = '/evolution/hashtag-tracker';
  await router.push({
    path,
    query: { blogId: String(store.activeBlogId) }
  });
}

async function loadSummary(): Promise<void> {
  if (activeSection.value === 'real-time') {
    const res = await apiRequest<{ data: RealtimeOverview }>(
      `/api/v2/evolution/realtime?blogId=${store.activeBlogId}`
    );
    realtime.value = res.data;
    return;
  }

  if (activeSection.value === 'competitors') {
    const res = await apiRequest<{ data: CompetitorProfile[] }>(
      `/api/v2/evolution/competitors?blogId=${store.activeBlogId}`
    );
    competitors.value = res.data;
    return;
  }

  if (activeSection.value === 'hashtag-tracker') {
    const res = await apiRequest<{ data: HashtagTrack[] }>(
      `/api/v2/hashtags/historical?blogId=${store.activeBlogId}`
    );
    hashtags.value = res.data;
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await apiRequest<{ data: EvolutionSummaryResponse }>(
      `/api/v2/evolution/summary?blogId=${store.activeBlogId}&network=${activeSection.value}&days=${days.value}`
    );
    summary.value = res.data;
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to load summary.';
  } finally {
    loading.value = false;
  }
}

async function connectWebNow(): Promise<void> {
  await router.push(`/brands/connections?blogId=${store.activeBlogId}`);
}

async function addCompetitor(): Promise<void> {
  if (!compHandle.value.trim()) return;
  await apiRequest('/api/v2/evolution/competitors', {
    method: 'POST',
    body: JSON.stringify({
      blogId: store.activeBlogId,
      network: compNet.value,
      handle: compHandle.value
    })
  });
  compHandle.value = '';
  await loadSummary();
}

async function removeCompetitor(id: string): Promise<void> {
  await apiRequest(`/api/v2/evolution/competitors/${id}`, { method: 'DELETE' });
  await loadSummary();
}

async function addHashtag(): Promise<void> {
  if (!newHashtag.value.trim()) return;
  await apiRequest('/api/v2/hashtags/historical', {
    method: 'POST',
    body: JSON.stringify({
      blogId: store.activeBlogId,
      hashtag: newHashtag.value,
      network: newHashtagNet.value
    })
  });
  newHashtag.value = '';
  await loadSummary();
}

async function handleEmptyAction(): Promise<void> {
  if (activeSection.value === 'brandSummary') {
    await router.push(`/brands/connections?blogId=${store.activeBlogId}`);
  } else {
    await store.toggleNetworkConnection(activeSection.value as NetworkKey, undefined, true);
    await loadSummary();
  }
}

let rtTimer: ReturnType<typeof setInterval> | null = null;

watch(() => [store.activeBlogId, activeSection.value], loadSummary, { immediate: true });
onMounted(() => {
  loadSummary();
  rtTimer = setInterval(() => {
    if (activeSection.value === 'real-time' && store.activeBlogId) {
      loadSummary().catch(() => undefined);
    }
  }, 5000);
});
onUnmounted(() => {
  if (rtTimer) clearInterval(rtTimer);
});
</script>

<style scoped>
.bm-evo-layout {
  display: grid;
  grid-template-columns: 245px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.bm-evo-sidebar {
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bm-sidebar-heading {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--bm-text-muted);
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
}

.bm-side-item {
  width: 100%;
  min-height: 44px;
  padding: 0.375rem 0.625rem;
  border-radius: var(--bm-radius-md);
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: left;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
}

.bm-side-item:hover {
  background: var(--bm-subtle);
}

.bm-side-item--active {
  background: var(--bm-subtle);
  border-color: var(--bm-accent);
}

.bm-conn-tag {
  margin-left: auto;
  font-size: 0.6875rem;
  padding: 2px 6px;
  border-radius: var(--bm-radius-sm);
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  font-weight: 700;
}

.bm-evo-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-page-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.bm-page-head h1 {
  font-size: clamp(1.375rem, 2.5vw, 1.875rem);
}

.bm-page-sub {
  color: var(--bm-text-muted);
  font-size: 0.9375rem;
}

.bm-date-controls {
  min-width: 170px;
}

.bm-sample-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 400;
}

.bm-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
}

.bm-rt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.bm-kpi-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bm-kpi-card__label {
  font-size: 14px;
  font-weight: 400;
  color: var(--bm-text-muted);
}

.bm-kpi-card__value {
  font-size: 26px;
  font-weight: 500;
  line-height: 1.15;
}

.bm-kpi-card__delta {
  font-size: 13px;
  color: var(--bm-accent);
  font-weight: 500;
}

.bm-chart-card,
.bm-posts-card,
.bm-hashtag-form-wrap {
  padding: 1.25rem;
}

.bm-chart-card__head,
.bm-posts-card__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.bm-chart-card__head h2,
.bm-posts-card__head h2 {
  font-size: 1.0625rem;
}

.bm-chart-legend {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.bm-chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.bm-legend-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.bm-legend-swatch--bar {
  background: var(--bm-chart-bar);
}

.bm-legend-swatch--line {
  background: var(--bm-chart-line);
}

.bm-svg-wrap {
  width: 100%;
  overflow-x: auto;
}

.bm-chart-svg {
  width: 100%;
  min-width: 520px;
  height: auto;
  display: block;
}

.bm-table-scroll {
  overflow-x: auto;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 540px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-table th {
  color: var(--bm-text-muted);
  font-weight: 700;
}

.bm-handle-sub {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
}

.bm-posts-count {
  font-size: 0.8125rem;
  color: var(--bm-text-muted);
}

.bm-hashtag-form {
  margin-top: 0.875rem;
  display: grid;
  grid-template-columns: 1fr 220px auto;
  gap: 0.875rem;
  align-items: end;
}

@media (max-width: 960px) {
  .bm-evo-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-evo-sidebar {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .bm-sidebar-group {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .bm-side-item {
    width: auto;
  }

  .bm-hashtag-form {
    grid-template-columns: 1fr;
  }
}
</style>
