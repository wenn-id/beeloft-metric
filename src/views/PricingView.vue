<template>
  <div class="bm-pricing-page">
    <BrandHeaderPublic />

    <main class="bm-pricing-main">
      <div class="bm-pricing-head">
        <h1>Plan Comparison Matrix</h1>
        <p>
          Select how many brands you manage to see which tier fits cleanly, then compare limits across
          all four tiers.
        </p>
      </div>

      <section class="bm-card bm-estimator" aria-label="Brand allowance estimator">
        <div class="bm-estimator__row">
          <div>
            <label for="brand-count-range" class="bm-label">
              Number of managed brands: <strong class="tabular-nums">{{ desiredBrands }}</strong>
            </label>
            <input
              id="brand-count-range"
              v-model.number="desiredBrands"
              type="range"
              min="1"
              max="25"
              class="bm-range"
            />
          </div>
          <div class="bm-estimator__match">
            <span>Matching Tier</span>
            <strong>{{ matchedTier.name }} ({{ matchedTier.price }})</strong>
            <router-link :to="`/register?plan=${matchedTier.id}`" class="bm-cta-link">
              Start on {{ matchedTier.name }}
            </router-link>
          </div>
        </div>
      </section>

      <section class="bm-table-wrap bm-card" aria-label="Four-tier feature matrix">
        <table class="bm-matrix-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th v-for="t in tiers" :key="t.id" :class="{ 'bm-col-active': matchedTier.id === t.id }">
                {{ t.name }}
                <small>{{ t.price }}</small>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Managed brands</td>
              <td v-for="t in tiers" :key="t.id" class="tabular-nums">{{ t.brandsLabel }}</td>
            </tr>
            <tr>
              <td>Monthly scheduled posts</td>
              <td v-for="t in tiers" :key="t.id" class="tabular-nums">{{ t.postsLabel }}</td>
            </tr>
            <tr>
              <td>SmartLinks & attribution logs</td>
              <td v-for="t in tiers" :key="t.id">{{ t.smartLinks }}</td>
            </tr>
            <tr>
              <td>PDF and PPTX report exports</td>
              <td v-for="t in tiers" :key="t.id">{{ t.reports }}</td>
            </tr>
            <tr>
              <td>Ad platform integrations</td>
              <td v-for="t in tiers" :key="t.id">{{ t.ads }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="bm-faq">
        <h2>Common questions</h2>
        <details class="bm-card bm-faq-item">
          <summary>Can I test BeeloftMetric with zero connected channels first?</summary>
          <p>
            Yes. Every account includes an unconfigured Empty brand alongside the [SAMPLE DATA] studio
            workspace so you can verify connection flows before adding real credentials.
          </p>
        </details>
        <details class="bm-card bm-faq-item">
          <summary>How is attribution stored in this build?</summary>
          <p>
            Navigation and campaign query parameters trigger POST /s/session and POST /s against the
            local Fastify server, issuing an _bm cookie and saving records to server/data/db.json.
          </p>
        </details>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';

const desiredBrands = ref(5);

const tiers = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0 / mo',
    maxBrands: 1,
    brandsLabel: '1 brand',
    postsLabel: '20 posts / mo',
    smartLinks: 'Basic page',
    reports: 'Unavailable',
    ads: 'View only'
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: '$18 / mo',
    maxBrands: 5,
    brandsLabel: 'Up to 5 brands',
    postsLabel: '2,000 posts / mo',
    smartLinks: 'Full editor + clicks',
    reports: 'PDF exports',
    ads: 'Meta, Google, TikTok'
  },
  {
    id: 'ADVANCED',
    name: 'Advanced',
    price: '$45 / mo',
    maxBrands: 15,
    brandsLabel: 'Up to 15 brands',
    postsLabel: 'Unlimited',
    smartLinks: 'Custom styling + analytics',
    reports: 'PDF + PPTX + Templates',
    ads: 'Full attribution + ROAS'
  },
  {
    id: 'ENTERPRISE_CUSTOM',
    name: 'Enterprise Custom',
    price: 'Custom',
    maxBrands: 50,
    brandsLabel: '50+ brands',
    postsLabel: 'Unlimited',
    smartLinks: 'Unlimited + API',
    reports: 'White-label exports',
    ads: 'All platforms + team RBAC'
  }
];

const matchedTier = computed(() => {
  return tiers.find((t) => desiredBrands.value <= t.maxBrands) ?? tiers[tiers.length - 1];
});
</script>

<style scoped>
.bm-pricing-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bm-pricing-head h1 {
  font-size: clamp(36px, 4.5vw, 64px);
  letter-spacing: -0.96px;
  margin-bottom: 8px;
}

.bm-pricing-head p {
  color: var(--bm-text-muted);
  font-size: 17px;
}

.bm-estimator {
  padding: 24px;
}

.bm-estimator__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.bm-range {
  width: min(360px, 100%);
  accent-color: var(--color-sienna-brown);
  min-height: 44px;
}

.bm-estimator__match {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bm-estimator__match span {
  font-size: 13px;
  font-weight: 500;
  color: var(--bm-text-muted);
}

.bm-cta-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 20px;
  margin-top: 4px;
  border-radius: 9999px;
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  font-weight: 400;
  text-decoration: none;
  width: fit-content;
}

.bm-table-wrap {
  overflow-x: auto;
}

.bm-matrix-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

.bm-matrix-table th,
.bm-matrix-table td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--bm-divider);
}

.bm-matrix-table th small {
  display: block;
  font-weight: 500;
  color: var(--bm-text-muted);
}

.bm-col-active {
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
}

.bm-faq {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-faq-item {
  padding: 1rem 1.25rem;
}

.bm-faq-item summary {
  font-weight: 700;
  min-height: 36px;
  display: flex;
  align-items: center;
}

.bm-faq-item p {
  margin-top: 0.5rem;
  color: var(--bm-text-muted);
}
</style>
