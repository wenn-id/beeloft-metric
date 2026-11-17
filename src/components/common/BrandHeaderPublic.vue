<template>
  <header class="bm-pub-header">
    <div class="bm-pub-header__inner">
      <router-link to="/" class="bm-pub-brand">
        <strong class="bm-pub-wordmark">BeeloftMetric</strong>
      </router-link>

      <button
        type="button"
        class="bm-pub-menu-btn"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        Menu
      </button>

      <nav class="bm-pub-nav" :class="{ 'bm-pub-nav--open': mobileOpen }" aria-label="Public navigation">
        <router-link to="/#capabilities" class="bm-pub-link" @click="mobileOpen = false">Capabilities</router-link>
        <router-link to="/pricing" class="bm-pub-link" @click="mobileOpen = false">Pricing</router-link>
        <router-link to="/legal" class="bm-pub-link" @click="mobileOpen = false">Privacy & Terms</router-link>
      </nav>

      <div class="bm-pub-actions" :class="{ 'bm-pub-actions--open': mobileOpen }">
        <template v-if="store.isAuthenticated">
          <router-link to="/evolution/brandSummary" class="bm-pub-cta" @click="mobileOpen = false">
            Open workspace
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="bm-pub-link" @click="mobileOpen = false">Sign in</router-link>
          <router-link to="/register" class="bm-pub-cta" @click="mobileOpen = false">
            Create free workspace
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAppStore } from '@/stores/appStore';

const store = useAppStore();
const mobileOpen = ref(false);
</script>

<style scoped>
.bm-pub-header {
  background: var(--bm-chrome-bg);
  border: none;
  box-shadow: none;
}

.bm-pub-header__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bm-pub-brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  min-height: 44px;
}

.bm-pub-wordmark {
  font-family: var(--font-signifier);
  font-weight: 400;
  font-size: 24px;
  letter-spacing: -0.02em;
  color: var(--bm-text);
}

.bm-pub-nav,
.bm-pub-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.bm-pub-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 2px 0;
  text-decoration: none;
  font-family: var(--font-sohne);
  font-weight: 400;
  font-size: 16px;
  color: var(--bm-text);
}

.bm-pub-link:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.bm-pub-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: var(--radius-buttons);
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border: 1px solid var(--bm-brand);
  font-family: var(--font-sohne);
  font-weight: 400;
  font-size: 16px;
  text-decoration: none;
}

.bm-pub-cta:hover {
  background: var(--bm-brand-hover);
}

.bm-pub-menu-btn {
  display: none;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-text);
  background: transparent;
  font-weight: 400;
}

@media (max-width: 768px) {
  .bm-pub-menu-btn {
    display: inline-flex;
    align-items: center;
  }

  .bm-pub-nav,
  .bm-pub-actions {
    display: none;
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid var(--bm-divider);
  }

  .bm-pub-nav--open,
  .bm-pub-actions--open {
    display: flex;
  }
}
</style>
