<template>
  <div class="bm-public-page">
    <BrandHeaderPublic class="bm-pub-header--editorial" />
    <main class="bm-ps-main">
      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading public Studio report"
        description="Fetching shared blocks and summary telemetry."
      />
      <BmStateView
        v-else-if="errorMsg || !report"
        kind="error"
        title="Studio report unavailable"
        :description="errorMsg || 'This report link is invalid or unpublished.'"
        action-label="Return home"
        @action="router.push('/')"
      />
      <template v-else>
        <header class="bm-workspace-head">
          <div>
            <p class="bm-workspace-context">Shared Reporting Studio Deck</p>
            <h1>{{ report.title }}</h1>
            <p class="bm-ps-sub">Last updated: {{ report.updatedAt.slice(0, 16).replace('T', ' ') }}</p>
          </div>
          <router-link
            v-if="store.isAuthenticated"
            :to="`/reporting/studio?blogId=${report.blogId}`"
            class="bm-public-button"
          >
            Edit in Reporting Studio
          </router-link>
        </header>

        <div class="bm-ps-blocks">
          <section v-for="blk in report.blocks" :key="blk.id" class="bm-card bm-ps-block">
            <div class="bm-ps-block__top">
              <h2>{{ blk.title }}</h2>
              <BmBadge tone="neutral">{{ blk.type }}</BmBadge>
            </div>
            <p v-if="blk.type === 'TEXT_BLOCK'" class="bm-ps-text">{{ blk.content }}</p>
            <p v-else-if="blk.type === 'KPI_GRID'" class="bm-ps-text">
              Live snapshot from Brand {{ report.blogId }} connected channel totals.
            </p>
            <p v-else-if="blk.type === 'LINE_CHART'" class="bm-ps-text">
              30-day organic reach vs impressions comparison curve.
            </p>
            <p v-else class="bm-ps-text">
              Ranked post performance table across connected networks.
            </p>
          </section>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import { apiRequest } from '@/services/api';
import { useAppStore } from '@/stores/appStore';
import type { StudioReport } from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const loading = ref(true);
const errorMsg = ref('');
const report = ref<StudioReport | null>(null);

onMounted(async () => {
  try {
    const id = String(route.params.id || 'stu-1');
    const res = await apiRequest<{ data: StudioReport }>(`/api/v2/reporting/studio/reports/${id}`);
    report.value = res.data;
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to load public report.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.bm-ps-main {
  max-width: 960px;
  margin: 0 auto;
  padding: clamp(32px, 5vw, 68px) clamp(18px, 3vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-ps-sub {
  margin-top: 10px;
  color: var(--bm-text-muted);
}

.bm-ps-blocks {
  display: grid;
  gap: 1rem;
}

.bm-ps-block {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bm-ps-block__top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.bm-ps-text {
  color: var(--bm-text-muted);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
