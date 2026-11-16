<template>
  <AppShell>
    <div class="bm-ads-page">
      <div class="bm-page-head">
        <div>
          <h1>Advertising</h1>
          <p class="bm-page-sub">
            Centralize Meta Ads, Google Ads, and TikTok Ads performance for
            <strong>{{ store.activeBrand?.name }}</strong>.
          </p>
        </div>
        <div v-if="connectedPlatforms.length > 0" class="bm-head-actions">
          <BmButton v-if="activeTab === 'campaigns'" variant="primary" @click="modalOpen = true">
            + New campaign
          </BmButton>
          <BmButton v-else-if="activeTab === 'groups'" variant="primary" @click="groupModalOpen = true">
            + New ad group
          </BmButton>
          <BmButton v-else-if="activeTab === 'keywords'" variant="primary" @click="kwModalOpen = true">
            + Add keyword
          </BmButton>
        </div>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Advertising views" />

      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading advertising data"
        description="Fetching connected ad accounts, campaigns, ad sets, keywords, and recommendations."
      />

      <!-- Empty / Disconnected State -->
      <template v-else-if="connectedPlatforms.length === 0">
        <div class="bm-card bm-ads-intro">
          <h2>Manage your advertising campaigns</h2>
          <p>
            No advertising accounts are connected to {{ store.activeBrand?.name }} yet. Connect one
            of the supported ad networks below to load spend, CPC, conversions, and ROAS.
          </p>
        </div>

        <div class="bm-connect-grid">
          <article class="bm-card bm-connect-card">
            <div class="bm-connect-card__head">
              <h3>Meta Ads</h3>
              <NetworkBadge network="metaAds" />
            </div>
            <p>Manage Facebook and Instagram paid campaigns in one table.</p>
            <BmButton variant="primary" @click="connectAdPlatform('metaAds')">
              Connect Meta Ads
            </BmButton>
          </article>

          <article class="bm-card bm-connect-card">
            <div class="bm-connect-card__head">
              <h3>Google Ads</h3>
              <NetworkBadge network="googleAds" />
            </div>
            <p>Track search, display, keyword bids, and conversion attribution.</p>
            <BmButton variant="primary" @click="connectAdPlatform('googleAds')">
              Connect Google Ads
            </BmButton>
          </article>

          <article class="bm-card bm-connect-card">
            <div class="bm-connect-card__head">
              <h3>TikTok Ads</h3>
              <NetworkBadge network="tiktokAds" />
            </div>
            <p>Monitor short-form paid campaigns and cost per acquisition.</p>
            <BmButton variant="primary" @click="connectAdPlatform('tiktokAds')">
              Connect TikTok Ads
            </BmButton>
          </article>
        </div>
      </template>

      <template v-else>
        <!-- Aggregate KPI Bar -->
        <div class="bm-kpi-grid">
          <article class="bm-card bm-kpi-card">
            <span>Total Spend</span>
            <strong class="tabular-nums">${{ totals.spend.toLocaleString() }}</strong>
          </article>
          <article class="bm-card bm-kpi-card">
            <span>Impressions</span>
            <strong class="tabular-nums">{{ totals.impressions.toLocaleString() }}</strong>
          </article>
          <article class="bm-card bm-kpi-card">
            <span>Average CPC</span>
            <strong class="tabular-nums">${{ avgCpc }}</strong>
          </article>
          <article class="bm-card bm-kpi-card">
            <span>Blended ROAS</span>
            <strong class="tabular-nums">{{ blendedRoas }}x</strong>
          </article>
        </div>

        <!-- Tab 1: Campaigns -->
        <template v-if="activeTab === 'campaigns'">
          <BmStateView
            v-if="campaigns.length === 0"
            kind="empty"
            badge-text="No campaigns"
            title="Ad account connected, zero campaigns logged yet"
            description="Create a campaign entry to monitor daily budget, spend, and ROAS."
            action-label="+ New campaign"
            @action="modalOpen = true"
          />

          <div v-else class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Daily Budget</th>
                  <th>Spend</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>ROAS</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in campaigns" :key="c.id">
                  <td><NetworkBadge :network="c.platform" /></td>
                  <td>
                    <strong>{{ c.name }}</strong>
                    <div class="bm-obj-text">{{ c.objective }}</div>
                  </td>
                  <td>
                    <BmBadge :tone="c.status === 'ACTIVE' ? 'success' : 'warning'">
                      {{ c.status }}
                    </BmBadge>
                  </td>
                  <td class="tabular-nums">${{ c.dailyBudget }}</td>
                  <td class="tabular-nums">${{ c.spend }}</td>
                  <td class="tabular-nums">{{ c.clicks.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ c.conversions }}</td>
                  <td class="tabular-nums">
                    {{ c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0.00' }}x
                  </td>
                  <td>
                    <BmButton variant="secondary" size="sm" @click="toggleCampaign(c)">
                      {{ c.status === 'ACTIVE' ? 'Pause' : 'Resume' }}
                    </BmButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Tab 2: Ad Groups -->
        <template v-else-if="activeTab === 'groups'">
          <BmStateView
            v-if="adGroups.length === 0"
            kind="empty"
            badge-text="No ad groups"
            title="No ad groups created yet"
            description="Add an ad set or ad group to track bidding strategy and CPA."
            action-label="+ New ad group"
            @action="groupModalOpen = true"
          />

          <div v-else class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Ad Group</th>
                  <th>Parent Campaign</th>
                  <th>Bid Strategy</th>
                  <th>Status</th>
                  <th>Budget</th>
                  <th>Spend</th>
                  <th>CPA</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in adGroups" :key="g.id">
                  <td><NetworkBadge :network="g.platform" /></td>
                  <td><strong>{{ g.name }}</strong></td>
                  <td>{{ g.campaignName }}</td>
                  <td>{{ g.bidStrategy }}</td>
                  <td>
                    <BmBadge :tone="g.status === 'ACTIVE' ? 'success' : 'warning'">{{ g.status }}</BmBadge>
                  </td>
                  <td class="tabular-nums">${{ g.dailyBudget }}</td>
                  <td class="tabular-nums">${{ g.spend }}</td>
                  <td class="tabular-nums">${{ g.cpa }}</td>
                  <td>
                    <BmButton variant="secondary" size="sm" @click="toggleAdGroup(g)">
                      {{ g.status === 'ACTIVE' ? 'Pause' : 'Resume' }}
                    </BmButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Tab 3: Advertisements -->
        <template v-else-if="activeTab === 'advertisements'">
          <BmStateView
            v-if="adCreatives.length === 0"
            kind="empty"
            badge-text="No ads"
            title="No individual ad creatives synced yet"
            description="Connect an active campaign with running creatives to inspect CTR and conversions."
          />

          <div v-else class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Creative Headline</th>
                  <th>Ad Group</th>
                  <th>Format</th>
                  <th>Impressions</th>
                  <th>CTR</th>
                  <th>Conversions</th>
                  <th>Status</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ad in adCreatives" :key="ad.id">
                  <td><NetworkBadge :network="ad.platform" /></td>
                  <td><strong>{{ ad.headline }}</strong></td>
                  <td>{{ ad.adGroupName }}</td>
                  <td>{{ ad.format }}</td>
                  <td class="tabular-nums">{{ ad.impressions.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ ad.ctr }}%</td>
                  <td class="tabular-nums">{{ ad.conversions }}</td>
                  <td>
                    <BmBadge :tone="ad.status === 'ACTIVE' ? 'success' : 'warning'">{{ ad.status }}</BmBadge>
                  </td>
                  <td>
                    <BmButton variant="secondary" size="sm" @click="toggleCreative(ad)">
                      {{ ad.status === 'ACTIVE' ? 'Pause' : 'Resume' }}
                    </BmButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Tab 4: Keywords -->
        <template v-else-if="activeTab === 'keywords'">
          <BmStateView
            v-if="keywords.length === 0"
            kind="empty"
            badge-text="No keywords"
            title="No search keywords tracked for this brand"
            description="Add Google Ads search terms to monitor CPC, clicks, and quality score."
            action-label="+ Add keyword"
            @action="kwModalOpen = true"
          />

          <div v-else class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Match Type</th>
                  <th>Avg CPC</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>Quality Score</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="kw in keywords" :key="kw.id">
                  <td><strong>{{ kw.keyword }}</strong></td>
                  <td><BmBadge tone="neutral">{{ kw.matchType }}</BmBadge></td>
                  <td class="tabular-nums">${{ kw.cpc.toFixed(2) }}</td>
                  <td class="tabular-nums">{{ kw.impressions.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ kw.clicks.toLocaleString() }}</td>
                  <td class="tabular-nums">{{ kw.conversions }}</td>
                  <td class="tabular-nums">{{ kw.qualityScore }} / 10</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Tab 5: Recommendations -->
        <template v-else>
          <BmStateView
            v-if="recommendations.length === 0"
            kind="empty"
            badge-text="All optimized"
            title="No pending ad optimization recommendations"
            description="Recommendations appear here when spend or keyword patterns suggest improvements."
          />

          <div v-else class="bm-connect-grid">
            <article v-for="rec in recommendations" :key="rec.id" class="bm-card bm-connect-card">
              <div class="bm-connect-card__head">
                <BmBadge :tone="rec.applied ? 'success' : 'accent'">
                  {{ rec.applied ? 'Applied' : rec.category }}
                </BmBadge>
                <NetworkBadge :network="rec.platform" />
              </div>
              <h3>{{ rec.title }}</h3>
              <p>{{ rec.impact }}</p>
              <BmButton
                :variant="rec.applied ? 'secondary' : 'primary'"
                :disabled="rec.applied"
                size="sm"
                @click="applyRecommendation(rec.id)"
              >
                {{ rec.applied ? 'Recommendation applied' : 'Apply recommendation' }}
              </BmButton>
            </article>
          </div>
        </template>
      </template>

      <!-- Modals -->
      <BmModal :open="modalOpen" title="Create Ad Campaign" @close="modalOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitCampaign">
          <div>
            <label for="cmp-platform" class="bm-label">Platform</label>
            <select id="cmp-platform" v-model="cmpForm.platform" class="bm-select">
              <option value="metaAds">Meta Ads</option>
              <option value="googleAds">Google Ads</option>
              <option value="tiktokAds">TikTok Ads</option>
            </select>
          </div>
          <div>
            <label for="cmp-name" class="bm-label">Campaign name</label>
            <input id="cmp-name" v-model="cmpForm.name" type="text" class="bm-input" placeholder="Holiday Retargeting" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="cmp-obj" class="bm-label">Objective</label>
              <input id="cmp-obj" v-model="cmpForm.objective" type="text" class="bm-input" placeholder="Conversions" required />
            </div>
            <div>
              <label for="cmp-budget" class="bm-label">Daily budget (USD)</label>
              <input id="cmp-budget" v-model.number="cmpForm.dailyBudget" type="number" min="1" class="bm-input" required />
            </div>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="modalOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Create campaign</BmButton>
          </div>
        </form>
      </BmModal>

      <BmModal :open="groupModalOpen" title="Create Ad Group" @close="groupModalOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitAdGroup">
          <div>
            <label for="ag-name" class="bm-label">Ad group name</label>
            <input id="ag-name" v-model="groupForm.name" type="text" class="bm-input" placeholder="Retargeting Site Visitors" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="ag-plat" class="bm-label">Platform</label>
              <select id="ag-plat" v-model="groupForm.platform" class="bm-select">
                <option value="metaAds">Meta Ads</option>
                <option value="googleAds">Google Ads</option>
                <option value="tiktokAds">TikTok Ads</option>
              </select>
            </div>
            <div>
              <label for="ag-budget" class="bm-label">Daily budget (USD)</label>
              <input id="ag-budget" v-model.number="groupForm.dailyBudget" type="number" min="1" class="bm-input" required />
            </div>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="groupModalOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Create ad group</BmButton>
          </div>
        </form>
      </BmModal>

      <BmModal :open="kwModalOpen" title="Add Search Keyword" @close="kwModalOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitKeyword">
          <div>
            <label for="kw-text" class="bm-label">Keyword</label>
            <input id="kw-text" v-model="kwForm.keyword" type="text" class="bm-input" placeholder="content calendar software" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="kw-match" class="bm-label">Match type</label>
              <select id="kw-match" v-model="kwForm.matchType" class="bm-select">
                <option value="EXACT">EXACT</option>
                <option value="PHRASE">PHRASE</option>
                <option value="BROAD">BROAD</option>
              </select>
            </div>
            <div>
              <label for="kw-cpc" class="bm-label">Target CPC (USD)</label>
              <input id="kw-cpc" v-model.number="kwForm.cpc" type="number" step="0.01" min="0.05" class="bm-input" required />
            </div>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="kwModalOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Save keyword</BmButton>
          </div>
        </form>
      </BmModal>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmModal from '@/components/common/designSystem/atoms/BmModal.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import NetworkBadge from '@/components/common/designSystem/atoms/NetworkBadge.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type {
  AdCampaign,
  AdCreative,
  AdGroup,
  AdKeyword,
  AdRecommendation,
  NetworkKey
} from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'groups', label: 'Ad Groups' },
  { id: 'advertisements', label: 'Advertisements' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'recommendations', label: 'Recommendations' }
];

