<template>
  <div class="bm-pricing-page">
    <BrandHeaderPublic />

    <main class="bm-pricing-main">
      <div class="bm-pricing-head">
        <h1>Plan Comparison Matrix</h1>
        <p>
          Every new account starts with a 7-day Starter free trial. Compare limits across all four
          tiers and upgrade anytime with Midtrans (IDR) or Stripe (USD).
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
              Start 7-day free trial
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
              <td>SmartLinks (/bio/:slug) & tracker.js</td>
              <td v-for="t in tiers" :key="t.id">{{ t.smartLinks }}</td>
            </tr>
            <tr>
              <td>Report exports</td>
              <td v-for="t in tiers" :key="t.id">{{ t.reports }}</td>
            </tr>
            <tr>
              <td>OAuth2 & ad platform sync</td>
              <td v-for="t in tiers" :key="t.id">{{ t.ads }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="bm-faq">
        <h2>Product & Infrastructure Questions</h2>
        <details class="bm-card bm-faq-item">
          <summary>How does real-time website tracking work on external domains?</summary>
          <p>
            Each brand receives a unique <code>bm_trk_...</code> tracking key in Brand Connections.
            Adding the lightweight <code>tracker.js</code> snippet sends live pageviews, UTM campaign
            parameters, and Cloudflare country headers directly to your brand analytics.
          </p>
        </details>
        <details class="bm-card bm-faq-item">
          <summary>How is workspace data isolated and persisted?</summary>
          <p>
            Accounts authenticate with PBKDF2-SHA256 password hashes, optional RFC 6238 TOTP 2FA, and
            HttpOnly session cookies stored in Cloudflare D1 SQLite, with uploaded campaign media
            served through Cloudflare R2.
          </p>
        </details>
        <details class="bm-card bm-faq-item">
          <summary>Which payment methods are supported for plan upgrades?</summary>
          <p>
            Paid plans support Indonesian Rupiah checkout via Midtrans Snap (QRIS, Virtual Account,
            e-wallets, cards) as well as international USD payments via Stripe Checkout.
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
    price: 'Rp 0 / mo',
    maxBrands: 1,
    brandsLabel: '1 brand',
    postsLabel: '20 posts / mo',
    smartLinks: 'Public /bio/ + live clicks',
    reports: 'Web dashboard',
    ads: 'Web tracker + social OAuth'
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 'Rp 285k ($18) / mo',
    maxBrands: 5,
    brandsLabel: 'Up to 5 brands',
    postsLabel: '2,000 posts / mo',
    smartLinks: 'Custom themes + UTM',
    reports: 'PDF / TXT exports',
    ads: 'Meta, Google, TikTok'
  },
  {
    id: 'ADVANCED',
    name: 'Advanced',
    price: 'Rp 715k ($45) / mo',
    maxBrands: 15,
    brandsLabel: 'Up to 15 brands',
    postsLabel: 'Unlimited',
    smartLinks: 'Unlimited links + Studio',
    reports: 'PDF + PPTX + Custom templates',
    ads: 'Full attribution + ROAS'
  },
  {
    id: 'ENTERPRISE_CUSTOM',
    name: 'Enterprise Custom',
    price: 'Rp 2.35M ($149) / mo',
    maxBrands: 50,
    brandsLabel: 'Up to 50 brands',
    postsLabel: 'Unlimited',
    smartLinks: 'Unlimited + REST API',
    reports: 'White-label branding',
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
  box-shadow: var(--bm-shadow-btn-primary);
  font-weight: 500;
  text-decoration: none;
  width: fit-content;
}

.bm-table-wrap {
  overflow-x: auto;
}

.bm-matrix-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
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
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
}

.bm-col-active small {
  color: var(--bm-accent-soft-text);
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
  font-weight: 500;
  min-height: 36px;
  display: flex;
  align-items: center;
}

.bm-faq-item p {
  margin-top: 0.5rem;
  color: var(--bm-text-muted);
}
</style>
