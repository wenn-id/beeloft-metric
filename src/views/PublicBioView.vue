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

      <SmartLinkBio v-else :link="smartLink" class="bm-bio-card" @link-click="recordButtonClick" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SmartLinkBio from '@/components/common/SmartLinkBio.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import { apiRequest } from '@/services/api';
import type { SmartLink, SmartLinkButton } from '@/types/api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMsg = ref('');
const smartLink = ref<SmartLink | null>(null);

async function fetchBio(): Promise<void> {
  loading.value = true;
  errorMsg.value = '';
  try {
    const slug = String(route.params.slug || '');
    const res = await apiRequest<{ data: SmartLink }>(`/api/v2/public/smart-links/${encodeURIComponent(slug)}`);
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
  void apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ buttonId: btn.id }),
    keepalive: true
  }).catch(() => undefined);
}

watch(() => route.params.slug, fetchBio, { immediate: true });
</script>

<style scoped>
.bm-bio-page {
  min-height: 100dvh;
  padding: clamp(26px, 7vw, 88px) 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.bm-bio-container {
  width: min(550px, 100%);
}

.bm-bio-card {
  padding: clamp(22px, 4vw, 42px);
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 20px;
}
</style>
