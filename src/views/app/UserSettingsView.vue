<template>
  <AppShell>
    <div class="bm-settings-page">
      <div class="bm-page-head">
        <div>
          <h1>User Settings, Billing & Security</h1>
          <p class="bm-page-sub">
            Manage operator profile, subscription checkout, REST API token, MCP scopes, and RFC 6238
            TOTP 2FA.
          </p>
        </div>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="User settings tabs" />

      <p v-if="savedMsg" class="bm-saved-banner" role="status">{{ savedMsg }}</p>
      <p v-if="errMsg" class="bm-error-banner" role="alert">{{ errMsg }}</p>

      <!-- Tab 1: Account -->
      <section v-if="activeTab === 'account'" class="bm-card bm-settings-card">
        <h2>Account Profile</h2>
        <form class="bm-form-stack" @submit.prevent="saveProfile">
          <div>
            <label for="us-name" class="bm-label">Display name</label>
            <input id="us-name" v-model="nameInput" type="text" class="bm-input" required />
          </div>
          <div>
            <label for="us-email" class="bm-label">Email address</label>
            <input id="us-email" v-model="emailInput" type="email" class="bm-input" required />
          </div>
          <div>
            <label for="us-cur-pwd" class="bm-label">Current password (only if changing password)</label>
            <input
              id="us-cur-pwd"
              v-model="currentPasswordInput"
              type="password"
              autocomplete="current-password"
              class="bm-input"
              placeholder="Leave blank to keep current password"
            />
          </div>
          <div>
            <label for="us-new-pwd" class="bm-label">New password (min 6 characters)</label>
            <input
              id="us-new-pwd"
              v-model="newPasswordInput"
              type="password"
              autocomplete="new-password"
              minlength="6"
              class="bm-input"
              placeholder="Enter new password"
            />
          </div>
          <div class="bm-meta-row">
            <span>User ID: <strong class="tabular-nums">{{ store.user?.userId }}</strong></span>
            <span>Status: <BmBadge tone="success">{{ store.user?.status }}</BmBadge></span>
            <span>
              Email:
              <BmBadge :tone="store.user?.emailVerified ? 'success' : 'warning'">
                {{ store.user?.emailVerified ? 'Verified' : 'Pending verification' }}
              </BmBadge>
            </span>
          </div>
          <div>
            <BmButton type="submit" variant="primary" :loading="saving">Save account settings</BmButton>
          </div>
        </form>
      </section>

      <!-- Tab 2: Subscription Plan & Checkout -->
      <template v-else-if="activeTab === 'plan'">
        <section v-if="isUnlimitedUser" class="bm-peach-card bm-trial-banner" role="status">
          <div>
            <strong>Unlimited Owner Account Active</strong>
            <p class="bm-trial-sub">
              All BeeloftMetric features, brands, scheduled posts, PDF/PPTX report exports, Reporting
              Studio, White Label branding, and Operator Backoffice are permanently unlocked without limits.
            </p>
          </div>
          <BmBadge tone="accent">Unlimited</BmBadge>
        </section>

        <section v-else-if="store.user?.trialActive" class="bm-peach-card bm-trial-banner" role="status">
          <div>
            <strong>7-Day Starter Free Trial Active ({{ store.user.trialDaysRemaining ?? 7 }} day(s) remaining)</strong>
            <p class="bm-trial-sub">
              Full Starter access (up to 5 brands, 2,000 monthly scheduled posts, and report exports)
              runs until <span class="tabular-nums">{{ store.user.trialEndsAt?.slice(0, 16).replace('T', ' ') }}</span> UTC.
              Subscribe below anytime to keep paid access active without interruption.
            </p>
          </div>
          <BmBadge tone="accent">Free Trial</BmBadge>
        </section>

        <section class="bm-card bm-checkout-bar">
          <div class="bm-checkout-controls">
            <div>
              <label for="pay-provider" class="bm-label">Payment gateway</label>
              <select id="pay-provider" v-model="paymentProvider" class="bm-select">
                <option value="midtrans">Midtrans Snap (IDR - QRIS, VA, Card)</option>
                <option value="stripe">Stripe Checkout (USD - International Card)</option>
              </select>
            </div>
            <div>
              <label for="pay-coupon" class="bm-label">Discount coupon (optional)</label>
              <input
                id="pay-coupon"
                v-model="couponCode"
                type="text"
                class="bm-input"
                placeholder="e.g. LAUNCH20"
              />
            </div>
          </div>
        </section>

        <section class="bm-plan-grid">
          <article
            v-for="p in plans"
            :key="p.id"
            class="bm-card bm-plan-card"
            :class="{ 'bm-plan-card--current': store.user?.plan === p.id }"
          >
            <div class="bm-plan-card__head">
              <h2>{{ p.label }}</h2>
              <BmBadge v-if="store.user?.plan === p.id && store.user?.trialActive" tone="warning">
                7-day trial
              </BmBadge>
              <BmBadge v-else-if="store.user?.plan === p.id" tone="accent">Active plan</BmBadge>
            </div>
            <p class="bm-plan-price">{{ p.price }}</p>
            <p class="bm-plan-desc">{{ p.desc }}</p>
            <BmButton
              :variant="isPermanentActivePlan(p.id) ? 'secondary' : 'primary'"
              :disabled="isPermanentActivePlan(p.id) || saving"
              @click="startCheckout(p.id)"
            >
              {{
                isPermanentActivePlan(p.id)
                  ? 'Current tier'
                  : p.id === 'FREE'
                    ? 'Switch to Free'
                    : store.user?.plan === p.id && store.user?.trialActive
                      ? `Subscribe to ${p.label}`
                      : `Checkout ${p.label}`
              }}
            </BmButton>
          </article>
        </section>

        <section v-if="paymentOrders.length > 0" class="bm-card bm-settings-card bm-wide-card">
          <h2>Billing Orders</h2>
          <div class="bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Plan</th>
                  <th>Gateway</th>
                  <th>Amount (IDR / USD)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ord in paymentOrders" :key="ord.orderId">
                  <td><code>{{ ord.orderId }}</code></td>
                  <td>{{ ord.plan }}</td>
                  <td>{{ ord.provider }}</td>
                  <td class="tabular-nums">Rp {{ ord.amountIdr.toLocaleString() }} (${{ ord.amountUsd }})</td>
                  <td>
                    <BmBadge :tone="ord.status === 'PAID' ? 'success' : 'warning'">{{ ord.status }}</BmBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <!-- Tab 3: REST API Token, MCP OAuth & RFC 6238 TOTP 2FA -->
      <section v-else-if="activeTab === 'api'" class="bm-api-stack">
        <article class="bm-card bm-settings-card">
          <h2>REST API Access Token</h2>
          <p class="bm-page-sub">
            Pass this token in the <code>X-Mc-Auth</code> header for automated scripts and Looker Studio.
          </p>
          <div class="bm-token-box">
            <code>{{ apiToken }}</code>
          </div>
          <div class="bm-token-actions">
            <BmButton variant="danger" size="sm" @click="openRegenModal">Regenerate token</BmButton>
          </div>
        </article>

        <article class="bm-card bm-settings-card">
          <h2>Two-Factor Authentication (RFC 6238 TOTP) & MCP Scopes</h2>
          <div class="bm-meta-row">
            <BmBadge :tone="totpEnabled ? 'success' : 'warning'">
              2FA {{ totpEnabled ? 'Enabled' : 'Disabled' }}
            </BmBadge>
            <BmButton v-if="totpEnabled" variant="secondary" size="sm" @click="disableTotp">
              Disable 2FA
            </BmButton>
            <BmButton v-else variant="primary" size="sm" @click="beginTotpSetup">
              Configure authenticator app
            </BmButton>
          </div>

          <form v-if="totpSetupSecret && !totpEnabled" class="bm-totp-setup" @submit.prevent="confirmTotpEnable">
            <p class="bm-page-sub">
              Add this Base32 key to Google Authenticator, Authy, or 1Password, then enter the
              6-digit code below:
            </p>
            <div class="bm-token-box">
              <strong>Secret:</strong> <code>{{ totpSetupSecret }}</code>
            </div>
            <div class="bm-token-box">
              <small><code>{{ totpSetupUri }}</code></small>
            </div>
            <div>
              <label for="totp-verify" class="bm-label">6-digit code from authenticator</label>
              <input
                id="totp-verify"
                v-model="totpVerifyCode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]{6}"
                maxlength="6"
                class="bm-input tabular-nums"
                placeholder="000000"
                required
              />
            </div>
            <div>
              <BmButton type="submit" variant="primary" size="sm">Verify & enable 2FA</BmButton>
            </div>
          </form>

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
import { computed, onMounted, ref, watch } from 'vue';
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
const currentPasswordInput = ref('');
const newPasswordInput = ref('');
const saving = ref(false);
const savedMsg = ref('');
const errMsg = ref('');

