<template>
  <AppShell>
    <div class="bm-sl-page">
      <div class="bm-page-head">
        <div>
          <h1>SmartLinks Bio Microsite</h1>
          <p class="bm-page-sub">
            Configure your public link-in-bio page and click tracking for
            <strong>{{ store.activeBrand?.name }}</strong>.
          </p>
        </div>
        <div v-if="activeLink" class="bm-head-actions">
          <router-link :to="`/bio/${activeLink.slug}`" class="bm-open-public">
            Open public /bio/{{ activeLink.slug }}
          </router-link>
          <BmButton variant="primary" :loading="saving" @click="saveChanges">Save changes</BmButton>
        </div>
      </div>

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
        <BmTabs v-model="activeTab" :tabs="tabs" label="SmartLink tabs" />

        <p v-if="savedBanner" class="bm-saved-banner" role="status">{{ savedBanner }}</p>

        <div v-if="activeTab === 'links'" class="bm-sl-split">
          <!-- Left Editor Column -->
          <section class="bm-card bm-sl-editor">
            <h2>Profile & Theme</h2>
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
                <label for="sl-btn-fg" class="bm-label">Button label</label>
                <input id="sl-btn-fg" v-model="activeLink.theme.buttonTextColor" type="color" class="bm-color-input" />
              </div>
            </div>

            <div class="bm-links-header">
              <h2>Buttons</h2>
              <BmButton variant="secondary" size="sm" @click="addButton">+ Add button</BmButton>
            </div>

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
                  <button type="button" class="bm-slot-del" @click="removeButton(idx)">Remove</button>
                </div>
              </article>
            </div>
          </section>

          <!-- Right Smartphone Preview Column -->
          <aside class="bm-card bm-sl-preview-wrap" aria-label="Live SmartLink preview">
            <h2>Live Mobile Preview</h2>
            <div class="bm-phone-frame" :style="{ backgroundColor: activeLink.theme.backgroundColor }">
              <div class="bm-phone-avatar" aria-hidden="true">
                {{ activeLink.title.slice(0, 2).toUpperCase() }}
              </div>
              <h3 class="bm-phone-title">{{ activeLink.title }}</h3>
              <p class="bm-phone-desc">{{ activeLink.description }}</p>

              <div class="bm-phone-buttons">
                <div
                  v-for="btn in activeLink.buttons.filter((b) => b.active)"
                  :key="btn.id"
                  class="bm-phone-btn"
                  :style="{
                    backgroundColor: activeLink.theme.buttonColor,
                    color: activeLink.theme.buttonTextColor
                  }"
                >
                  {{ btn.label }}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div v-else class="bm-card bm-sl-analytics">
          <h2>How many views and link clicks has /bio/{{ activeLink.slug }} recorded?</h2>
          <div class="bm-kpi-row">
            <div class="bm-kpi-box">
              <span>Profile Views</span>
              <strong class="tabular-nums">{{ activeLink.views.toLocaleString() }}</strong>
            </div>
            <div class="bm-kpi-box">
              <span>Total Button Clicks</span>
              <strong class="tabular-nums">
                {{ activeLink.buttons.reduce((s, b) => s + b.clicks, 0).toLocaleString() }}
              </strong>
            </div>
          </div>

          <div class="bm-table-scroll">
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
        </div>
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
const activeLink = ref<SmartLink | null>(null);

async function loadSmartLinks(): Promise<void> {
  loading.value = true;
  savedBanner.value = '';
  try {
    const res = await apiRequest<{ data: SmartLink[] }>(
      `/api/v2/smart-links/links/lite?blogId=${store.activeBlogId}`
    );
    activeLink.value = res.data[0] ?? null;
  } finally {
    loading.value = false;
  }
}

async function createFirstSmartLink(): Promise<void> {
  const res = await apiRequest<{ data: SmartLink }>('/api/v2/smart-links/links', {
    method: 'POST',
    body: JSON.stringify({
      blogId: store.activeBlogId,
      title: store.activeBrand?.name || 'My SmartLink',
      slug: `brand-${store.activeBlogId}`
    })
  });
  activeLink.value = res.data;
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
  if (!activeLink.value) return;
  saving.value = true;
  savedBanner.value = '';
  try {
    const res = await apiRequest<{ data: SmartLink }>(
      `/api/v2/smart-links/links/${activeLink.value.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(activeLink.value)
      }
    );
    activeLink.value = res.data;
    savedBanner.value = 'SmartLink changes saved to server.';
  } finally {
    saving.value = false;
  }
}

watch(() => store.activeBlogId, loadSmartLinks);
onMounted(loadSmartLinks);
</script>

<style scoped>
.bm-sl-page {
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
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.bm-open-public {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1rem;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  text-decoration: none;
  font-weight: 700;
}

.bm-saved-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-weight: 600;
}

.bm-sl-split {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1.25rem;
  align-items: start;
}

.bm-sl-editor,
.bm-sl-preview-wrap,
.bm-sl-analytics {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-color-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.bm-color-input {
  width: 100%;
  height: 44px;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  background: var(--bm-surface);
  padding: 0.25rem;
}

.bm-links-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-btn-editor-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-btn-edit-card {
  padding: 0.875rem;
  border-radius: var(--bm-radius-md);
  border: 1px solid var(--bm-divider);
  background: var(--bm-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bm-btn-edit-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-check-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  min-height: 36px;
}

.bm-slot-del {
  border: none;
  background: transparent;
  color: var(--bm-danger-text);
  font-weight: 700;
  min-height: 36px;
}

.bm-phone-frame {
  border: 1px solid #ececec;
  border-radius: 24px;
  padding: 2rem 1.25rem;
  min-height: 460px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  color: #17191c;
  box-shadow: var(--shadow-subtle-3);
}

.bm-phone-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #17191c;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.bm-phone-title {
  font-size: 1.125rem;
}

.bm-phone-desc {
  font-size: 0.875rem;
  color: #5f636d;
}

.bm-phone-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-top: 0.5rem;
}

.bm-phone-btn {
  padding: 0.75rem 1.25rem;
  border-radius: 9999px;
  font-weight: 500;
  border: 1px solid #17191c;
}

.bm-kpi-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.bm-kpi-box {
  min-width: 200px;
  padding: 1rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-subtle);
  display: flex;
  flex-direction: column;
}

.bm-kpi-box strong {
  font-size: 1.5rem;
}

.bm-table-scroll {
  overflow-x: auto;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 520px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

@media (max-width: 900px) {
  .bm-sl-split,
  .bm-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
