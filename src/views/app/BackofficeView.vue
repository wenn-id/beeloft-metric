<template>
  <AppShell>
    <div class="bm-bo-page">
      <div class="bm-page-head">
        <div>
          <h1>Operator Backoffice</h1>
          <p class="bm-page-sub">
            Internal administration console covering Feature Flags, Coupons, Deleted Brands,
            Invoices, API Quota, and Build metadata.
          </p>
        </div>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Backoffice modules" />

      <template v-if="overview">
        <!-- Tab 1: Feature Flags -->
        <section v-if="activeTab === 'feature-flags'" class="bm-bo-grid">
          <article
            v-for="(enabled, flagKey) in overview.featureFlags"
            :key="flagKey"
            class="bm-card bm-bo-card"
          >
            <div class="bm-bo-card__head">
              <strong>{{ flagKey }}</strong>
              <BmBadge :tone="enabled ? 'success' : 'neutral'">
                {{ enabled ? 'TRUE' : 'FALSE' }}
              </BmBadge>
            </div>
            <BmButton variant="secondary" size="sm" @click="toggleFlag(String(flagKey))">
              Toggle flag
            </BmButton>
          </article>
        </section>

        <!-- Tab 2: Coupons -->
        <template v-else-if="activeTab === 'coupons-list'">
          <div class="bm-card bm-bo-form-card">
            <h2>Issue Discount Coupon</h2>
            <form class="bm-bo-form" @submit.prevent="createCoupon">
              <div>
                <label for="cpn-code" class="bm-label">Code</label>
                <input id="cpn-code" v-model="cpnCode" type="text" class="bm-input" placeholder="WELCOME30" required />
              </div>
              <div>
                <label for="cpn-pct" class="bm-label">Discount %</label>
                <input id="cpn-pct" v-model.number="cpnPct" type="number" min="5" max="90" class="bm-input" required />
              </div>
              <div>
                <label for="cpn-plan" class="bm-label">Target plan</label>
                <select id="cpn-plan" v-model="cpnPlan" class="bm-select">
                  <option value="STARTER">STARTER</option>
                  <option value="ADVANCED">ADVANCED</option>
                  <option value="ENTERPRISE_CUSTOM">ENTERPRISE_CUSTOM</option>
                </select>
              </div>
              <BmButton type="submit" variant="primary">Create coupon</BmButton>
            </form>
          </div>

          <div class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Plan Target</th>
                  <th>Redemptions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in overview.coupons" :key="c.id">
                  <td><strong>{{ c.code }}</strong></td>
                  <td class="tabular-nums">{{ c.discountPct }}%</td>
                  <td>{{ c.planTarget }}</td>
                  <td class="tabular-nums">{{ c.redemptions }} / {{ c.maxRedemptions }}</td>
                  <td><BmBadge :tone="c.active ? 'success' : 'neutral'">{{ c.active ? 'Active' : 'Inactive' }}</BmBadge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Tab 3: Restore Profiles & Users Search -->
        <template v-else-if="activeTab === 'restoreProfiles'">
          <section class="bm-card bm-bo-form-card">
            <h2>Active Operator Accounts</h2>
            <div class="bm-table-scroll">
              <table class="bm-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Plan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in overview.usersList" :key="u.userId">
                    <td class="tabular-nums">{{ u.userId }}</td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.name }}</td>
                    <td><BmBadge tone="accent">{{ u.plan }}</BmBadge></td>
                    <td><BmBadge tone="success">{{ u.status }}</BmBadge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="bm-card bm-bo-form-card">
            <h2>Deleted Brands Recovery</h2>
            <p v-if="overview.deletedBrands.length === 0" class="bm-page-sub">
              No soft-deleted brands pending recovery.
            </p>
            <div v-else class="bm-bo-grid">
              <article v-for="db in overview.deletedBrands" :key="db.blogId" class="bm-card bm-bo-card">
                <strong>{{ db.name }} (ID: {{ db.blogId }})</strong>
                <BmButton variant="primary" size="sm" @click="restoreBrand(db.blogId)">Restore brand</BmButton>
              </article>
            </div>
          </section>
        </template>

        <!-- Tab 4: Invoices, API Consumption & Build -->
        <template v-else>
          <div class="bm-bo-grid">
            <article class="bm-card bm-bo-card">
              <h2>API Consumption (Today)</h2>
              <strong class="bm-big-num tabular-nums">
                {{ overview.apiConsumption.callsToday }} / {{ overview.apiConsumption.quotaPerDay.toLocaleString() }}
              </strong>
              <BmProgressBar :value="overview.apiConsumption.callsToday" :max="overview.apiConsumption.quotaPerDay" />
            </article>

            <article class="bm-card bm-bo-card">
              <h2>Build & Parity Info</h2>
              <p>App Version: <strong>{{ overview.buildInfo.version }}</strong></p>
              <p>Metricool Reference Build: <code>{{ overview.buildInfo.referenceBuild }}</code></p>
              <p>Runtime: <code>{{ overview.buildInfo.runtime }}</code></p>
            </article>
          </div>

          <div class="bm-card bm-table-scroll">
            <table class="bm-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in overview.invoices" :key="inv.id">
                  <td><strong>{{ inv.id }}</strong></td>
                  <td class="tabular-nums">{{ inv.date }}</td>
                  <td>{{ inv.customerEmail }}</td>
                  <td>{{ inv.plan }}</td>
                  <td class="tabular-nums">${{ inv.amountUsd }}</td>
                  <td><BmBadge tone="success">{{ inv.status }}</BmBadge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmProgressBar from '@/components/common/designSystem/atoms/BmProgressBar.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type { BackofficeOverview } from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'feature-flags', label: 'Feature Flags' },
  { id: 'coupons-list', label: 'Coupons' },
  { id: 'restoreProfiles', label: 'Users & Restore' },
  { id: 'build', label: 'Invoices, API & Build' }
];