const isUnlimitedUser = computed(
  () => store.user?.role === 'ADMIN' || (store.user?.brandLimit ?? 0) >= 999999
);

const paymentProvider = ref<'midtrans' | 'stripe'>('midtrans');
const couponCode = ref('');
interface OrderRow {
  orderId: string;
  plan: string;
  provider: string;
  amountIdr: number;
  amountUsd: number;
  status: string;
}
const paymentOrders = ref<OrderRow[]>([]);

const apiToken = ref('');
const totpEnabled = ref(false);
const totpSetupSecret = ref('');
const totpSetupUri = ref('');
const totpVerifyCode = ref('');
const approvedScopes = ref<string[]>([]);
const regenOpen = ref(false);
const regenWord = ref('');
const notifPrefs = ref({ weeklyDigest: true, publishFailure: true });

const plans = [
  { id: 'FREE', label: 'Free', price: 'Rp 0 / mo', desc: 'Includes 1 brand and 20 monthly posts.' },
  { id: 'STARTER', label: 'Starter', price: 'Rp 285k ($18) / mo', desc: 'Up to 5 brands, report exports, and SmartLinks.' },
  { id: 'ADVANCED', label: 'Advanced', price: 'Rp 715k ($45) / mo', desc: 'Up to 15 brands, PPTX decks, and Ads ROAS.' },
  {
    id: 'ENTERPRISE_CUSTOM',
    label: 'Enterprise Custom',
    price: 'Rp 2.35M ($149) / mo',
    desc: 'Up to 50 brands with White Label branding and team RBAC.'
  }
] as const;

