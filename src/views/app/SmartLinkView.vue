<template>
  <AppShell class="bm-shell--editorial">
    <div class="bm-workspace-page">
      <header class="bm-workspace-head">
        <div>
          <p v-if="store.activeBrand" class="bm-workspace-context">{{ store.activeBrand.name }}</p>
          <h1>SmartLinks Bio Microsite</h1>
          <p class="bm-page-sub">Design your public link-in-bio page and track views and clicks.</p>
        </div>
        <div v-if="activeLink" class="bm-head-actions">
          <router-link :to="`/bio/${publishedSlug}`" class="bm-public-button">
            Open public page
          </router-link>
          <BmButton variant="primary" :loading="saving" @click="saveChanges">Save changes</BmButton>
        </div>
      </header>

      <p v-if="errorBanner" class="bm-error-banner" role="alert">{{ errorBanner }}</p>

      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading SmartLink configuration"
        description="Fetching bio buttons, colors, and click totals."
      />

      <BmStateView
        v-else-if="!activeLink"
        kind="empty"
        badge-text="No SmartLink"
        title="This brand has no SmartLink page yet"
        description="Create a SmartLink page to group outbound URLs under a trackable /bio/ URL."
        action-label="+ Create SmartLink"
        @action="createFirstSmartLink"
      />

      <template v-else>
        <div class="bm-sl-toolbar">
          <BmTabs v-model="activeTab" :tabs="tabs" label="SmartLink tabs" />
          <a v-if="activeTab === 'links'" href="#smartlink-preview" class="bm-public-button bm-sl-preview-jump">
            Jump to preview
          </a>
        </div>

        <p v-if="savedBanner" class="bm-saved-banner" role="status">{{ savedBanner }}</p>

        <div v-if="activeTab === 'links'" class="bm-sl-split">
          <div class="bm-sl-fields">
            <section class="bm-card bm-sl-editor" aria-labelledby="smartlink-profile">
              <h2 id="smartlink-profile">Profile & Theme</h2>
              <div>
                <label for="sl-title" class="bm-label">Display title</label>
                <input id="sl-title" v-model="activeLink.title" type="text" class="bm-input" />
              </div>
              <div>
                <label for="sl-slug" class="bm-label">Public URL slug</label>
                <input id="sl-slug" v-model="activeLink.slug" type="text" class="bm-input" />
              </div>
              <div>
                <label for="sl-desc" class="bm-label">Bio summary</label>
                <textarea id="sl-desc" v-model="activeLink.description" class="bm-textarea"></textarea>
              </div>

              <div class="bm-color-row">
                <div>
                  <label for="sl-bg" class="bm-label">Page background</label>
                  <input id="sl-bg" v-model="activeLink.theme.backgroundColor" type="color" class="bm-color-input" />
                </div>
                <div>
                  <label for="sl-btn-bg" class="bm-label">Button color</label>
                  <input id="sl-btn-bg" v-model="activeLink.theme.buttonColor" type="color" class="bm-color-input" />
                </div>
                <div>
                  <label for="sl-btn-fg" class="bm-label">Button text color</label>
                  <input id="sl-btn-fg" v-model="activeLink.theme.buttonTextColor" type="color" class="bm-color-input" />
                </div>
              </div>
            </section>

            <section class="bm-card bm-sl-editor" aria-labelledby="smartlink-buttons">
              <header class="bm-links-header">
                <h2 id="smartlink-buttons">Buttons</h2>
                <BmButton variant="secondary" size="sm" @click="addButton">+ Add button</BmButton>
              </header>

              <div class="bm-btn-editor-list">
                <article v-for="(btn, idx) in activeLink.buttons" :key="btn.id" class="bm-btn-edit-card">
                  <div class="bm-two-col">
                    <div>
                      <label :for="`bl-${idx}`" class="bm-label">Label</label>
                      <input :id="`bl-${idx}`" v-model="btn.label" type="text" class="bm-input" />
                    </div>
                    <div>
                      <label :for="`bu-${idx}`" class="bm-label">Destination URL</label>
                      <input :id="`bu-${idx}`" v-model="btn.url" type="url" class="bm-input" />
                    </div>
                  </div>
                  <div class="bm-btn-edit-foot">
                    <label :for="`ba-${idx}`" class="bm-check-inline">
                      <input :id="`ba-${idx}`" v-model="btn.active" type="checkbox" />
                      <span>Visible on public page</span>
                    </label>
                    <button
                      type="button"
                      class="bm-slot-del"
                      :aria-label="`Remove ${btn.label || 'button'}`"
                      @click="removeButton(idx)"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <aside id="smartlink-preview" class="bm-card bm-sl-preview-wrap" aria-labelledby="smartlink-preview-title">
            <header class="bm-sl-preview-head">
              <h2 id="smartlink-preview-title">Page preview</h2>
              <p class="bm-preview-path">/bio/{{ activeLink.slug }}</p>
            </header>
            <DeviceStage3D
              label="Mobile preview"
              :screen-bg="activeLink.theme.backgroundColor"
              flat-by-default
            >
              <SmartLinkBio :link="activeLink" preview />
            </DeviceStage3D>
          </aside>
        </div>

        <section v-else class="bm-sl-analytics" aria-labelledby="smartlink-performance">
          <h2 id="smartlink-performance">SmartLink performance</h2>
          <dl class="bm-scorecard" aria-label="SmartLink traffic">
            <div class="bm-kpi-card">
              <dt class="bm-kpi-card__label">Profile Views</dt>
              <dd class="bm-kpi-card__value tabular-nums"><AnimatedNumber :value="activeLink.views" /></dd>
            </div>
            <div class="bm-kpi-card">
              <dt class="bm-kpi-card__label">Total Button Clicks</dt>
              <dd class="bm-kpi-card__value tabular-nums">
                <AnimatedNumber :value="activeLink.buttons.reduce((s, b) => s + b.clicks, 0)" />
              </dd>
            </div>
          </dl>

          <div class="bm-card bm-table-scroll" role="region" aria-label="SmartLink button performance" tabindex="0">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Button Label</th>
                  <th>Target URL</th>
                  <th>Visibility</th>
                  <th>Recorded Clicks</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="btn in activeLink.buttons" :key="btn.id">
                  <td><strong>{{ btn.label }}</strong></td>
                  <td>{{ btn.url }}</td>
                  <td>
                    <BmBadge :tone="btn.active ? 'success' : 'neutral'">
                      {{ btn.active ? 'Visible' : 'Hidden' }}
                    </BmBadge>
                  </td>
                  <td class="tabular-nums">{{ btn.clicks.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import SmartLinkBio from '@/components/common/SmartLinkBio.vue';
import AnimatedNumber from '@/components/common/motion/AnimatedNumber.vue';
import DeviceStage3D from '@/components/three/DeviceStage3D.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type { SmartLink } from '@/types/api';

const store = useAppStore();
const activeTab = ref('links');
const tabs = [
  { id: 'links', label: 'Links & Design' },
  { id: 'analytics', label: 'Analytics' }
];

const loading = ref(true);
const saving = ref(false);
const savedBanner = ref('');
const errorBanner = ref('');
const activeLink = ref<SmartLink | null>(null);
const publishedSlug = ref('');

async function loadSmartLinks(): Promise<void> {
  loading.value = true;
  savedBanner.value = '';
  errorBanner.value = '';
  try {
    const res = await apiRequest<{ data: SmartLink[] }>(
      `/api/v2/smart-links/links/lite?blogId=${store.activeBlogId}`
    );
    activeLink.value = res.data[0] ?? null;
    publishedSlug.value = activeLink.value?.slug ?? '';
  } catch (error) {
    activeLink.value = null;
    errorBanner.value = error instanceof Error ? error.message : 'Unable to load SmartLinks.';
  } finally {
    loading.value = false;
  }
}

async function createFirstSmartLink(): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  errorBanner.value = '';
  try {
    const res = await apiRequest<{ data: SmartLink }>('/api/v2/smart-links/links', {
      method: 'POST',
      body: JSON.stringify({
        blogId: store.activeBlogId,
        title: store.activeBrand?.name || 'My SmartLink',
        slug: `brand-${store.activeBlogId}`
      })
    });
    activeLink.value = res.data;
    publishedSlug.value = res.data.slug;
  } catch (error) {
    errorBanner.value = error instanceof Error ? error.message : 'Unable to create the SmartLink.';
  } finally {
    saving.value = false;
  }
}

function addButton(): void {
  if (!activeLink.value) return;
  activeLink.value.buttons.push({
    id: `btn-${Date.now()}`,
    label: 'Official Website',
    url: window.location.origin,
    active: true,
    clicks: 0
  });
}

function removeButton(idx: number): void {
  activeLink.value?.buttons.splice(idx, 1);
}

async function saveChanges(): Promise<void> {
  if (!activeLink.value || saving.value) return;
  saving.value = true;
  savedBanner.value = '';
  errorBanner.value = '';
  try {
    const res = await apiRequest<{ data: SmartLink }>(
      `/api/v2/smart-links/links/${activeLink.value.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(activeLink.value)
      }
    );
    activeLink.value = res.data;
    publishedSlug.value = res.data.slug;
    savedBanner.value = 'SmartLink changes saved to server.';
  } catch (error) {
    errorBanner.value = error instanceof Error ? error.message : 'Unable to save changes.';
  } finally {
    saving.value = false;
  }
}

watch(() => store.activeBlogId, loadSmartLinks);
onMounted(loadSmartLinks);
</script>

<style scoped>
.bm-head-actions,
.bm-sl-toolbar,
.bm-links-header,
.bm-btn-edit-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.bm-head-actions {
  justify-content: flex-end;
}

.bm-sl-toolbar,
.bm-links-header,
.bm-btn-edit-foot {
  justify-content: space-between;
}

.bm-sl-toolbar .bm-sl-preview-jump {
  display: none;
}

.bm-saved-banner,
.bm-error-banner {
  padding: 12px 16px;
  border: 1px solid;
  border-radius: var(--radius-inputs);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.bm-saved-banner {
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border-color: var(--bm-success-border);
}

.bm-error-banner {
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border-color: var(--bm-danger-border);
}

.bm-sl-split {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.bm-sl-fields,
.bm-sl-analytics,
.bm-sl-editor,
.bm-sl-preview-wrap {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.bm-sl-editor,
.bm-sl-preview-wrap {
  padding: clamp(16px, 2.2vw, 30px);
}

.bm-sl-editor h2,
.bm-sl-preview-head h2,
.bm-sl-analytics h2 {
  font-size: clamp(1.45rem, 2.4vw, 2rem);
  font-weight: 300;
  letter-spacing: -0.025em;
}

.bm-sl-preview-wrap {
  position: sticky;
  top: 88px;
  scroll-margin-top: 132px;
}

.bm-sl-preview-head {
  min-width: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bm-divider);
}

.bm-preview-path {
  margin-top: 5px;
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.bm-sl-preview-wrap :deep(.bm-device-stage__toggle) {
  min-height: 44px;
  white-space: normal;
}

.bm-color-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 114px), 1fr));
  gap: 12px;
}

.bm-color-input {
  width: 100%;
  height: 44px;
  padding: 4px;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--radius-inputs);
  background: var(--bm-subtle);
}

.bm-btn-editor-list,
.bm-btn-edit-card {
  display: grid;
  min-width: 0;
  gap: 12px;
}

.bm-btn-edit-card {
  padding: 14px;
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-inputs);
  background: var(--bm-subtle);
}

.bm-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.bm-check-inline {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.bm-check-inline input {
  accent-color: var(--bm-accent);
}

.bm-slot-del {
  min-height: 44px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--bm-danger-text);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.bm-table-scroll {
  overflow-x: auto;
  scrollbar-color: var(--bm-control-border) var(--bm-subtle);
}

.bm-table {
  width: 100%;
  min-width: 520px;
  border-spacing: 0;
}

.bm-table th,
.bm-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.bm-table tbody tr:last-child td {
  border-bottom: 0;
}

.bm-table :is(th, td):last-child {
  text-align: right;
}

@media (max-width: 900px) {
  .bm-head-actions {
    justify-content: flex-start;
  }

  .bm-sl-split {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-sl-preview-wrap {
    position: static;
  }

  .bm-sl-toolbar .bm-sl-preview-jump {
    display: inline-flex;
  }
}

@media (max-width: 580px) {
  .bm-two-col {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
