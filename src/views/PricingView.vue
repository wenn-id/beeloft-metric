<template>
  <div class="bm-public-page bm-pricing-page">
    <a href="#pricing-main" class="bm-skip-link">Skip to content</a>
    <BrandHeaderPublic class="bm-pub-header--editorial" />

    <main id="pricing-main" tabindex="-1">
      <header class="bm-pricing-intro">
        <div class="bm-pricing-container">
          <h1>Plans that fit <em>your team.</em></h1>
          <p>Every new account starts with a 7-day Starter trial. Compare plans by the brands you manage.</p>
        </div>
      </header>

      <div class="bm-pricing-container bm-pricing-content">
        <section class="bm-estimator" aria-label="Brand allowance estimator">
          <div>
            <label for="brand-count-range">How many brands do you manage?</label>
            <div class="bm-estimator-range">
              <input
                id="brand-count-range"
                v-model.number="desiredBrands"
                type="range"
                min="1"
                max="25"
                class="bm-range"
              />
              <output for="brand-count-range" class="tabular-nums">{{ desiredBrands }}</output>
            </div>
          </div>
          <div class="bm-estimator-match">
            <p aria-live="polite">Matching plan <strong>{{ matchedTier.name }}</strong></p>
            <router-link :to="`/register?plan=${matchedTier.id}`" class="bm-public-button bm-public-button--primary">
              Start 7-day free trial
            </router-link>
          </div>
        </section>

        <section aria-label="Available plans" class="bm-plan-grid">
          <article
            v-for="tier in tiers"
            :key="tier.id"
            class="bm-plan-card"
            :class="{ 'bm-plan-card--matched': matchedTier.id === tier.id }"
          >
            <h2>{{ tier.name }}</h2>
            <p class="bm-plan-price tabular-nums">{{ tier.price }} <span>/ month</span></p>
            <p v-if="tier.usd" class="bm-plan-conversion">{{ tier.usd }} / month in USD</p>
            <ul>
              <li>{{ tier.brandsLabel }}</li>
              <li>{{ tier.postsLabel }}</li>
              <li>{{ tier.reports }}</li>
            </ul>
            <router-link :to="`/register?plan=${tier.id}`" class="bm-public-button">
              Choose {{ tier.name }}
            </router-link>
          </article>
        </section>

        <section class="bm-pricing-section">
          <h2 id="compare-plans">Compare plans</h2>
          <p class="bm-scroll-hint">Swipe or scroll to compare all plans.</p>
          <div class="bm-table-wrap" role="region" aria-labelledby="compare-plans" tabindex="0">
            <table class="bm-matrix-table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th
                    v-for="tier in tiers"
                    :key="tier.id"
                    scope="col"
                    :class="{ 'bm-col-active': matchedTier.id === tier.id }"
                  >
                    {{ tier.name }}
                    <small>{{ tier.price }} / month</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Managed brands</th>
                  <td v-for="tier in tiers" :key="tier.id" class="tabular-nums">{{ tier.brandsLabel }}</td>
                </tr>
                <tr>
                  <th scope="row">Monthly scheduled posts</th>
                  <td v-for="tier in tiers" :key="tier.id" class="tabular-nums">{{ tier.postsLabel }}</td>
                </tr>
                <tr>
                  <th scope="row">SmartLinks (/bio/:slug) &amp; tracker.js</th>
                  <td v-for="tier in tiers" :key="tier.id">{{ tier.smartLinks }}</td>
                </tr>
                <tr>
                  <th scope="row">Report exports</th>
                  <td v-for="tier in tiers" :key="tier.id">{{ tier.reports }}</td>
                </tr>
                <tr>
                  <th scope="row">OAuth2 &amp; ad platform sync</th>
                  <td v-for="tier in tiers" :key="tier.id">{{ tier.ads }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="bm-pricing-section bm-faq">
          <h2>Plan questions</h2>
          <details class="bm-faq-item">
            <summary>How does real-time website tracking work on external domains?</summary>
            <p>
              Each brand receives a unique <code>bm_trk_...</code> tracking key in Brand Connections.
              Adding the lightweight <code>tracker.js</code> snippet sends live pageviews, UTM campaign
              parameters, and Cloudflare country headers directly to your brand analytics.
            </p>
          </details>
          <details class="bm-faq-item">
            <summary>How is workspace data isolated and persisted?</summary>
            <p>
              Accounts authenticate with PBKDF2-SHA256 password hashes, optional RFC 6238 TOTP 2FA, and
              HttpOnly session cookies stored in Cloudflare D1 SQLite, with uploaded campaign media
              served through Cloudflare R2.
            </p>
          </details>
          <details class="bm-faq-item">
            <summary>Which payment methods are supported for plan upgrades?</summary>
            <p>
              Paid plans support Indonesian Rupiah checkout via Midtrans Snap (QRIS, Virtual Account,
              e-wallets, cards) as well as international USD payments via Stripe Checkout.
            </p>
          </details>
        </section>
      </div>
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
    price: 'Rp 0',
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
    price: 'Rp 285k',
    usd: '$18',
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
    price: 'Rp 715k',
    usd: '$45',
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
    price: 'Rp 2.35M',
    usd: '$149',
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
.bm-pricing-container {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(18px, 3vw, 36px);
}

.bm-pricing-intro {
  padding-block: clamp(56px, 7vw, 96px) clamp(32px, 4vw, 54px);
  background:
    linear-gradient(0deg, var(--bm-bg), color-mix(in srgb, var(--bm-bg) 78%, transparent)),
    url('../assets/images/landing-ocean.webp') center 54% / cover;
  text-align: center;
}

.bm-pricing-intro h1,
.bm-pricing-section h2 {
  font-weight: 300;
  line-height: 1.02;
  letter-spacing: -0.05em;
}

.bm-pricing-intro h1 {
  font-size: clamp(3.1rem, 7.6vw, 6.25rem);
}

.bm-pricing-intro p {
  max-width: 52ch;
  margin: 16px auto 0;
  color: var(--bm-text-muted);
}

.bm-pricing-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding-bottom: clamp(48px, 7vw, 96px);
}

