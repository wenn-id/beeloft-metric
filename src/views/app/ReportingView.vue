<template>
  <AppShell>
    <div class="bm-rep-page">
      <div class="bm-page-head">
        <div>
          <h1>Reports, Studio & Campaigns</h1>
          <p class="bm-page-sub">
            Export PDF/PPTX reports, assemble Reporting Studio decks, and track multi-channel tags for
            <strong>{{ store.activeBrand?.name }}</strong>.
          </p>
        </div>
        <div class="bm-head-actions">
          <BmButton v-if="activeTab === 'studio'" variant="primary" @click="createStudioReport">
            + New studio deck
          </BmButton>
          <BmButton v-else-if="activeTab === 'campaigns-dashboard'" variant="primary" @click="campModalOpen = true">
            + Track campaign tag
          </BmButton>
          <BmButton v-else variant="primary" @click="generateOpen = true">+ Generate report</BmButton>
        </div>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Reporting suite sections" />

      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading reporting suite"
        description="Fetching templates, export archives, Studio decks, and campaign tags."
      />

      <!-- Tab 1: Templates -->
      <template v-else-if="activeTab === 'templates'">
        <section class="bm-rep-section">
          <h2>System Templates</h2>
          <div class="bm-rep-grid">
            <article v-for="tpl in systemTemplates" :key="tpl.id" class="bm-card bm-tpl-card">
              <div class="bm-tpl-card__head">
                <h3>{{ tpl.name }}</h3>
                <BmBadge tone="neutral">System</BmBadge>
              </div>
              <p class="bm-tpl-card__desc">{{ tpl.description }}</p>
              <p class="bm-tpl-card__secs">Includes: {{ tpl.sections.join(', ') }}</p>
              <BmButton variant="secondary" size="sm" @click="prefillGenerate(tpl)">
                Use template
              </BmButton>
            </article>
          </div>
        </section>

        <section class="bm-rep-section">
          <div class="bm-rep-section__head">
            <h2>Custom Templates</h2>
            <BmButton variant="secondary" size="sm" @click="customModalOpen = true">
              + Save custom template
            </BmButton>
          </div>
          <div class="bm-rep-grid">
            <article v-for="tpl in customTemplates" :key="tpl.id" class="bm-card bm-tpl-card">
              <div class="bm-tpl-card__head">
                <h3>{{ tpl.name }}</h3>
                <BmBadge tone="accent">Custom</BmBadge>
              </div>
              <p class="bm-tpl-card__desc">{{ tpl.description }}</p>
              <p class="bm-tpl-card__secs">Includes: {{ tpl.sections.join(', ') }}</p>
              <BmButton variant="secondary" size="sm" @click="prefillGenerate(tpl)">
                Use template
              </BmButton>
            </article>
          </div>
        </section>
      </template>

      <!-- Tab 2: History -->
      <template v-else-if="activeTab === 'history'">
        <BmStateView
          v-if="history.length === 0"
          kind="empty"
          badge-text="No exports yet"
          title="No reports generated for this brand"
          description="Click Generate report to compile KPIs and published posts for your selected date window."
          action-label="Generate first report"
          @action="generateOpen = true"
        />

        <div v-else class="bm-card bm-table-scroll">
          <table class="bm-table">
            <thead>
              <tr>
                <th>Report Title</th>
                <th>Format</th>
                <th>Date Range</th>
                <th>Impressions</th>
                <th>Reach</th>
                <th>Status</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rep in history" :key="rep.id">
                <td><strong>{{ rep.title }}</strong></td>
                <td><BmBadge tone="neutral">{{ rep.format }}</BmBadge></td>
                <td class="tabular-nums">{{ rep.dateFrom }} to {{ rep.dateTo }}</td>
                <td class="tabular-nums">{{ rep.summaryMetrics.impressions.toLocaleString() }}</td>
                <td class="tabular-nums">{{ rep.summaryMetrics.reach.toLocaleString() }}</td>
                <td><BmBadge tone="success">{{ rep.status }}</BmBadge></td>
                <td>
                  <a :href="`/api/v2/reports/${rep.id}/download`" class="bm-dl-link">
                    Download export
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Tab 3: Reporting Studio (metrifacts) -->
      <template v-else-if="activeTab === 'studio'">
        <BmStateView
          v-if="studioReports.length === 0"
          kind="empty"
          badge-text="Studio empty"
          title="No Studio decks created yet"
          description="Build modular visual decks with KPI, chart, and analyst summary blocks."
          action-label="+ New studio deck"
          @action="createStudioReport"
        />

        <div v-else class="bm-studio-layout">
          <aside class="bm-card bm-studio-list">
            <h2>Saved Studio Decks</h2>
            <button
              v-for="sr in studioReports"
              :key="sr.id"
              type="button"
              class="bm-studio-item"
              :class="{ 'bm-studio-item--active': activeStudio?.id === sr.id }"
              @click="selectedStudioId = sr.id"
            >
              <strong>{{ sr.title }}</strong>
              <span>{{ sr.blocks.length }} blocks</span>
            </button>
          </aside>

          <section v-if="activeStudio" class="bm-card bm-studio-editor">
            <div class="bm-studio-head">
              <div>
                <label for="st-title" class="bm-label">Deck title</label>
                <input id="st-title" v-model="activeStudio.title" type="text" class="bm-input" />
              </div>
              <div class="bm-studio-actions">
                <router-link :to="`/reporting/studio/public/${activeStudio.id}`" class="bm-open-public">
                  Open public preview
                </router-link>
                <BmButton variant="primary" size="sm" @click="saveStudioBlocks">Save deck</BmButton>
              </div>
            </div>

            <div class="bm-block-toolbar">
              <span>Add block:</span>
              <BmButton variant="secondary" size="sm" @click="addBlock('KPI_GRID')">+ KPI Grid</BmButton>
              <BmButton variant="secondary" size="sm" @click="addBlock('LINE_CHART')">+ Reach Chart</BmButton>
              <BmButton variant="secondary" size="sm" @click="addBlock('TOP_POSTS')">+ Top Posts</BmButton>
              <BmButton variant="secondary" size="sm" @click="addBlock('TEXT_BLOCK')">+ Narrative</BmButton>
            </div>

            <p v-if="studioSaved" class="bm-saved-banner" role="status">{{ studioSaved }}</p>

            <div class="bm-blocks-stack">
              <article v-for="(blk, idx) in activeStudio.blocks" :key="blk.id" class="bm-card bm-block-card">
                <div class="bm-block-card__top">
                  <BmBadge tone="accent">{{ blk.type }}</BmBadge>
                  <button type="button" class="bm-slot-del" @click="activeStudio.blocks.splice(idx, 1)">
                    Remove block
                  </button>
                </div>
                <div>
                  <label :for="`bt-${blk.id}`" class="bm-label">Section heading</label>
                  <input :id="`bt-${blk.id}`" v-model="blk.title" type="text" class="bm-input" />
                </div>
                <div v-if="blk.type === 'TEXT_BLOCK'">
                  <label :for="`bc-${blk.id}`" class="bm-label">Analyst commentary</label>
                  <textarea :id="`bc-${blk.id}`" v-model="blk.content" class="bm-textarea"></textarea>
                </div>
              </article>
            </div>
          </section>
        </div>
      </template>

      <!-- Tab 4: Campaigns Performance Dashboard -->
      <template v-else-if="activeTab === 'campaigns-dashboard'">
        <BmStateView
          v-if="campaignsDashboard.length === 0"
          kind="empty"
          badge-text="No tracked tags"
          title="No campaign tag trackers configured"
          description="Group posts and links under a campaign tag to monitor cumulative reach and clicks."
          action-label="+ Track campaign tag"
          @action="campModalOpen = true"
        />

        <div v-else class="bm-card bm-table-scroll">
          <table class="bm-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Tag</th>
                <th>Window</th>
                <th>Posts</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>State</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cd in campaignsDashboard" :key="cd.id">
                <td><strong>{{ cd.name }}</strong></td>
                <td><BmBadge tone="neutral">#{{ cd.tag }}</BmBadge></td>
                <td class="tabular-nums">{{ cd.startDate }} to {{ cd.endDate }}</td>
                <td class="tabular-nums">{{ cd.postsCount }}</td>
                <td class="tabular-nums">{{ cd.impressions.toLocaleString() }}</td>
                <td class="tabular-nums">{{ cd.clicks.toLocaleString() }}</td>
                <td>
                  <BmBadge :tone="cd.archived ? 'neutral' : 'success'">
                    {{ cd.archived ? 'Archived' : 'Tracking' }}
                  </BmBadge>
                </td>
                <td>
                  <BmButton variant="secondary" size="sm" @click="toggleArchiveCamp(cd.id)">
                    {{ cd.archived ? 'Unarchive' : 'Archive' }}
                  </BmButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Tab 5: Looker Studio Connector -->
      <template v-else>
        <div class="bm-card bm-looker-card">
          <h2>Looker Studio Connector</h2>
          <p class="bm-tpl-card__desc">
            Authorize Looker Studio to query BeeloftMetric REST endpoints using your workspace token.
          </p>
          <div class="bm-looker-box">
            <strong>Connector Endpoint:</strong>
            <code>http://127.0.0.1:4000/api/v2/evolution/summary?blogId={{ store.activeBlogId }}</code>
          </div>
          <div>
            <router-link :to="`/user-settings/api?blogId=${store.activeBlogId}`" class="bm-open-public">
              Manage REST API Token
            </router-link>
          </div>
        </div>
      </template>

      <!-- Modals -->
      <BmModal :open="generateOpen" title="Generate New Report" @close="generateOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitGenerate">
          <div>
            <label for="rep-title" class="bm-label">Report title</label>
            <input id="rep-title" v-model="form.title" type="text" class="bm-input" placeholder="Monthly summary" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="rep-tpl" class="bm-label">Template</label>
              <select id="rep-tpl" v-model="form.templateId" class="bm-select">
                <option v-for="t in [...systemTemplates, ...customTemplates]" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>
            </div>
            <div>
              <label for="rep-fmt" class="bm-label">Format</label>
              <select id="rep-fmt" v-model="form.format" class="bm-select">
                <option value="PDF">PDF</option>
                <option value="PPTX">PPTX</option>
              </select>
            </div>
          </div>
          <div class="bm-two-col">
            <div>
              <label for="rep-from" class="bm-label">Date from</label>
              <input id="rep-from" v-model="form.dateFrom" type="date" class="bm-input" required />
            </div>
            <div>
              <label for="rep-to" class="bm-label">Date to</label>
              <input id="rep-to" v-model="form.dateTo" type="date" class="bm-input" required />
            </div>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="generateOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary" :loading="saving">Generate</BmButton>
          </div>
        </form>
      </BmModal>

      <BmModal :open="customModalOpen" title="Save Custom Report Template" @close="customModalOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitCustomTemplate">
          <div>
            <label for="ctpl-name" class="bm-label">Template name</label>
            <input id="ctpl-name" v-model="customForm.name" type="text" class="bm-input" placeholder="Weekly Stakeholder Deck" required />
          </div>
          <div>
            <label for="ctpl-desc" class="bm-label">Description</label>
            <textarea id="ctpl-desc" v-model="customForm.description" class="bm-textarea" placeholder="Summary of sections included..."></textarea>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="customModalOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Save template</BmButton>
          </div>
        </form>
      </BmModal>

      <BmModal :open="campModalOpen" title="Track Multi-Channel Campaign Tag" @close="campModalOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitCampaignTracker">
          <div>
            <label for="cd-name" class="bm-label">Campaign name</label>
            <input id="cd-name" v-model="campForm.name" type="text" class="bm-input" placeholder="Black Friday Promo" required />
          </div>
          <div>
            <label for="cd-tag" class="bm-label">Tracking tag</label>
            <input id="cd-tag" v-model="campForm.tag" type="text" class="bm-input" placeholder="BF2026" required />
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="campModalOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Create tracker</BmButton>
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
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type {
  CampaignDashboardItem,
  ReportArchiveItem,
  ReportTemplate,
  StudioBlock,
  StudioReport
} from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'templates', label: 'Report Templates' },
  { id: 'history', label: 'Export History' },
  { id: 'studio', label: 'Reporting Studio' },
  { id: 'campaigns-dashboard', label: 'Campaigns Dashboard' },
  { id: 'looker-studio', label: 'Looker Studio' }
];

