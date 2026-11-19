<template>
  <div class="bm-public-page">
    <a href="#legal-main" class="bm-skip-link">Skip to content</a>
    <BrandHeaderPublic class="bm-pub-header--editorial" />
    <main id="legal-main" class="bm-legal-main" tabindex="-1">
      <h1>Terms of Service and <em>Privacy Policy</em></h1>

      <div class="bm-legal-layout">
        <nav class="bm-legal-nav" aria-label="On this page">
          <p>On this page</p>
          <a href="#workspace-data">Workspace data</a>
          <a href="#attribution-cookies">Web attribution &amp; cookies</a>
          <a href="#connected-channels">Connected OAuth channels</a>
        </nav>
        <article class="bm-legal-document">
          <section id="workspace-data" class="bm-legal-section">
            <h2>1. Workspace Data & Multi-Tenant Isolation</h2>
            <p>
              BeeloftMetric (<code>beeloftmetric.biz.id</code>) isolates brand profiles, scheduled posts,
              SmartLinks, inbox threads, and analytics records per authenticated account on Cloudflare D1
              storage. Account passwords are salted and hashed with PBKDF2-SHA256 (100,000 iterations),
              and sessions use HttpOnly cookies.
            </p>
          </section>

          <section id="attribution-cookies" class="bm-legal-section">
            <h2>2. First-Party Web Attribution & Cookies</h2>
            <p>
              First-party attribution uses the <code>_bm</code> cookie and optional
              <code>tracker.js</code> embed script solely to associate page views, outbound link clicks,
              and UTM campaign parameters with the brand workspace configured by the site owner. Country
              level aggregation uses standard Cloudflare edge request metadata without storing raw visitor
              personal identities.
            </p>
          </section>

          <section id="connected-channels" class="bm-legal-section">
            <h2>3. Connected OAuth Channels & Revocation</h2>
            <p>
              When you connect social accounts via OAuth2 (Meta, TikTok, Google/YouTube, X, LinkedIn),
              tokens are used exclusively to synchronize metrics, receive inbox webhooks, and publish
              posts scheduled by your workspace members. Disconnecting a channel immediately deletes its
              stored credential from the database.
            </p>
          </section>
          <router-link to="/" class="bm-public-button">Return to BeeloftMetric home</router-link>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
</script>

<style scoped>
.bm-legal-main {
  max-width: 1200px;
  margin-inline: auto;
  padding: clamp(50px, 7vw, 96px) clamp(18px, 3vw, 36px);
}

.bm-legal-main h1 {
  max-width: 17ch;
  margin-bottom: clamp(28px, 4vw, 56px);
  font-size: clamp(2.7rem, 6.3vw, 5.6rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.05em;
}

.bm-legal-layout {
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) minmax(0, 3fr);
  align-items: start;
  gap: 18px;
}

.bm-legal-nav,
.bm-legal-document {
  min-width: 0;
  padding: clamp(18px, 2.7vw, 38px);
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-cards);
  background: var(--bm-elevated);
}

.bm-legal-nav {
  position: sticky;
  top: 88px;
  display: grid;
  padding: 16px;
}

.bm-legal-nav p {
  margin: 0 0 8px;
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 11px;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.bm-legal-nav a {
  display: flex;
  align-items: center;
  min-height: 44px;
  border-top: 1px solid var(--bm-divider);
  font-size: 14px;
  text-underline-offset: 3px;
}

.bm-legal-document {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

.bm-legal-section {
  width: 100%;
  scroll-margin-top: 92px;
}

.bm-legal-section + .bm-legal-section {
  padding-top: 24px;
  border-top: 1px solid var(--bm-divider);
}

.bm-legal-section h2 {
  margin-bottom: 12px;
  font-size: clamp(1.5rem, 2.8vw, 2.1rem);
  font-weight: 300;
  letter-spacing: -0.025em;
}

.bm-legal-section p {
  max-width: 72ch;
  color: var(--bm-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

@media (max-width: 740px) {
  .bm-legal-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .bm-legal-nav {
    position: static;
  }
}
</style>
