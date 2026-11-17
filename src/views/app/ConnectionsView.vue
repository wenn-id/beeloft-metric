<template>
  <AppShell>
    <div class="bm-conn-page">
      <div class="bm-page-head">
        <div>
          <h1>Brand Settings & Connections</h1>
          <p class="bm-page-sub">
            Manage channels, timezone, tags, White Label, AI voice, and third-party apps for
            <strong>{{ store.activeBrand?.name }}</strong>.
          </p>
        </div>
        <router-link :to="`/evolution/brandSummary?blogId=${store.activeBlogId}`" class="bm-back-link">
          View Brand Summary
        </router-link>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Brand settings tabs" />

      <p v-if="savedBanner" class="bm-saved-banner" role="status">{{ savedBanner }}</p>
      <p v-if="errBanner" class="bm-error-banner" role="alert">{{ errBanner }}</p>

      <!-- Tab 1: Connections -->
      <template v-if="activeTab === 'connections'">
        <section class="bm-card bm-tracker-card">
          <div class="bm-conn-card__top">
            <div>
              <h2>Real-Time Website Tracker (tracker.js)</h2>
              <p class="bm-page-sub">
                Paste this script inside the <code>&lt;head&gt;</code> of your website to stream live
                visitors, UTM campaigns, and Cloudflare geolocation into Real-Time Web analytics.
              </p>
            </div>
            <BmBadge tone="accent">First-Party</BmBadge>
          </div>
          <div class="bm-snippet-box">
            <code>{{ trackerSnippet }}</code>
          </div>
          <div class="bm-conn-card__actions">
            <BmButton variant="secondary" size="sm" @click="copyTrackerSnippet">
              Copy snippet
            </BmButton>
            <BmButton variant="primary" size="sm" :loading="testingBeacon" @click="sendTestBeacon">
              Send live test beacon
            </BmButton>
          </div>
        </section>

        <section v-for="group in groupedConnections" :key="group.id" class="bm-conn-group">
          <h2>{{ group.title }}</h2>
          <div class="bm-conn-grid">
            <article v-for="conn in group.items" :key="conn.network" class="bm-card bm-conn-card">
              <div class="bm-conn-card__top">
                <div class="bm-conn-card__title">
                  <NetworkBadge :network="conn.network" />
                  <strong>{{ conn.label }}</strong>
                </div>
                <BmBadge :tone="conn.connected ? 'success' : 'neutral'">
                  {{ conn.connected ? 'Connected' : 'Disconnected' }}
                </BmBadge>
              </div>

              <p v-if="conn.connected" class="bm-conn-handle">
                Account: <strong>{{ conn.accountHandle }}</strong>
                <br />
                <small>Last sync: {{ conn.lastSync?.slice(0, 16).replace('T', ' ') }}</small>
              </p>
              <p v-else class="bm-conn-handle">
                No account linked on {{ store.activeBrand?.name }}.
              </p>

              <div class="bm-conn-card__actions">
                <BmButton
                  v-if="!conn.connected"
                  variant="primary"
                  size="sm"
                  @click="openConnectModal(conn.network, conn.label)"
                >
                  Connect
                </BmButton>
                <BmButton
                  v-else
                  variant="secondary"
                  size="sm"
                  @click="disconnect(conn.network)"
                >
                  Disconnect
                </BmButton>
              </div>
            </article>
          </div>
        </section>
      </template>

      <!-- Tab 2: Configuration -->
      <section v-else-if="activeTab === 'configuration' && details" class="bm-card bm-form-card">
        <h2>Brand Configuration</h2>
        <form class="bm-form-stack" @submit.prevent="saveDetails('Brand configuration saved.')">
          <div>
            <label for="br-name" class="bm-label">Brand display name</label>
            <input id="br-name" v-model="details.name" type="text" class="bm-input" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="br-tz" class="bm-label">Timezone</label>
              <select id="br-tz" v-model="details.timezone" class="bm-select">
                <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
              </select>
            </div>
            <div>
              <label for="br-cur" class="bm-label">Reporting currency</label>
              <select id="br-cur" v-model="details.currency" class="bm-select">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="IDR">IDR</option>
              </select>
            </div>
          </div>
          <div>
            <label for="br-eng" class="bm-label">Engagement ratio denominator</label>
            <select id="br-eng" v-model="details.engagementRatioMode" class="bm-select">
              <option value="REACH">Interactions per Reach</option>
              <option value="FOLLOWERS">Interactions per Followers</option>
            </select>
          </div>
          <div>
            <BmButton type="submit" variant="primary" :loading="saving">Save configuration</BmButton>
          </div>
        </form>
      </section>

      <!-- Tab 3: Brand Tags -->
      <section v-else-if="activeTab === 'tags' && details" class="bm-card bm-form-card">
        <h2>Brand Tags</h2>
        <p class="bm-page-sub">Tags group posts across Analytics, Planner, and Campaigns Dashboard.</p>
        <form class="bm-tag-form" @submit.prevent="addTag">
          <div>
            <label for="new-tag" class="sr-only">New brand tag</label>
            <input id="new-tag" v-model="newTag" type="text" class="bm-input" placeholder="Campaign-2026" required />
          </div>
          <BmButton type="submit" variant="primary">Add tag</BmButton>
        </form>
        <div class="bm-tag-list">
          <span v-if="details.tags.length === 0" class="bm-page-sub">No tags added yet.</span>
          <div v-for="(tag, idx) in details.tags" :key="tag" class="bm-tag-item">
            <BmBadge tone="accent">#{{ tag }}</BmBadge>
            <button type="button" class="bm-tag-del" :aria-label="`Remove ${tag}`" @click="removeTag(idx)">
              Remove
            </button>
          </div>
        </div>
      </section>

      <!-- Tab 4: White Label -->
      <section v-else-if="activeTab === 'whitelabel' && details" class="bm-card bm-form-card">
        <h2>White Label Branding</h2>
        <form class="bm-form-stack" @submit.prevent="saveDetails('White Label settings saved.')">
          <label for="wl-en" class="bm-check-inline">
            <input id="wl-en" v-model="details.whiteLabel.enabled" type="checkbox" />
            <span>Enable custom brand identity on PDF, PPTX, and Studio reports</span>
          </label>
          <div>
            <label for="wl-logo" class="bm-label">Custom header title</label>
            <input id="wl-logo" v-model="details.whiteLabel.logoText" type="text" class="bm-input" />
          </div>
          <div>
            <label for="wl-col" class="bm-label">Accent hex color</label>
            <input id="wl-col" v-model="details.whiteLabel.primaryColor" type="color" class="bm-color-input" />
          </div>
          <div>
            <label for="wl-foot" class="bm-label">Report footer note</label>
            <input id="wl-foot" v-model="details.whiteLabel.footerNote" type="text" class="bm-input" />
          </div>
          <div>
            <BmButton type="submit" variant="primary" :loading="saving">Save White Label</BmButton>
          </div>
        </form>
      </section>

      <!-- Tab 5: AI Configuration -->
      <section v-else-if="activeTab === 'ai-configuration' && details" class="bm-card bm-form-card">
        <h2>Brand AI Voice Configuration</h2>
        <p class="bm-page-sub">
          The Natural Language Post Assistant in Planner reads these rules when drafting captions.
        </p>
        <form class="bm-form-stack" @submit.prevent="saveDetails('AI voice configuration saved.')">
          <div>
            <label for="ai-tone" class="bm-label">Tone of voice</label>
            <input id="ai-tone" v-model="details.aiConfig.tone" type="text" class="bm-input" />
          </div>
          <div>
            <label for="ai-aud" class="bm-label">Target audience</label>
            <input id="ai-aud" v-model="details.aiConfig.targetAudience" type="text" class="bm-input" />
          </div>
          <div>
            <label for="ai-voice" class="bm-label">Editorial guidelines</label>
            <textarea id="ai-voice" v-model="details.aiConfig.brandVoice" class="bm-textarea"></textarea>
          </div>
          <div>
            <label for="ai-ban" class="bm-label">Words to avoid (comma-separated)</label>
            <input id="ai-ban" v-model="details.aiConfig.bannedWords" type="text" class="bm-input" />
          </div>
          <div>
            <BmButton type="submit" variant="primary" :loading="saving">Save AI profile</BmButton>
          </div>
        </form>
      </section>

      <!-- Tab 6: Third-Party Integrations -->
      <section v-else-if="activeTab === 'integrations' && details" class="bm-conn-grid">
        <article v-for="appItem in integrationCatalog" :key="appItem.key" class="bm-card bm-conn-card">
          <div class="bm-conn-card__top">
            <strong>{{ appItem.name }}</strong>
            <BmBadge :tone="details.integrations[appItem.key] ? 'success' : 'neutral'">
              {{ details.integrations[appItem.key] ? 'Enabled' : 'Disabled' }}
            </BmBadge>
          </div>
          <p class="bm-conn-handle">{{ appItem.desc }}</p>
          <BmButton
            :variant="details.integrations[appItem.key] ? 'secondary' : 'primary'"
            size="sm"
            @click="toggleIntegration(appItem.key)"
          >
            {{ details.integrations[appItem.key] ? 'Disable integration' : 'Enable integration' }}
          </BmButton>
        </article>
      </section>

      <!-- Connect Modal -->
      <BmModal :open="connectOpen" :title="`Connect ${targetLabel}`" @close="connectOpen = false">
        <div class="bm-form-stack">
          <div v-if="selectedProviderStatus?.oauthSupported" class="bm-oauth-box">
            <p class="bm-page-sub">
              <template v-if="selectedProviderStatus.configured">
                Official OAuth2 credentials are active on this server. Authorize directly with {{ targetLabel }}:
              </template>
              <template v-else>
                OAuth2 redirect uses Cloudflare secret <code>{{ selectedProviderStatus.envHint }}</code>.
                You can also connect directly with a platform API access token below.
              </template>
            </p>
            <BmButton
              v-if="selectedProviderStatus.configured"
              variant="primary"
              size="sm"
              @click="startOAuthRedirect"
            >
              Authorize with {{ targetLabel }} OAuth2
            </BmButton>
          </div>

          <form class="bm-form-stack" @submit.prevent="confirmConnect">
            <div>
              <label for="conn-handle" class="bm-label">
                {{ targetNetwork === 'web' ? 'Website domain (e.g. mysite.com)' : 'Account handle or page name' }}
              </label>
              <input
                id="conn-handle"
                v-model="handleInput"
                type="text"
                class="bm-input"
                :placeholder="targetNetwork === 'web' ? 'example.com' : '@youraccount'"
                required
              />
            </div>

            <template v-if="targetNetwork !== 'web'">
              <div>
                <label for="conn-token" class="bm-label">Platform API Access Token (optional)</label>
                <input
                  id="conn-token"
                  v-model="tokenInput"
                  type="password"
                  class="bm-input"
                  placeholder="Paste Graph / OAuth2 bearer token for live API publishing"
                />
              </div>
              <div>
                <label for="conn-acc-id" class="bm-label">Platform Account / Page ID (optional)</label>
                <input
                  id="conn-acc-id"
                  v-model="accountIdInput"
                  type="text"
                  class="bm-input"
                  placeholder="e.g. 17841400000000"
                />
              </div>
            </template>

            <div class="bm-modal-actions">
              <BmButton variant="secondary" @click="connectOpen = false">Cancel</BmButton>
              <BmButton type="submit" variant="primary" :loading="saving">Save connection</BmButton>
            </div>
          </form>
        </div>
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
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import NetworkBadge from '@/components/common/designSystem/atoms/NetworkBadge.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type { BrandDetails, NetworkKey } from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'connections', label: 'Connections' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'tags', label: 'Tags' },
  { id: 'whitelabel', label: 'White Label' },
  { id: 'ai-configuration', label: 'AI Configuration' },
  { id: 'integrations', label: 'Integrations' }
];