function isPermanentActivePlan(planId: string): boolean {
  if (store.user?.plan !== planId) return false;
  if (store.user?.trialActive && planId !== 'FREE') return false;
  return true;
}

async function syncInputs(): Promise<void> {
  nameInput.value = store.user?.name || '';
  emailInput.value = store.user?.email || '';
  const [tokRes, ordRes] = await Promise.all([
    apiRequest<{
      data: { token: string; totpEnabled: boolean; approvedMcpScopes: string[] };
    }>('/api/v2/settings/users/tokens/current'),
    apiRequest<{ data: OrderRow[] }>('/api/v2/billing/orders').catch(() => ({ data: [] }))
  ]);
  apiToken.value = tokRes.data.token;
  totpEnabled.value = tokRes.data.totpEnabled;
  approvedScopes.value = tokRes.data.approvedMcpScopes;
  paymentOrders.value = ordRes.data;
}

async function saveProfile(): Promise<void> {
  saving.value = true;
  savedMsg.value = '';
  errMsg.value = '';
  try {
    const payload: Record<string, string> = {
      name: nameInput.value,
      email: emailInput.value
    };
    if (newPasswordInput.value) {
      payload.currentPassword = currentPasswordInput.value;
      payload.newPassword = newPasswordInput.value;
    }
    await apiRequest('/api/v2/settings/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    await store.bootstrap();
    savedMsg.value = payload.newPassword
      ? 'Account profile and password updated.'
      : 'Account profile updated.';
  } catch (err) {
    errMsg.value = err instanceof Error ? err.message : 'Unable to update profile.';
  } finally {
    saving.value = false;
  }
}

async function startCheckout(planId: string): Promise<void> {
  saving.value = true;
  savedMsg.value = '';
  errMsg.value = '';
  try {
    const res = await apiRequest<{
      data: {
        activatedImmediately: boolean;
        order: { checkoutUrl: string | null; orderId: string };
      };
    }>('/api/v2/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        plan: planId,
        provider: paymentProvider.value,
        couponCode: couponCode.value || undefined
      })
    });
    if (res.data.activatedImmediately) {
      await store.bootstrap();
      await syncInputs();
      savedMsg.value = `Subscription updated to ${planId}.`;
    } else if (res.data.order.checkoutUrl) {
      window.location.href = res.data.order.checkoutUrl;
    }
  } catch (err) {
    errMsg.value = err instanceof Error ? err.message : 'Unable to start checkout.';
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

async function beginTotpSetup(): Promise<void> {
  errMsg.value = '';
  const res = await apiRequest<{ data: { secret: string; otpauthUri: string } }>(
    '/api/v2/settings/users/totp/setup',
    { method: 'POST' }
  );
  totpSetupSecret.value = res.data.secret;
  totpSetupUri.value = res.data.otpauthUri;
}

async function confirmTotpEnable(): Promise<void> {
  errMsg.value = '';
  savedMsg.value = '';
  try {
    const res = await apiRequest<{ data: { totpEnabled: boolean } }>(
      '/api/v2/settings/users/totp/tokens',
      {
        method: 'POST',
        body: JSON.stringify({ code: totpVerifyCode.value })
      }
    );
    totpEnabled.value = res.data.totpEnabled;
    totpSetupSecret.value = '';
    totpVerifyCode.value = '';
    savedMsg.value = 'Two-factor authentication enabled.';
  } catch (err) {
    errMsg.value = err instanceof Error ? err.message : 'Invalid TOTP verification code.';
  }
}

async function disableTotp(): Promise<void> {
  const res = await apiRequest<{ data: { totpEnabled: boolean } }>(
    '/api/v2/settings/users/totp/tokens',
    {
      method: 'POST',
      body: JSON.stringify({ disable: true })
    }
  );
  totpEnabled.value = res.data.totpEnabled;
  savedMsg.value = 'Two-factor authentication disabled.';
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

.bm-checkout-bar {
  padding: 1.25rem;
}

.bm-trial-banner {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.bm-trial-sub {
  margin-top: 0.25rem;
  font-size: 0.9375rem;
}

.bm-checkout-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.bm-api-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-settings-card {
  padding: 1.375rem;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bm-wide-card {
  max-width: 100%;
}

.bm-settings-card h2 {
  font-size: 1.125rem;
}

.bm-form-stack,
.bm-totp-setup {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bm-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.bm-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.bm-plan-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
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
  font-size: 1.0625rem;
}

.bm-plan-price {
  font-size: 1.35rem;
  font-weight: 500;
}

.bm-plan-desc {
  font-size: 0.875rem;
  color: var(--bm-text-muted);
  margin-bottom: auto;
}

.bm-token-box {
  padding: 0.875rem 1rem;
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  border-radius: var(--bm-radius-md);
  overflow-x: auto;
}

.bm-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.375rem;
}

.bm-check-inline {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  font-weight: 500;
}

.bm-table-scroll {
  overflow-x: auto;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
}

.bm-table th,
.bm-table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}
</style>