function tabFromPath(path: string): string {
  const seg = path.split('/')[2] || 'campaigns';
  return tabs.some((t) => t.id === seg) ? seg : 'campaigns';
}

const activeTab = ref(tabFromPath(route.path));
const loading = ref(true);
const modalOpen = ref(false);
const groupModalOpen = ref(false);
const kwModalOpen = ref(false);

const connectedPlatforms = ref<string[]>([]);
const campaigns = ref<AdCampaign[]>([]);
const adGroups = ref<AdGroup[]>([]);
const adCreatives = ref<AdCreative[]>([]);
const keywords = ref<AdKeyword[]>([]);
const recommendations = ref<AdRecommendation[]>([]);

const cmpForm = ref({
  platform: 'metaAds' as AdCampaign['platform'],
  name: '',
  objective: 'Traffic & Conversions',
  dailyBudget: 35
});

const groupForm = ref({
  platform: 'metaAds' as AdGroup['platform'],
  name: '',
  dailyBudget: 25
});

const kwForm = ref({
  keyword: '',
  matchType: 'PHRASE' as AdKeyword['matchType'],
  cpc: 0.45
});

const totals = computed(() => {
  return campaigns.value.reduce(
    (acc, c) => {
      acc.spend += c.spend;
      acc.impressions += c.impressions;
      acc.clicks += c.clicks;
      acc.revenue += c.revenue;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, revenue: 0 }
  );
});

