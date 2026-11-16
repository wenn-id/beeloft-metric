<template>
  <div class="bm-public-studio">
    <BrandHeaderPublic />
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
        <div class="bm-ps-head">
          <div>
            <BmBadge tone="accent">Shared Reporting Studio Deck</BmBadge>
            <h1>{{ report.title }}</h1>
            <p class="bm-ps-sub">Last updated: {{ report.updatedAt.slice(0, 16).replace('T', ' ') }}</p>
          </div>
          <router-link :to="`/reporting/studio?blogId=${report.blogId}`" class="bm-edit-link">
            Edit in Reporting Studio
          </router-link>
        </div>

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
import type { StudioReport } from '@/types/api';

const route = useRoute();
const router = useRouter();

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
  padding: 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-ps-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.bm-ps-head h1 {
  margin-top: 0.5rem;
}

.bm-ps-sub {
  color: var(--bm-text-muted);
}

.bm-edit-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1rem;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  text-decoration: none;
  font-weight: 700;
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
  justify-content: space-between;
  align-items: center;
}

.bm-ps-text {
  color: var(--bm-text-muted);
}
</style>