function tabFromPath(path: string): string {
  if (path.includes('/studio')) return 'studio';
  if (path.includes('/campaigns-dashboard')) return 'campaigns-dashboard';
  if (path.includes('/looker-studio')) return 'looker-studio';
  if (path.includes('/history')) return 'history';
  return 'templates';
}

const activeTab = ref(tabFromPath(route.path));
const loading = ref(true);
const saving = ref(false);
const studioSaved = ref('');

const systemTemplates = ref<ReportTemplate[]>([]);
const customTemplates = ref<ReportTemplate[]>([]);
const history = ref<ReportArchiveItem[]>([]);
const studioReports = ref<StudioReport[]>([]);
const campaignsDashboard = ref<CampaignDashboardItem[]>([]);
const selectedStudioId = ref('');

const generateOpen = ref(false);
const customModalOpen = ref(false);
const campModalOpen = ref(false);

const activeStudio = computed(
  () => studioReports.value.find((s) => s.id === selectedStudioId.value) ?? studioReports.value[0] ?? null
);

const form = ref({
  title: 'November 2026 Performance Summary',
  templateId: 'tpl-monthly',
  format: 'PDF' as 'PDF' | 'PPTX',
  dateFrom: '2026-10-18',
  dateTo: '2026-11-16'
});

const customForm = ref({ name: '', description: '' });
const campForm = ref({ name: '', tag: '' });