function tabFromPath(p: string): string {
  if (p.includes('coupons')) return 'coupons-list';
  if (p.includes('restore') || p.includes('user-search')) return 'restoreProfiles';
  if (p.includes('invoices') || p.includes('api-consumption') || p.includes('build')) return 'build';
  return 'feature-flags';
}

const activeTab = ref(tabFromPath(route.path));
const overview = ref<BackofficeOverview | null>(null);
const cpnCode = ref('');
const cpnPct = ref(20);
const cpnPlan = ref('STARTER');

async function loadBackoffice(): Promise<void> {
  const res = await apiRequest<{ data: BackofficeOverview }>('/api/v2/backoffice/overview');
  overview.value = res.data;
}

async function toggleFlag(key: string): Promise<void> {
  await apiRequest(`/api/v2/backoffice/feature-flags/${key}`, { method: 'PATCH' });
  await store.bootstrap();
  await loadBackoffice();
}

async function createCoupon(): Promise<void> {
  await apiRequest('/api/v2/backoffice/coupons', {
    method: 'POST',
    body: JSON.stringify({ code: cpnCode.value, discountPct: cpnPct.value, planTarget: cpnPlan.value })
  });
  cpnCode.value = '';
  await loadBackoffice();
}

async function restoreBrand(blogId: number): Promise<void> {
  await apiRequest(`/api/v2/backoffice/restore-brand/${blogId}`, { method: 'POST' });
  await store.bootstrap();
  await loadBackoffice();
}

watch(() => route.path, (p) => {
  activeTab.value = tabFromPath(p);
});

watch(activeTab, (t) => {
  const target = `/backoffice/${t}`;
  if (route.path !== target) {
    router.replace({ path: target, query: route.query });
  }
});

onMounted(loadBackoffice);
</script>

<style scoped>
.bm-bo-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-page-sub {
  color: var(--bm-text-muted);
}

.bm-bo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.bm-bo-card,
.bm-bo-form-card {
  padding: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-bo-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.bm-bo-form {
  display: grid;
  grid-template-columns: 1fr 130px 210px auto;
  gap: 0.75rem;
  align-items: end;
}

.bm-big-num {
  font-size: 1.5rem;
}

.bm-table-scroll {
  overflow-x: auto;
  padding: 0.5rem;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 580px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

@media (max-width: 820px) {
  .bm-bo-form {
    grid-template-columns: 1fr;
  }
}
</style>