const avgCpc = computed(() =>
  totals.value.clicks > 0 ? (totals.value.spend / totals.value.clicks).toFixed(2) : '0.00'
);

const blendedRoas = computed(() =>
  totals.value.spend > 0 ? (totals.value.revenue / totals.value.spend).toFixed(2) : '0.00'
);

async function loadAds(): Promise<void> {
  loading.value = true;
  try {
    const [cmpRes, grpRes, adRes, kwRes, recRes] = await Promise.all([
      apiRequest<{ data: { connectedPlatforms: string[]; campaigns: AdCampaign[] } }>(
        `/api/v2/advertising/campaigns?blogId=${store.activeBlogId}`
      ),
      apiRequest<{ data: AdGroup[] }>(`/api/v2/advertising/adgroups?blogId=${store.activeBlogId}`),
      apiRequest<{ data: AdCreative[] }>(`/api/v2/advertising/ads?blogId=${store.activeBlogId}`),
      apiRequest<{ data: AdKeyword[] }>(`/api/v2/advertising/keywords?blogId=${store.activeBlogId}`),
      apiRequest<{ data: AdRecommendation[] }>(
        `/api/v2/advertising/recommendations?blogId=${store.activeBlogId}`
      )
    ]);
    connectedPlatforms.value = cmpRes.data.connectedPlatforms;
    campaigns.value = cmpRes.data.campaigns;
    adGroups.value = grpRes.data;
    adCreatives.value = adRes.data;
    keywords.value = kwRes.data;
    recommendations.value = recRes.data;
  } finally {
    loading.value = false;
  }
}