async function loadReports(): Promise<void> {
  loading.value = true;
  try {
    const [sysRes, cusRes, histRes, stuRes, cdRes] = await Promise.all([
      apiRequest<{ data: ReportTemplate[] }>('/api/v2/reports/templates/system'),
      apiRequest<{ data: ReportTemplate[] }>('/api/v2/reports/templates/custom'),
      apiRequest<{ data: ReportArchiveItem[] }>(`/api/v2/reports/history?blogId=${store.activeBlogId}`),
      apiRequest<{ data: StudioReport[] }>(
        `/api/v2/reporting/studio/reports?blogId=${store.activeBlogId}`
      ),
      apiRequest<{ data: CampaignDashboardItem[] }>(
        `/api/v2/reporting/campaigns-dashboard?blogId=${store.activeBlogId}`
      )
    ]);
    systemTemplates.value = sysRes.data;
    customTemplates.value = cusRes.data;
    history.value = histRes.data;
    studioReports.value = stuRes.data;
    campaignsDashboard.value = cdRes.data;
    if (!studioReports.value.some((s) => s.id === selectedStudioId.value)) {
      selectedStudioId.value = studioReports.value[0]?.id || '';
    }
  } finally {
    loading.value = false;
  }
}

function prefillGenerate(tpl: ReportTemplate): void {
  form.value.templateId = tpl.id;
  form.value.title = `${tpl.name} (${store.activeBrand?.name || 'Brand'})`;
  generateOpen.value = true;
}

