<template>
  <AppShell>
    <div class="bm-aff-page">
      <div class="bm-page-head">
        <div>
          <h1>Affiliation Program</h1>
          <p class="bm-page-sub">
            Share referral links, monitor signups, inspect payout history, and update payout settings.
          </p>
        </div>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Affiliation tabs" />

      <p v-if="savedMsg" class="bm-saved-banner" role="status">{{ savedMsg }}</p>

      <template v-if="aff">
        <template v-if="activeTab === 'general' || activeTab === 'stats'">
          <div class="bm-kpi-grid">
            <article class="bm-card bm-kpi-card">
              <span>Commission Rate</span>
              <strong class="tabular-nums">{{ aff.commissionRatePct }}%</strong>
            </article>
            <article class="bm-card bm-kpi-card">
              <span>Referral Clicks</span>
              <strong class="tabular-nums">{{ aff.clicks }}</strong>
            </article>
            <article class="bm-card bm-kpi-card">
              <span>Signups / Paid</span>
              <strong class="tabular-nums">{{ aff.signups }} / {{ aff.paidConversions }}</strong>
            </article>
            <article class="bm-card bm-kpi-card">
              <span>Pending / Paid Payouts</span>
              <strong class="tabular-nums">${{ aff.pendingCommissionUsd }} / ${{ aff.paidCommissionUsd }}</strong>
            </article>
          </div>

          <section class="bm-card bm-ref-card">
            <h2>Your Referral Link</h2>
            <p class="bm-page-sub">Code: <strong>{{ aff.referralCode }}</strong></p>
            <div class="bm-token-box">
              <code>{{ aff.referralUrl }}</code>
            </div>
          </section>
        </template>

        <div v-else-if="activeTab === 'payments'" class="bm-card bm-table-scroll">
          <table class="bm-table">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in aff.payouts" :key="p.id">
                <td><strong>{{ p.id }}</strong></td>
                <td class="tabular-nums">{{ p.date }}</td>
                <td class="tabular-nums">${{ p.amountUsd }}</td>
                <td><BmBadge tone="success">{{ p.status }}</BmBadge></td>
              </tr>
            </tbody>
          </table>
        </div>

        <section v-else class="bm-card bm-ref-card">
          <h2>Payout Preferences</h2>
          <form class="bm-form-stack" @submit.prevent="savePayout">
            <div>
              <label for="aff-email" class="bm-label">Payout notification email</label>
              <input id="aff-email" v-model="payoutEmail" type="email" class="bm-input" required />
            </div>
            <div>
              <BmButton type="submit" variant="primary">Save payout email</BmButton>
            </div>
          </form>
        </section>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import { apiRequest } from '@/services/api';
import type { AffiliationState } from '@/types/api';

const tabs = [
  { id: 'general', label: 'General & Stats' },
  { id: 'payments', label: 'Payouts' },
  { id: 'settings', label: 'Settings' }
];

const activeTab = ref('general');
const aff = ref<AffiliationState | null>(null);
const payoutEmail = ref('');
const savedMsg = ref('');

async function loadAffiliation(): Promise<void> {
  const res = await apiRequest<{ data: AffiliationState }>('/api/v2/affiliation');
  aff.value = res.data;
  payoutEmail.value = res.data.payoutEmail;
}

async function savePayout(): Promise<void> {
  const res = await apiRequest<{ data: AffiliationState }>('/api/v2/affiliation/settings', {
    method: 'PATCH',
    body: JSON.stringify({ payoutEmail: payoutEmail.value })
  });
  aff.value = res.data;
  savedMsg.value = 'Affiliate payout settings saved.';
}

onMounted(loadAffiliation);
</script>

<style scoped>
.bm-aff-page {
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
  font-size: 1.5rem;
}

.bm-ref-card {
  padding: 1.25rem;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-token-box {
  padding: 0.875rem;
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  border-radius: var(--bm-radius-md);
  overflow-x: auto;
}

.bm-table-scroll {
  overflow-x: auto;
  padding: 0.5rem;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 480px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