function tabFromPath(path: string): string {
  const seg = path.split('/')[2] || 'connections';
  return tabs.some((t) => t.id === seg) ? seg : 'connections';
}

const activeTab = ref(tabFromPath(route.path));
const connectOpen = ref(false);
const targetNetwork = ref<NetworkKey>('instagram');
const targetLabel = ref('Instagram');
const handleInput = ref('');
const tokenInput = ref('');
const accountIdInput = ref('');
const saving = ref(false);
const testingBeacon = ref(false);
const savedBanner = ref('');
const errBanner = ref('');

interface OAuthProviderInfo {
  network: NetworkKey;
  oauthSupported: boolean;
  configured: boolean;
  envHint: string;
}

const oauthProviders = ref<OAuthProviderInfo[]>([]);
const details = ref<BrandDetails | null>(null);
const timezones = ref<string[]>(['Asia/Jakarta', 'UTC']);
const newTag = ref('');

const selectedProviderStatus = computed(() =>
  oauthProviders.value.find((p) => p.network === targetNetwork.value) ?? null
);

const trackerSnippet = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://beeloftmetric.biz.id';
  const key = details.value?.trackingKey || store.activeTrackingKey || 'bm_trk_pending';
  return `<script defer src="${origin}/tracker.js" data-key="${key}"><` + '/script>';
});

