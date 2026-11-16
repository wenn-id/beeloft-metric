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

        <p v-if="lastClickedNotice" class="bm-bio-notice" role="status">
          {{ lastClickedNotice }}
        </p>

        <div class="bm-bio-links">
          <button
            v-for="btn in activeButtons"
            :key="btn.id"
            type="button"
            class="bm-bio-btn"
            :style="{
              backgroundColor: smartLink.theme.buttonColor,
              color: smartLink.theme.buttonTextColor
            }"
            @click="handleButtonClick(btn)"
          >
            <span>{{ btn.label }}</span>
            <small class="tabular-nums">{{ btn.clicks }} clicks</small>
          </button>
        </div>

        <footer class="bm-bio-foot">
          <router-link to="/smartlink?blogId=8137744&userId=6401427">Edit in SmartLinks</router-link>
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
const lastClickedNotice = ref('');

const activeButtons = computed(
  () => smartLink.value?.buttons.filter((b) => b.active) ?? []
);

async function fetchBio(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  try {
    const slug = String(route.params.slug || 'beeloft-studio');
    const res = await apiRequest<{ data: SmartLink }>(`/api/v2/public/smart-links/${slug}`);
    smartLink.value = res.data;
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to load SmartLink.';
  } finally {
    loading.value = false;
  }
}

async function handleButtonClick(btn: SmartLinkButton): Promise<void> {
  if (!smartLink.value) return;
  const res = await apiRequest<{ ok: boolean; clicks: number }>(
    `/api/v2/public/smart-links/${smartLink.value.slug}/click`,
    {
      method: 'POST',
      body: JSON.stringify({ buttonId: btn.id })
    }
  );
  btn.clicks = res.clicks;
  lastClickedNotice.value = `Recorded click for "${btn.label}" (${btn.url}). Total: ${res.clicks}.`;
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
  background: var(--bm-chrome-bg);
  color: var(--bm-chrome-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.bm-bio-desc {
  color: var(--bm-text-muted);
}

.bm-bio-notice {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-size: 0.8125rem;
  text-align: left;
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
}

.bm-bio-btn small {
  opacity: 0.85;
  font-weight: 600;
}

.bm-bio-foot {
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.bm-bio-foot a {
  color: var(--bm-accent);
  font-weight: 700;
}
</style>
