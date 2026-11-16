<template>
  <AppShell>
    <div class="bm-settings-page">
      <div class="bm-page-head">
        <div>
          <h1>User Settings, API & Security</h1>
          <p class="bm-page-sub">
            Manage operator profile, subscription plan, REST API token, MCP scopes, and 2FA.
          </p>
        </div>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="User settings tabs" />

      <p v-if="savedMsg" class="bm-saved-banner" role="status">{{ savedMsg }}</p>
      <p v-if="errMsg" class="bm-error-banner" role="alert">{{ errMsg }}</p>

      <!-- Tab 1: Account -->
      <section v-if="activeTab === 'account'" class="bm-card bm-settings-card">
        <h2>Operator Profile</h2>
        <form class="bm-form-stack" @submit.prevent="saveProfile">
          <div>
            <label for="us-name" class="bm-label">Display name</label>
            <input id="us-name" v-model="nameInput" type="text" class="bm-input" required />
          </div>
          <div>
            <label for="us-email" class="bm-label">Email address</label>
            <input id="us-email" v-model="emailInput" type="email" class="bm-input" required />
          </div>
          <div class="bm-meta-row">
            <span>User ID: <strong class="tabular-nums">{{ store.user?.userId }}</strong></span>
            <span>Status: <BmBadge tone="success">{{ store.user?.status }}</BmBadge></span>
          </div>
          <div>
            <BmButton type="submit" variant="primary" :loading="saving">Save account settings</BmButton>
          </div>
        </form>
      </section>

      <!-- Tab 2: Subscription Plan -->
      <section v-else-if="activeTab === 'plan'" class="bm-plan-grid">
        <article
          v-for="p in plans"
          :key="p.id"
          class="bm-card bm-plan-card"
          :class="{ 'bm-plan-card--current': store.user?.plan === p.id }"
        >
          <div class="bm-plan-card__head">
            <h2>{{ p.label }}</h2>
            <BmBadge v-if="store.user?.plan === p.id" tone="accent">Active plan</BmBadge>
          </div>
          <p class="bm-plan-price">{{ p.price }}</p>
          <p class="bm-plan-desc">{{ p.desc }}</p>
          <BmButton
            :variant="store.user?.plan === p.id ? 'secondary' : 'primary'"
            :disabled="store.user?.plan === p.id || saving"
            @click="switchPlan(p.id)"
          >
            {{ store.user?.plan === p.id ? 'Current tier' : `Switch to ${p.label}` }}
          </BmButton>
        </article>
      </section>

      <!-- Tab 3: REST API Token, MCP OAuth & 2FA -->
      <section v-else-if="activeTab === 'api'" class="bm-api-stack">
        <article class="bm-card bm-settings-card">
          <h2>REST API Access Token</h2>
          <p class="bm-page-sub">
            Use this token in the <code>X-Mc-Auth</code> header for automated scripts and Looker Studio.
          </p>
          <div class="bm-token-box">
            <code>{{ apiToken }}</code>
          </div>
          <div class="bm-token-actions">
            <BmButton variant="danger" size="sm" @click="openRegenModal">Regenerate token</BmButton>
          </div>
        </article>

        <article class="bm-card bm-settings-card">
          <h2>Two-Factor Authentication (TOTP) & MCP OAuth Scopes</h2>
          <div class="bm-meta-row">
            <BmBadge :tone="totpEnabled ? 'success' : 'warning'">
              2FA {{ totpEnabled ? 'Enabled' : 'Disabled' }}
            </BmBadge>
            <BmButton variant="secondary" size="sm" @click="toggleTotp">
              {{ totpEnabled ? 'Disable 2FA' : 'Enable 2FA' }}
            </BmButton>
          </div>
          <div>
            <strong>Approved MCP OAuth Scopes</strong>
            <div class="bm-scopes">
              <BmBadge v-for="sc in approvedScopes" :key="sc" tone="neutral">{{ sc }}</BmBadge>
            </div>
          </div>
        </article>
      </section>

      <!-- Tab 4: Notifications -->
      <section v-else class="bm-card bm-settings-card">
        <h2>Alert Preferences</h2>
        <label for="n-digest" class="bm-check-inline">
          <input id="n-digest" v-model="notifPrefs.weeklyDigest" type="checkbox" />
          <span>Receive weekly channel summary email</span>
        </label>
        <label for="n-fail" class="bm-check-inline">
          <input id="n-fail" v-model="notifPrefs.publishFailure" type="checkbox" />
          <span>Notify immediately when a scheduled post fails</span>
        </label>
        <div>
          <BmButton variant="primary" size="sm" @click="savedMsg = 'Notification preferences saved.'">
            Save preferences
          </BmButton>
        </div>
      </section>

      <BmModal :open="regenOpen" title="Regenerate API token" @close="regenOpen = false">
        <form class="bm-form-stack" @submit.prevent="confirmRegen">
          <p class="bm-page-sub">
            Your current token will be invalidated immediately. Type <strong>REGENERATE</strong> in
            uppercase to confirm.
          </p>
          <div>
            <label for="regen-word" class="bm-label">Confirmation word</label>
            <input id="regen-word" v-model="regenWord" type="text" class="bm-input" placeholder="REGENERATE" required />
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="regenOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="danger">Confirm regeneration</BmButton>
          </div>
        </form>
      </BmModal>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmModal from '@/components/common/designSystem/atoms/BmModal.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'account', label: 'Account Details' },
  { id: 'plan', label: 'Subscription & Plan' },
  { id: 'api', label: 'API, MCP & 2FA' },
  { id: 'notifications', label: 'Notifications' }
];

