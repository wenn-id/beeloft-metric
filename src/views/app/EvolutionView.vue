<template>
  <AppShell class="bm-shell--analytics">
    <div class="bm-evo-layout">
      <header class="bm-page-head">
        <div>
          <div class="bm-page-context">
            <span>{{ brandName }}</span>
            <span v-if="store.activeBrand?.isSample" class="bm-demo-label">Sample data</span>
          </div>
          <h1 ref="pageTitle" tabindex="-1">{{ pageHeading }}</h1>
        </div>

        <div class="bm-page-controls">
          <BmButton
            class="bm-evo-sidebar-toggle"
            variant="secondary"
            :aria-expanded="mobileSectionsOpen"
            aria-controls="analytics-sections"
            @click="mobileSectionsOpen = !mobileSectionsOpen"
          >
            Analytics sections
          </BmButton>
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
            <span role="status" :class="loading && summary?.connected ? 'bm-date-status' : 'sr-only'">
              {{ loading && summary?.connected ? 'Updating metrics…' : '' }}
            </span>
          </div>
        </div>
      </header>

      <aside
        id="analytics-sections"
        class="bm-evo-sidebar bm-card"
        :class="{ 'bm-evo-sidebar--open': mobileSectionsOpen }"
        aria-label="Analytics sections"
      >
        <div class="bm-sidebar-group">
          <p class="bm-sidebar-heading">Overview</p>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'brandSummary' }"
            :aria-current="activeSection === 'brandSummary' ? 'page' : undefined"
            @click="selectSection('brandSummary')"
          >
            Brand Summary
          </button>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'web' }"
            :aria-current="activeSection === 'web' ? 'page' : undefined"
            @click="selectSection('web')"
          >
            <NetworkBadge network="web" /> Website & Blog
          </button>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'real-time' }"
            :aria-current="activeSection === 'real-time' ? 'page' : undefined"
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
            :aria-current="activeSection === net ? 'page' : undefined"
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
            :aria-current="activeSection === 'gmb' ? 'page' : undefined"
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
            :aria-current="activeSection === adNet ? 'page' : undefined"
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
            :aria-current="activeSection === 'competitors' ? 'page' : undefined"
            @click="selectSection('competitors')"
          >
            Competitors
          </button>
          <button
            type="button"
            class="bm-side-item"
            :class="{ 'bm-side-item--active': activeSection === 'hashtag-tracker' }"
            :aria-current="activeSection === 'hashtag-tracker' ? 'page' : undefined"
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
                <table class="bm-table bm-table--realtime">
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
                <table class="bm-table bm-table--realtime">
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
            v-if="loading && !summary?.connected"
            kind="loading"
            title="Loading channel analytics"
            description="Fetching metric series and top posts for the selected period."
          />

          <BmStateView
            v-else-if="errorMsg && !summary?.connected"
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
            <div v-if="errorMsg" class="bm-date-error">
              <p role="alert">Could not update analytics. Showing {{ summary.periodLabel.toLowerCase() }}.</p>
              <BmButton variant="secondary" size="sm" @click="loadSummary">Retry</BmButton>
            </div>
            <dl class="bm-scorecard" aria-label="Key metrics">
              <div v-for="kpi in summary.kpis" :key="kpi.id" class="bm-kpi-card">
                <dt class="bm-kpi-card__label">{{ kpi.label }}</dt>
                <dd class="bm-kpi-card__value tabular-nums">
                  <AnimatedNumber :value="kpi.value" />
                </dd>
                <dd class="bm-kpi-card__delta">{{ kpi.deltaText }}</dd>
              </div>
            </dl>

            <div class="bm-performance-grid" :class="{ 'bm-performance-grid--channels': showChannelOverview }">
              <section class="bm-chart-card" aria-labelledby="impressions-trend">
                <div class="bm-chart-card__head">
                  <div>
                    <h2 id="impressions-trend">Impressions and reach</h2>
                    <p class="bm-chart-period" aria-live="polite">Daily trend · {{ summary.periodLabel }}</p>
                  </div>
                  <div class="bm-chart-legend">
                    <span><i class="bm-legend-swatch bm-legend-swatch--bar"></i> Impressions</span>
                    <span><i class="bm-legend-swatch bm-legend-swatch--line"></i> Reach</span>
                  </div>
                </div>

                <InteractiveMetricChart :series="summary.series" />
              </section>

              <section v-if="showChannelOverview" class="bm-channels-card" aria-labelledby="connected-channels">
                <div class="bm-channels-head">
                  <h2 id="connected-channels">Connected channels</h2>
                  <span class="bm-channel-count tabular-nums">{{ connectedChannels.length }}</span>
                </div>
                <ul class="bm-channel-list">
                  <li v-for="channel in connectedChannels" :key="channel.network">
                    <router-link
                      :to="{ path: `/evolution/${channel.network}`, query: { blogId: store.activeBlogId } }"
                      class="bm-channel-link"
                    >
                      <NetworkBadge :network="channel.network" />
                      <span>{{ channel.label }}</span>
                    </router-link>
                  </li>
                </ul>
                <router-link
                  :to="{ path: '/brands/connections', query: { blogId: store.activeBlogId } }"
                  class="bm-manage-channels"
                >
                  Manage connections
                </router-link>
              </section>
            </div>

            <section class="bm-card bm-posts-card">
              <div class="bm-posts-card__head">
                <h2>Top performing posts</h2>
                <span class="bm-posts-count tabular-nums">
                  {{ summary.topPosts.length }} {{ summary.topPosts.length === 1 ? 'post' : 'posts' }}
                </span>
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

              <div v-else class="bm-table-scroll" role="region" aria-label="Top performing posts table" tabindex="0">
                <table class="bm-table bm-posts-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Channel</th>
                      <th>Published</th>
                      <th>Format</th>
                      <th>Reach</th>
                      <th>Engagement</th>
                      <th>Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="post in summary.topPosts" :key="post.id">
                      <td>{{ post.title }}</td>
                      <td><NetworkBadge :network="post.network" /></td>
                      <td class="tabular-nums">{{ post.publishedAt.slice(0, 10) }}</td>
                      <td>{{ post.format }}</td>
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
import { computed, defineAsyncComponent, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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
const mobileSectionsOpen = ref(false);
const pageTitle = ref<HTMLElement | null>(null);

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
let latestSummaryRequest = 0;
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

const brandName = computed(() => {
  const brand = store.activeBrand;
  if (!brand) return 'Loading…';
  return brand.isSample ? brand.name.replace(/\s*\[SAMPLE DATA\]$/, '') : brand.name;
});
const connectedChannels = computed(() => store.connections.filter((channel) => channel.connected));
const showChannelOverview = computed(
  () => activeSection.value === 'brandSummary' && connectedChannels.value.length > 0
);

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
  const restoreFocus = mobileSectionsOpen.value;
  mobileSectionsOpen.value = false;
  let path = `/evolution/${sec}`;
  if (sec === 'real-time') path = '/evolution/web/real-time';
  if (sec === 'competitors') path = '/evolution/competitors';
  if (sec === 'hashtag-tracker') path = '/evolution/hashtag-tracker';
  await router.push({
    path,
    query: { blogId: String(store.activeBlogId) }
  });
  if (restoreFocus) {
    await nextTick();
    pageTitle.value?.focus();
  }
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

  const request = ++latestSummaryRequest;
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await apiRequest<{ data: EvolutionSummaryResponse }>(
      `/api/v2/evolution/summary?blogId=${store.activeBlogId}&network=${activeSection.value}&days=${days.value}`
    );
    if (request === latestSummaryRequest) summary.value = res.data;
  } catch (err) {
    if (request === latestSummaryRequest) {
      errorMsg.value = err instanceof Error ? err.message : 'Unable to load summary.';
    }
  } finally {
    if (request === latestSummaryRequest) loading.value = false;
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

watch([() => store.activeBlogId, activeSection], () => {
  latestSummaryRequest += 1;
  summary.value = null;
  return loadSummary();
}, { immediate: true });
onMounted(() => {
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
  grid-template:
    'sidebar header' max-content
    'sidebar content' 1fr / 216px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.bm-page-controls > .bm-evo-sidebar-toggle {
  display: none;
}

.bm-evo-sidebar {
  grid-area: sidebar;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-cards);
  box-shadow: none;
}

.bm-sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.bm-sidebar-group + .bm-sidebar-group {
  padding-top: 10px;
  border-top: 1px solid var(--bm-divider);
}

.bm-sidebar-heading {
  padding: 3px 8px 5px;
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.055em;
}

.bm-side-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--bm-text-muted);
  text-align: left;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}