async function connectAdPlatform(net: NetworkKey): Promise<void> {
  await store.toggleNetworkConnection(net, undefined, true);
  await loadAds();
}

async function toggleCampaign(cmp: AdCampaign): Promise<void> {
  const nextStatus = cmp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  await apiRequest(`/api/v2/advertising/campaigns/${cmp.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: nextStatus })
  });
  await loadAds();
}

async function toggleAdGroup(g: AdGroup): Promise<void> {
  await apiRequest(`/api/v2/advertising/adgroups/${g.id}`, { method: 'PATCH', body: JSON.stringify({}) });
  await loadAds();
}

async function toggleCreative(ad: AdCreative): Promise<void> {
  await apiRequest(`/api/v2/advertising/ads/${ad.id}`, { method: 'PATCH', body: JSON.stringify({}) });
  await loadAds();
}

async function applyRecommendation(id: string): Promise<void> {
  await apiRequest(`/api/v2/advertising/recommendations/${id}/apply`, { method: 'POST' });
  await loadAds();
}

async function submitCampaign(): Promise<void> {
  await apiRequest('/api/v2/advertising/campaigns', {
    method: 'POST',
    body: JSON.stringify({ blogId: store.activeBlogId, ...cmpForm.value })
  });
  cmpForm.value.name = '';
  modalOpen.value = false;
  await loadAds();
}

async function submitAdGroup(): Promise<void> {
  await apiRequest('/api/v2/advertising/adgroups', {
    method: 'POST',
    body: JSON.stringify({ blogId: store.activeBlogId, ...groupForm.value })
  });
  groupForm.value.name = '';
  groupModalOpen.value = false;
  await loadAds();
}

async function submitKeyword(): Promise<void> {
  await apiRequest('/api/v2/advertising/keywords', {
    method: 'POST',
    body: JSON.stringify({ blogId: store.activeBlogId, ...kwForm.value })
  });
  kwForm.value.keyword = '';
  kwModalOpen.value = false;
  await loadAds();
}

watch(() => route.path, (p) => {
  activeTab.value = tabFromPath(p);
});

watch(activeTab, (t) => {
  const target = `/advertising/${t}`;
  if (route.path !== target) {
    router.replace({ path: target, query: route.query });
  }
});

watch(() => store.activeBlogId, loadAds);
onMounted(loadAds);
</script>

<style scoped>
.bm-ads-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-page-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.bm-page-sub {
  color: var(--bm-text-muted);
}

.bm-head-actions {
  display: flex;
  gap: 0.5rem;
}

.bm-ads-intro {
  padding: 1.25rem;
  background: var(--bm-subtle);
}

.bm-ads-intro h2 {
  font-size: 1.125rem;
  margin-bottom: 0.375rem;
}

.bm-ads-intro p {
  color: var(--bm-text-muted);
}

.bm-connect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.bm-connect-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-connect-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-connect-card p {
  color: var(--bm-text-muted);
  font-size: 0.875rem;
}

.bm-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.875rem;
}

.bm-kpi-card {
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bm-kpi-card span {
  font-size: 0.8125rem;
  color: var(--bm-text-muted);
  font-weight: 600;
}

.bm-kpi-card strong {
  font-size: 1.625rem;
}

.bm-table-scroll {
  overflow-x: auto;
  padding: 0.5rem;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-obj-text {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
}

.bm-form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}
</style>
