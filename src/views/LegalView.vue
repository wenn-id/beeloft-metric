<template>
  <div>
    <BrandHeaderPublic />
    <main class="bm-legal-main">
      <h1>Terms of Service and Privacy Notice</h1>
      <section class="bm-card bm-legal-card">
        <h2>Local Data & Attribution Storage</h2>
        <p>
          BeeloftMetric stores workspace configuration, scheduled posts, SmartLink edits, and
          attribution events inside local repository storage (<code>server/data/db.json</code>).
        </p>
        <p>
          Session tracking sets a local <code>_bm</code> cookie strictly to correlate route transitions
          and campaign query parameters inside this environment. No third-party external telemetry
          services receive data from this build.
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
  font-weight: 700;
  width: fit-content;
}
</style>