async function submitGenerate(): Promise<void> {
  saving.value = true;
  try {
    await apiRequest('/api/v2/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ blogId: store.activeBlogId, ...form.value })
    });
    generateOpen.value = false;
    activeTab.value = 'history';
    await loadReports();
  } finally {
    saving.value = false;
  }
}

async function submitCustomTemplate(): Promise<void> {
  await apiRequest('/api/v2/reports/templates/custom', {
    method: 'POST',
    body: JSON.stringify(customForm.value)
  });
  customModalOpen.value = false;
  customForm.value = { name: '', description: '' };
  await loadReports();
}

async function createStudioReport(): Promise<void> {
  const res = await apiRequest<{ data: StudioReport }>('/api/v2/reporting/studio/reports', {
    method: 'POST',
    body: JSON.stringify({
      blogId: store.activeBlogId,
      title: `${store.activeBrand?.name || 'Brand'} Studio Deck`
    })
  });
  await loadReports();
  selectedStudioId.value = res.data.id;
}

function addBlock(type: StudioBlock['type']): void {
  if (!activeStudio.value) return;
  activeStudio.value.blocks.push({
    id: `blk-${Date.now()}`,
    type,
    title: type === 'KPI_GRID' ? 'Channel KPI Summary' : type === 'LINE_CHART' ? 'Growth Curve' : type === 'TOP_POSTS' ? 'Top Content' : 'Analyst Note',
    content: type === 'TEXT_BLOCK' ? 'Summary note for stakeholders.' : undefined
  });
}