.bm-side-item:hover {
  background: var(--bm-subtle);
  color: var(--bm-text);
}

.bm-side-item--active,
.bm-side-item--active:hover {
  background: var(--bm-surface);
  color: var(--bm-text);
  font-weight: 500;
}

.bm-side-item:active {
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
}

.bm-conn-tag {
  margin-left: auto;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  font-size: 10px;
  font-weight: 600;
}

.bm-evo-content {
  grid-area: content;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bm-page-head {
  grid-area: header;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
}

.bm-page-head h1 {
  margin-top: 9px;
  font-family: var(--font-signifier);
  font-size: clamp(2.75rem, 5.6vw, 5rem);
  line-height: 1;
  font-weight: 300;
  letter-spacing: -0.045em;
  overflow-wrap: anywhere;
}

.bm-page-context,
.bm-page-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.bm-page-context {
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 11px;
  letter-spacing: 0.045em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.bm-demo-label {
  padding: 2px 7px;
  border: 1px solid var(--bm-divider);
  border-radius: 999px;
  background: var(--bm-subtle);
  font-size: 10px;
}

.bm-date-controls {
  position: relative;
  min-width: 134px;
}

.bm-date-controls .bm-select {
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.bm-date-status {
  position: absolute;
  inset-block-start: calc(100% + 2px);
  inset-inline-start: 0;
  color: var(--bm-text-muted);
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.bm-date-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 10px 14px;
  border: 1px solid var(--bm-danger-border);
  border-radius: var(--radius-inputs);
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
}

.bm-kpi-grid,
.bm-rt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 16px;
}

.bm-rt-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}

.bm-rt-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}