.bm-estimator,
.bm-plan-card,
.bm-table-wrap {
  min-width: 0;
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-cards);
  background: var(--bm-elevated);
}

.bm-estimator {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px 32px;
  padding: 20px clamp(16px, 2.4vw, 32px);
}

.bm-estimator label {
  font-size: 14px;
}

.bm-estimator-range,
.bm-estimator-match {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bm-estimator-range {
  max-width: 500px;
}

.bm-range {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  accent-color: var(--bm-accent);
}

.bm-estimator-range output {
  min-width: 38px;
  padding: 4px 6px;
  border: 1px solid var(--bm-divider);
  border-radius: 6px;
  text-align: center;
  font-family: var(--font-data);
  font-size: 13px;
}

.bm-estimator-match {
  flex-wrap: wrap;
  justify-content: space-between;
}

.bm-estimator-match p {
  display: grid;
  gap: 2px;
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 11px;
  text-transform: uppercase;
}

.bm-estimator-match strong {
  color: var(--bm-text);
  font-family: var(--font-sohne);
  font-size: 14px;
  font-weight: 500;
  text-transform: none;
}

.bm-plan-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.bm-plan-card {
  display: flex;
  flex-direction: column;
  padding: clamp(16px, 2vw, 26px);
}

.bm-plan-card--matched {
  --bm-text: var(--bm-category-text);
  --bm-text-muted: var(--bm-category-muted);
  --bm-divider: #afa4d9;
  --bm-control-border: #756796;
  --bm-surface: #c4baf7;
  --bm-accent: #4b49aa;

  border-color: transparent;
  background: var(--bm-category-bg);
  color: var(--bm-text);
}

.bm-plan-card h2 {
  margin-bottom: 12px;
  font-family: var(--font-sohne);
  font-size: 14px;
  font-weight: 500;
}

.bm-plan-price {
  font-family: var(--font-signifier);
  font-size: clamp(1.65rem, 2.65vw, 2.5rem);
  font-weight: 300;
  letter-spacing: -0.045em;
  line-height: 1.1;
}

.bm-plan-price span,
.bm-plan-conversion {
  font-family: var(--font-sohne);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--bm-text-muted);
}

.bm-plan-conversion {
  margin-top: 4px;
}

.bm-plan-card ul {
  margin: 20px 0;
  padding: 16px 0 0 18px;
  border-top: 1px solid var(--bm-divider);
  color: var(--bm-text-muted);
  font-size: 13px;
}

.bm-plan-card li + li {
  margin-top: 4px;
}

.bm-plan-card .bm-public-button {
  margin-top: auto;
}

.bm-pricing-section {
  margin-top: clamp(24px, 4vw, 52px);
}

.bm-pricing-section h2 {
  margin-bottom: 18px;
  font-size: clamp(2.25rem, 4.3vw, 3.75rem);
}

.bm-table-wrap {
  overflow-x: auto;
}

.bm-matrix-table {
  width: 100%;
  min-width: 760px;
  border-spacing: 0;
  font-size: 14px;
}

.bm-matrix-table th,
.bm-matrix-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
}

.bm-matrix-table tbody tr:last-child > * {
  border-bottom: 0;
}

.bm-matrix-table thead th {
  background: var(--bm-subtle);
}

.bm-matrix-table td {
  color: var(--bm-text-muted);
}

.bm-matrix-table th small {
  display: block;
  color: var(--bm-text-muted);
  font-weight: 400;
}

.bm-matrix-table th.bm-col-active {
  background: var(--bm-accent-soft);
}

.bm-scroll-hint {
  display: none;
  margin-bottom: 8px;
  color: var(--bm-text-muted);
  font-size: 13px;
}

.bm-faq-item {
  border-top: 1px solid var(--bm-divider);
}

.bm-faq-item:last-child {
  border-bottom: 1px solid var(--bm-divider);
}

.bm-faq-item summary {
  min-height: 48px;
  padding-block: 13px;
  font-size: 15px;
}

.bm-faq-item p {
  max-width: 72ch;
  padding: 0 0 16px;
  color: var(--bm-text-muted);
  font-size: 14px;
}

@media (max-width: 920px) {
  .bm-plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .bm-scroll-hint {
    display: block;
  }

  .bm-matrix-table th:first-child {
    position: sticky;
    left: 0;
    width: 125px;
    border-right: 1px solid var(--bm-divider);
    background: var(--bm-elevated);
    font-size: 13px;
  }
}

@media (max-width: 580px) {
  .bm-estimator,
  .bm-plan-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