async function saveStudioBlocks(): Promise<void> {
  if (!activeStudio.value) return;
  await apiRequest(`/api/v2/reporting/studio/versions/${activeStudio.value.id}/blocks`, {
    method: 'PUT',
    body: JSON.stringify({ title: activeStudio.value.title, blocks: activeStudio.value.blocks })
  });
  studioSaved.value = 'Studio deck blocks saved.';
}

async function submitCampaignTracker(): Promise<void> {
  await apiRequest('/api/v2/reporting/campaigns-dashboard', {
    method: 'POST',
    body: JSON.stringify({ blogId: store.activeBlogId, ...campForm.value })
  });
  campForm.value = { name: '', tag: '' };
  campModalOpen.value = false;
  await loadReports();
}

async function toggleArchiveCamp(id: string): Promise<void> {
  await apiRequest(`/api/v2/reporting/campaigns-dashboard/${id}/archive`, { method: 'PATCH' });
  await loadReports();
}

watch(() => route.path, (p) => {
  activeTab.value = tabFromPath(p);
});

watch(activeTab, (t) => {
  const map: Record<string, string> = {
    templates: '/reporting/reports',
    history: '/reporting',
    studio: '/reporting/studio',
    'campaigns-dashboard': '/reporting/campaigns-dashboard',
    'looker-studio': '/reporting/looker-studio'
  };
  const target = map[t] || '/reporting';
  if (route.path !== target && !(t === 'templates' && route.path === '/reporting')) {
    router.replace({ path: target, query: route.query });
  }
});

watch(() => store.activeBlogId, loadReports);
onMounted(loadReports);
</script>

<style scoped>
.bm-rep-page {
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

.bm-rep-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-rep-section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.bm-rep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.bm-tpl-card,
.bm-looker-card {
  padding: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-tpl-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.bm-tpl-card__head h3 {
  font-size: 1rem;
}

.bm-tpl-card__desc {
  color: var(--bm-text-muted);
  font-size: 0.875rem;
}

.bm-tpl-card__secs {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: auto;
}

.bm-studio-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 1rem;
}

.bm-studio-list,
.bm-studio-editor {
  padding: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bm-studio-list h2 {
  font-size: 0.9375rem;
}

.bm-studio-item {
  width: 100%;
  min-height: 48px;
  padding: 0.625rem 0.75rem;
  border-radius: var(--bm-radius-md);
  border: 1px solid var(--bm-divider);
  background: var(--bm-surface);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 0.125rem;
}

.bm-studio-item span {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
}

.bm-studio-item--active {
  border-color: var(--bm-accent);
  background: var(--bm-subtle);
}

.bm-studio-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
}

.bm-studio-actions,
.bm-block-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.bm-open-public {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.875rem;
}

.bm-saved-banner {
  padding: 0.625rem 0.875rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-weight: 600;
}

.bm-blocks-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-block-card {
  padding: 1rem;
  background: var(--bm-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-block-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-slot-del {
  border: none;
  background: transparent;
  color: var(--bm-danger-text);
  font-weight: 700;
}

.bm-looker-box {
  padding: 0.75rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bm-looker-box code {
  overflow-wrap: anywhere;
}

.bm-table-scroll {
  overflow-x: auto;
  padding: 0.5rem;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-dl-link {
  color: var(--bm-accent);
  font-weight: 700;
  text-decoration: none;
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

@media (max-width: 820px) {
  .bm-studio-layout,
  .bm-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