.bm-kpi-grid .bm-kpi-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
}

.bm-kpi-grid .bm-kpi-card__label {
  color: var(--bm-text-muted);
  font-size: 13px;
  font-weight: 500;
}

.bm-kpi-grid .bm-kpi-card__value {
  font-size: 26px;
  font-weight: 500;
  line-height: 1.15;
}

.bm-kpi-grid .bm-kpi-card__delta {
  color: var(--bm-accent);
  font-size: 13px;
  font-weight: 500;
}

.bm-performance-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

@media (min-width: 1180px) {
  .bm-performance-grid--channels {
    grid-template-columns: minmax(0, 1fr) 230px;
  }
}

.bm-chart-card {
  --bm-elevated: #191a1b;
  --bm-surface: #252627;
  --bm-text: #f5f5f7;
  --bm-text-muted: #b5b5b7;
  --bm-divider: #3f4041;
  --bm-border-soft: var(--bm-divider);
  --bm-accent: #d1c9ff;
  --bm-accent-soft: #2e2e2e;
  --bm-accent-soft-text: #f5f5f7;
  --bm-chart-bar: #d1c9ff;
  --bm-chart-bar-muted: #696a77;
  --bm-chart-line: #00b3dd;

  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(16px, 2.2vw, 32px);
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-cards);
  background: var(--bm-elevated);
  color: var(--bm-text);
  color-scheme: dark;
}

.bm-chart-card :deep(.bm-ic-wrap) {
  flex: 1;
  justify-content: space-between;
}

.bm-chart-period {
  margin-top: 4px;
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 11px;
}

.bm-channels-card,
.bm-posts-card,
.bm-hashtag-form-wrap {
  min-width: 0;
  padding: clamp(16px, 1.7vw, 24px);
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-cards);
  background: var(--bm-elevated);
  box-shadow: none;
}

.bm-channels-card {
  padding: 16px;
}

