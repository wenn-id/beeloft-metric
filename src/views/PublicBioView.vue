<template>
  <div class="bm-bio-page" :style="{ backgroundColor: smartLink?.theme.backgroundColor || '#ffffff' }">
    <main class="bm-bio-container">
      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading SmartLink"
        description="Fetching public bio profile and link buttons."
      />

      <BmStateView
        v-else-if="errorMsg || !smartLink"
        kind="error"
        title="SmartLink not found"
        :description="errorMsg || 'This bio URL does not map to a published BeeloftMetric SmartLink.'"
        action-label="Back to BeeloftMetric"
        @action="router.push('/')"
      />

      <section v-else class="bm-bio-card bm-artifact">
        <div class="bm-bio-avatar" aria-hidden="true">{{ smartLink.title.slice(0, 2).toUpperCase() }}</div>
        <h1>{{ smartLink.title }}</h1>
        <p class="bm-bio-desc">{{ smartLink.description }}</p>

        <div class="bm-bio-links">
          <a
            v-for="btn in activeButtons"
            :key="btn.id"
            :href="btn.url"
            target="_blank"
            rel="noopener noreferrer"
            class="bm-bio-btn"
            :style="{
              backgroundColor: smartLink.theme.buttonColor,
              color: smartLink.theme.buttonTextColor
            }"
            @click="recordButtonClick(btn)"
          >
            <span>{{ btn.label }}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        <footer class="bm-bio-foot">
          <router-link to="/">Powered by BeeloftMetric</router-link>
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import { apiRequest } from '@/services/api';
import type { SmartLink, SmartLinkButton } from '@/types/api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMsg = ref('');
const smartLink = ref<SmartLink | null>(null);

const activeButtons = computed(
  () => smartLink.value?.buttons.filter((b) => b.active) ?? []
);

async function fetchBio(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  try {
    const slug = String(route.params.slug || '');
    const res = await apiRequest<{ data: SmartLink }>(`/api/v2/public/smart-links/${slug}`);
    smartLink.value = res.data;
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to load SmartLink.';
  } finally {
    loading.value = false;
  }
}

function recordButtonClick(btn: SmartLinkButton): void {
  if (!smartLink.value) return;
  const endpoint = `/api/v2/public/smart-links/${encodeURIComponent(smartLink.value.slug)}/click`;
  const payload = JSON.stringify({ buttonId: btn.id });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } else {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => undefined);
  }
  btn.clicks += 1;
}

onMounted(fetchBio);
</script>

<style scoped>
.bm-bio-page {
  min-height: 100dvh;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.bm-bio-container {
  width: min(460px, 100%);
}

.bm-bio-card {
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.875rem;
}

.bm-bio-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 1.25rem;
}

.bm-bio-desc {
  color: var(--bm-text-muted);
}

.bm-bio-links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.bm-bio-btn {
  width: 100%;
  min-height: 52px;
  padding: 0.75rem 1.25rem;
  border-radius: 9999px;
  border: 1px solid var(--color-ink-black);
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  text-align: left;
  text-decoration: none;
}

.bm-bio-foot {
  margin-top: 1rem;
  font-size: 0.8125rem;
}

.bm-bio-foot a {
  color: var(--bm-text-muted);
  text-decoration: none;
}

.bm-bio-foot a:hover {
  text-decoration: underline;
}
</style>
