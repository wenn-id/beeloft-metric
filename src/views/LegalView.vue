<template>
  <div>
    <BrandHeaderPublic />
    <main class="bm-legal-main">
      <h1>Terms of Service and Privacy Policy</h1>

      <section class="bm-card bm-legal-card">
        <h2>1. Workspace Data & Multi-Tenant Isolation</h2>
        <p>
          BeeloftMetric (<code>beeloftmetric.biz.id</code>) isolates brand profiles, scheduled posts,
          SmartLinks, inbox threads, and analytics records per authenticated account on Cloudflare D1
          storage. Account passwords are salted and hashed with PBKDF2-SHA256 (100,000 iterations),
          and sessions use HttpOnly cookies.
        </p>
      </section>

      <section class="bm-card bm-legal-card">
        <h2>2. First-Party Web Attribution & Cookies</h2>
        <p>
          First-party attribution uses the <code>_bm</code> cookie and optional
          <code>tracker.js</code> embed script solely to associate page views, outbound link clicks,
          and UTM campaign parameters with the brand workspace configured by the site owner. Country
          level aggregation uses standard Cloudflare edge request metadata without storing raw visitor
          personal identities.
        </p>
      </section>

      <section class="bm-card bm-legal-card">
        <h2>3. Connected OAuth Channels & Revocation</h2>
        <p>
          When you connect social accounts via OAuth2 (Meta, TikTok, Google/YouTube, X, LinkedIn),
          tokens are used exclusively to synchronize metrics, receive inbox webhooks, and publish
          posts scheduled by your workspace members. Disconnecting a channel immediately deletes its
          stored credential from the database.
        </p>
        <router-link to="/">Return to BeeloftMetric home</router-link>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
</script>

<style scoped>
.bm-legal-main {
  max-width: 780px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-legal-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bm-legal-card a {
  color: var(--bm-accent);
  font-weight: 500;
  width: fit-content;
}
</style>