const integrationCatalog: Array<{
  key: keyof BrandDetails['integrations'];
  name: string;
  desc: string;
}> = [
  { key: 'canva', name: 'Canva', desc: 'Import social graphics directly into Planner media slots.' },
  { key: 'googleDrive', name: 'Google Drive', desc: 'Attach approved client assets from shared folders.' },
  { key: 'slack', name: 'Slack', desc: 'Deliver scheduled post reminders and task notifications.' },
  { key: 'zapier', name: 'Zapier', desc: 'Trigger webhooks when posts publish or inbox replies arrive.' },
  { key: 'adobeExpress', name: 'Adobe Express', desc: 'Edit creative layouts before publishing.' },
  { key: 'lookerStudio', name: 'Looker Studio', desc: 'Query channel summary metrics inside Looker reports.' }
];

const categoryTitles: Record<string, string> = {
  websites: 'Websites & Blogs',
  social: 'Social Networks',
  business: 'Business & Local',
  advertising: 'Advertising Platforms'
};

const groupedConnections = computed(() => {
  return ['websites', 'social', 'business', 'advertising']
    .map((cat) => ({
      id: cat,
      title: categoryTitles[cat],
      items: store.connections.filter((c) => c.category === cat)
    }))
    .filter((g) => g.items.length > 0);
});