function tabFromPath(path: string): string {
  if (path.includes('plan')) return 'plan';
  if (path.includes('api') || path.includes('access')) return 'api';
  if (path.includes('notifications')) return 'notifications';
  return 'account';
}

const activeTab = ref(tabFromPath(route.path));
const nameInput = ref('');
const emailInput = ref('');
const saving = ref(false);
const savedMsg = ref('');
const errMsg = ref('');

const apiToken = ref('');
const totpEnabled = ref(false);
const approvedScopes = ref<string[]>([]);
const regenOpen = ref(false);
const regenWord = ref('');
const notifPrefs = ref({ weeklyDigest: true, publishFailure: true });

const plans = [
  { id: 'FREE', label: 'Free', price: '$0 / mo', desc: 'Includes 1 brand and 20 monthly posts.' },
  { id: 'STARTER', label: 'Starter', price: '$18 / mo', desc: 'Up to 5 brands, PDF exports, and SmartLinks.' },
  { id: 'ADVANCED', label: 'Advanced', price: '$45 / mo', desc: 'Up to 15 brands, PPTX templates, and Ads metrics.' },
  {
    id: 'ENTERPRISE_CUSTOM',
    label: 'Enterprise Custom',
    price: 'Custom',
    desc: 'Up to 50 brands with custom entitlements and API access.'
  }
] as const;

async function syncInputs(): Promise<void> {
  nameInput.value = store.user?.name || '';
  emailInput.value = store.user?.email || '';
  const tokRes = await apiRequest<{
    data: { token: string; totpEnabled: boolean; approvedMcpScopes: string[] };
  }>('/api/v2/settings/users/tokens/current');
  apiToken.value = tokRes.data.token;
  totpEnabled.value = tokRes.data.totpEnabled;
  approvedScopes.value = tokRes.data.approvedMcpScopes;
}

async function saveProfile(): Promise<void> {
  saving.value = true;
  savedMsg.value = '';
  try {
    await apiRequest('/api/v2/settings/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: nameInput.value, email: emailInput.value })
    });
    await store.bootstrap();
    savedMsg.value = 'Account profile updated.';
  } finally {
    saving.value = false;
  }
}

async function switchPlan(planId: string): Promise<void> {
  saving.value = true;
  savedMsg.value = '';
  try {
    await apiRequest('/api/v2/settings/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ plan: planId })
    });
    await store.bootstrap();
    savedMsg.value = `Workspace plan updated to ${planId}.`;
  } finally {
    saving.value = false;
  }
}

function openRegenModal(): void {
  regenWord.value = '';
  errMsg.value = '';
  regenOpen.value = true;
}

async function confirmRegen(): Promise<void> {
  errMsg.value = '';
  savedMsg.value = '';
  try {
    const res = await apiRequest<{ data: { token: string } }>(
      '/api/v2/settings/users/tokens/regenerate',
      {
        method: 'POST',
        body: JSON.stringify({ confirmWord: regenWord.value })
      }
    );
    apiToken.value = res.data.token;
    regenOpen.value = false;
    savedMsg.value = 'New REST API token issued.';
  } catch (err) {
    errMsg.value = err instanceof Error ? err.message : 'Token regeneration failed.';
  }
}

async function toggleTotp(): Promise<void> {
  const res = await apiRequest<{ data: { totpEnabled: boolean } }>(
    '/api/v2/settings/users/totp/tokens',
    { method: 'POST' }
  );
  totpEnabled.value = res.data.totpEnabled;
  savedMsg.value = `Two-factor authentication ${totpEnabled.value ? 'enabled' : 'disabled'}.`;
}

watch(() => route.path, (p) => {
  activeTab.value = tabFromPath(p);
});

watch(activeTab, (tab) => {
  const target = `/user-settings/${tab}`;
  if (route.path !== target) {
    router.replace({ path: target, query: route.query });
  }
});

watch(() => store.user, syncInputs);
onMounted(syncInputs);
</script>

<style scoped>
.bm-settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-page-sub {
  color: var(--bm-text-muted);
}

.bm-saved-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-weight: 600;
}

.bm-error-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border: 1px solid var(--bm-danger-border);
  font-weight: 600;
}

.bm-api-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-settings-card {
  max-width: 620px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-meta-row,
.bm-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  align-items: center;
  margin-top: 0.375rem;
}

.bm-token-box {
  padding: 0.875rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  overflow-x: auto;
}

.bm-check-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  font-weight: 600;
}

.bm-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.bm-plan-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-plan-card--current {
  border-color: var(--bm-accent);
}

.bm-plan-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.bm-plan-card__head h2 {
  font-size: 1.125rem;
}

.bm-plan-price {
  font-size: 1.5rem;
  font-weight: 700;
}

.bm-plan-desc {
  color: var(--bm-text-muted);
  font-size: 0.875rem;
  margin-bottom: auto;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}
</style>