.bm-channels-head,
.bm-chart-card__head,
.bm-posts-card__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.bm-channels-head h2,
.bm-chart-card__head h2,
.bm-posts-card h2,
.bm-hashtag-form-wrap h2 {
  font-family: var(--font-signifier);
  font-size: 22px;
  font-weight: 300;
  letter-spacing: -0.025em;
}

.bm-chart-card__head h2 {
  font-size: clamp(1.75rem, 2.65vw, 2.375rem);
}

.bm-channels-head {
  flex-wrap: nowrap;
  gap: 8px;
}

.bm-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--bm-text-muted);
  font-size: 12px;
}

.bm-chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.bm-legend-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.bm-legend-swatch--bar {
  background: var(--bm-chart-bar-muted);
}

.bm-legend-swatch--line {
  width: 14px;
  height: 3px;
  background: var(--bm-chart-line);
}

.bm-channel-count {
  flex: none;
  min-width: 26px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--bm-surface);
  color: var(--bm-text);
  text-align: center;
  font-size: 12px;
  font-family: var(--font-data);
}

.bm-channel-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 165px), 1fr));
  gap: 0 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 1180px) {
  .bm-channel-list {
    max-height: 308px;
    overflow-y: auto;
  }
}

.bm-channel-link,
.bm-manage-channels {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 13px;
  font-weight: 550;
  text-decoration: none;
}

.bm-channel-link {
  border-bottom: 1px solid var(--bm-divider);
}

.bm-channel-link:hover,
.bm-manage-channels:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.bm-manage-channels {
  margin-top: 4px;
  color: var(--bm-text);
  text-decoration: underline;
  text-decoration-color: var(--bm-control-border);
  text-underline-offset: 3px;
}

.bm-table-scroll {
  overflow-x: auto;
}

.bm-table {
  width: 100%;
  min-width: 540px;
  border-collapse: collapse;
}

.bm-table--realtime {
  min-width: 0;
  overflow-wrap: anywhere;
}

.bm-table th,
.bm-table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 13px;
}

.bm-table th {
  background: var(--bm-subtle);
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.bm-posts-table {
  min-width: 690px;
}

.bm-posts-table :is(th, td):first-child {
  width: 34%;
}

.bm-posts-table :is(th, td):nth-last-child(-n + 3) {
  text-align: right;
}

.bm-posts-table td:nth-child(3) {
  white-space: nowrap;
}

.bm-handle-sub,
.bm-posts-count {
  color: var(--bm-text-muted);
  font-size: 12px;
}

.bm-hashtag-form {
  display: grid;
  grid-template-columns: 1fr 220px auto;
  align-items: end;
  gap: 14px;
  margin-top: 14px;
}

@media (max-width: 960px) {
  .bm-evo-layout {
    grid-template:
      'header' max-content
      'content' 1fr / minmax(0, 1fr);
    gap: 16px;
  }

  .bm-evo-layout:has(.bm-evo-sidebar--open) {
    grid-template:
      'header' max-content
      'sidebar' max-content
      'content' 1fr / minmax(0, 1fr);
  }

  .bm-page-controls > .bm-evo-sidebar-toggle {
    display: inline-flex;
    padding-inline: 11px;
    border-radius: 8px;
    font-size: 13px;
    box-shadow: none;
  }

  .bm-evo-sidebar:not(.bm-evo-sidebar--open) {
    display: none;
  }

  .bm-evo-sidebar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 195px), 1fr));
  }

  .bm-sidebar-group + .bm-sidebar-group {
    padding-top: 0;
    border-top: 0;
  }

  .bm-hashtag-form {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .bm-side-item {
    transition: background-color 160ms var(--ease-out-quart), color 160ms var(--ease-out-quart),
      transform 160ms var(--ease-out-quart);
  }

  .bm-side-item:active {
    transform: translateY(1px);
  }

  @media (max-width: 960px) {
    .bm-evo-sidebar--open {
      animation: bm-analytics-menu-in 200ms var(--ease-out-quart);
    }
  }
}

@keyframes bm-analytics-menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}

@media (max-width: 600px) {
  .bm-page-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