async function loadDetails(): Promise<void> {
  if (!store.activeBlogId) return;
  const [detRes, tzRes, oaRes] = await Promise.all([
    apiRequest<{ data: BrandDetails }>(`/api/v2/settings/brands/${store.activeBlogId}/details`),
    apiRequest<{ data: string[] }>('/api/v2/settings/catalogs/timezones'),
    apiRequest<{ data: OAuthProviderInfo[] }>('/api/v2/oauth/providers').catch(() => ({ data: [] }))
  ]);
  details.value = detRes.data;
  timezones.value = tzRes.data;
  oauthProviders.value = oaRes.data;
  if (route.query.oauth === 'connected' && route.query.network) {
    savedBanner.value = `OAuth2 connection verified for ${route.query.network}.`;
  }
}

async function saveDetails(msg: string): Promise<void> {
  if (!details.value) return;
  saving.value = true;
  savedBanner.value = '';
  errBanner.value = '';
  try {
    const res = await apiRequest<{ data: BrandDetails }>(
      `/api/v2/settings/brands/${store.activeBlogId}/details`,
      {
        method: 'PUT',
        body: JSON.stringify(details.value)
      }
    );
    details.value = res.data;
    await store.bootstrap();
    savedBanner.value = msg;
  } catch (err) {
    errBanner.value = err instanceof Error ? err.message : 'Unable to save brand settings.';
  } finally {
    saving.value = false;
  }
}

