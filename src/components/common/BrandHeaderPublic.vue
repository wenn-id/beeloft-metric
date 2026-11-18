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
        <button
          type="button"
          class="bm-pub-theme bm-transition"
          :aria-label="`Switch to ${store.theme === 'light' ? 'dark' : 'light'} theme`"
          @click="store.toggleTheme()"
        >
          {{ store.theme === 'light' ? 'Dark' : 'Light' }}
        </button>

        <template v-if="store.isAuthenticated">
          <router-link to="/evolution/brandSummary" class="bm-pub-cta bm-transition" @click="mobileOpen = false">
            Open workspace
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="bm-pub-link" @click="mobileOpen = false">Sign in</router-link>
          <router-link to="/register" class="bm-pub-cta bm-transition" @click="mobileOpen = false">
            Start 7-day free trial
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
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bm-chrome-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--bm-divider);
}

.bm-pub-header__inner {
  max-width: 1220px;
  margin: 0 auto;
  padding: 14px 20px;
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
  gap: 16px;
  flex-wrap: wrap;
}

.bm-pub-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 2px 4px;
  text-decoration: none;
  font-family: var(--font-sohne);
  font-weight: 500;
  font-size: 15px;
  color: var(--bm-text);
}

.bm-pub-link:hover {
  color: var(--bm-accent);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.bm-pub-theme {
  min-height: 44px;
  padding: 0 14px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-control-border);
  background: var(--bm-elevated);
  color: var(--bm-text);
  font-size: 14px;
  font-weight: 500;
}

.bm-pub-theme:hover {
  background: var(--bm-surface);
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
  box-shadow: var(--bm-shadow-btn-primary);
  font-family: var(--font-sohne);
  font-weight: 500;
  font-size: 15px;
  text-decoration: none;
}

.bm-pub-cta:hover {
  background: var(--bm-brand-hover);
  transform: translateY(-1px);
}

.bm-pub-cta:active {
  transform: translateY(2px);
  box-shadow: var(--bm-shadow-btn-primary-active);
}

.bm-pub-menu-btn {
  display: none;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-control-border);
  background: var(--bm-elevated);
  font-weight: 500;
}

@media (max-width: 820px) {
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