async function addTag(): Promise<void> {
  if (!details.value || !newTag.value.trim()) return;
  const clean = newTag.value.trim().replace(/^#/, '');
  if (!details.value.tags.includes(clean)) {
    details.value.tags.push(clean);
    await saveDetails('Brand tag added.');
  }
  newTag.value = '';
}

async function removeTag(idx: number): Promise<void> {
  if (!details.value) return;
  details.value.tags.splice(idx, 1);
  await saveDetails('Brand tag removed.');
}

async function toggleIntegration(key: keyof BrandDetails['integrations']): Promise<void> {
  if (!details.value) return;
  details.value.integrations[key] = !details.value.integrations[key];
  await saveDetails('Integration preference updated.');
}

function openConnectModal(net: NetworkKey, label: string): void {
  targetNetwork.value = net;
  targetLabel.value = label;
  handleInput.value =
    net === 'web'
      ? details.value?.websiteDomain || 'beeloftmetric.biz.id'
      : `@${(store.activeBrand?.name || 'brand').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  tokenInput.value = '';
  accountIdInput.value = '';
  connectOpen.value = true;
}

function startOAuthRedirect(): void {
  window.location.href = `/api/v2/oauth/${targetNetwork.value}/authorize?blogId=${store.activeBlogId}&redirect=1`;
}

async function copyTrackerSnippet(): Promise<void> {
  try {
    await navigator.clipboard.writeText(trackerSnippet.value);
    savedBanner.value = 'Tracker script copied to clipboard.';
  } catch {
    savedBanner.value = 'Select and copy the snippet from the box above.';
  }
}

async function sendTestBeacon(): Promise<void> {
  const key = details.value?.trackingKey || store.activeTrackingKey;
  if (!key) return;
  testingBeacon.value = true;
  errBanner.value = '';
  try {
    await apiRequest('/s/collect', {
      method: 'POST',
      body: JSON.stringify({
        trackingKey: key,
        eventType: 'pageview',
        eventName: 'verification_ping',
        path: '/verification-test',
        utmSource: 'beeloft_connections'
      })
    });
    await store.bootstrap();
    savedBanner.value = 'Live test beacon recorded. Inspect Real-Time Web in Analytics.';
  } catch (err) {
    errBanner.value = err instanceof Error ? err.message : 'Unable to send test beacon.';
  } finally {
    testingBeacon.value = false;
  }
}

async function confirmConnect(): Promise<void> {
  saving.value = true;
  errBanner.value = '';
  try {
    await store.toggleNetworkConnection(
      targetNetwork.value,
      handleInput.value,
      true,
      tokenInput.value || undefined,
      accountIdInput.value || undefined
    );
    connectOpen.value = false;
    savedBanner.value = `${targetLabel.value} connected.`;
  } catch (err) {
    errBanner.value = err instanceof Error ? err.message : 'Connection failed.';
  } finally {
    saving.value = false;
  }
}

async function disconnect(net: NetworkKey): Promise<void> {
  await store.toggleNetworkConnection(net, undefined, false);
}

watch(() => route.path, (p) => {
  activeTab.value = tabFromPath(p);
});

watch(activeTab, (t) => {
  savedBanner.value = '';
  const target = `/brands/${t}`;
  if (route.path !== target) {
    router.replace({ path: target, query: route.query });
  }
});

watch(() => store.activeBlogId, loadDetails);
onMounted(loadDetails);
</script>

<style scoped>
.bm-conn-page {
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

.bm-back-link {
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

.bm-error-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border: 1px solid var(--bm-danger-border);
  font-weight: 600;
}

.bm-tracker-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bm-snippet-box {
  padding: 0.75rem 1rem;
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  border-radius: var(--bm-radius-md);
  overflow-x: auto;
  font-size: 0.8125rem;
}

.bm-oauth-box {
  padding: 0.875rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-conn-group h2 {
  font-size: 1.0625rem;
  margin-bottom: 0.75rem;
}

.bm-conn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.875rem;
}

.bm-conn-card {
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-conn-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.bm-conn-card__title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.bm-conn-handle {
  font-size: 0.8125rem;
  color: var(--bm-text-muted);
  min-height: 2.5rem;
}

.bm-conn-card__actions {
  margin-top: auto;
}

.bm-form-card {
  max-width: 680px;
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

.bm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bm-tag-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
}

.bm-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.bm-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--bm-divider);
  border-radius: var(--bm-radius-md);
}

.bm-tag-del {
  border: none;
  background: transparent;
  color: var(--bm-danger-text);
  font-size: 0.75rem;
  font-weight: 700;
}

.bm-check-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  font-weight: 600;
}

.bm-color-input {
  width: 88px;
  height: 44px;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  background: var(--bm-surface);
  padding: 0.25rem;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}

@media (max-width: 640px) {
  .bm-two-col,
  .bm-tag-form {
    grid-template-columns: 1fr;
  }
}
</style>
