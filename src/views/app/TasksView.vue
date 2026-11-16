<template>
  <AppShell>
    <div class="bm-tasks-page">
      <div class="bm-page-head">
        <div>
          <h1>My Tasks & Approval Portal</h1>
          <p class="bm-page-sub">
            Review scheduled post approvals submitted by editors or external clients for
            <strong>{{ store.activeBrand?.name }}</strong>.
          </p>
        </div>
        <router-link :to="`/planner?blogId=${store.activeBlogId}`" class="bm-link-btn">
          Open Planner
        </router-link>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Task filters" />

      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading approval tasks"
        description="Fetching pending, approved, and rejected post reviews."
      />

      <BmStateView
        v-else-if="tasks.length === 0"
        kind="empty"
        badge-text="No tasks"
        title="No approval tasks in this queue"
        description="Check the Submit for Review box inside Planner Composer to create an approval task."
        action-label="Go to Planner"
        @action="router.push(`/planner?blogId=${store.activeBlogId}`)"
      />

      <div v-else class="bm-tasks-grid">
        <article v-for="t in tasks" :key="t.id" class="bm-card bm-task-card">
          <div class="bm-task-card__top">
            <span class="bm-task-meta">
              <NetworkBadge :network="t.network" />
              <time class="tabular-nums">{{ t.scheduledAt.replace('T', ' ') }}</time>
            </span>
            <BmBadge :tone="statusTone(t.status)">{{ t.status }}</BmBadge>
          </div>

          <p class="bm-task-copy">{{ t.postText }}</p>
          <p class="bm-task-sub">
            From: {{ t.requesterEmail }} | Reviewer: {{ t.assigneeEmail }}
          </p>
          <p v-if="t.reviewerNote" class="bm-task-note">
            Reviewer note: {{ t.reviewerNote }}
          </p>

          <div class="bm-task-actions">
            <input
              v-model="notesMap[t.id]"
              type="text"
              class="bm-input"
              placeholder="Optional reviewer note"
              :aria-label="`Reviewer note for task ${t.id}`"
            />
            <div class="bm-task-btns">
              <BmButton variant="primary" size="sm" @click="updateTask(t.id, 'APPROVED')">
                Approve
              </BmButton>
              <BmButton variant="danger" size="sm" @click="updateTask(t.id, 'REJECTED')">
                Reject
              </BmButton>
            </div>
          </div>
        </article>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import NetworkBadge from '@/components/common/designSystem/atoms/NetworkBadge.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type { ReviewTask } from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'all', label: 'All Tasks' },
  { id: 'received', label: 'Received for Review' },
  { id: 'sent', label: 'Sent for Approval' }
];

const activeTab = ref(
  route.path.includes('received') ? 'received' : route.path.includes('sent') ? 'sent' : 'all'
);
const loading = ref(true);
const tasks = ref<ReviewTask[]>([]);
const notesMap = ref<Record<string, string>>({});

function statusTone(st: ReviewTask['status']): 'warning' | 'success' | 'danger' {
  if (st === 'APPROVED') return 'success';
  if (st === 'REJECTED') return 'danger';
  return 'warning';
}

async function loadTasks(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiRequest<{ data: ReviewTask[] }>(
      `/api/v2/tasks?blogId=${store.activeBlogId}&filter=${activeTab.value}`
    );
    tasks.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function updateTask(id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
  await apiRequest(`/api/v2/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reviewerNote: notesMap.value[id] || '' })
  });
  await loadTasks();
}

watch(activeTab, () => {
  loadTasks();
});
watch(() => store.activeBlogId, loadTasks);
onMounted(loadTasks);
</script>

<style scoped>
.bm-tasks-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bm-page-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.bm-page-sub {
  color: var(--bm-text-muted);
}

.bm-link-btn {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 1rem;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  text-decoration: none;
  font-weight: 700;
}

.bm-tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
}

.bm-task-card {
  padding: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-task-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.bm-task-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.bm-task-copy {
  font-weight: 500;
}

.bm-task-sub {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
}

.bm-task-note {
  padding: 0.5rem 0.625rem;
  border-radius: var(--bm-radius-sm);
  background: var(--bm-subtle);
  font-size: 0.8125rem;
}

.bm-task-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bm-task-btns {
  display: flex;
  gap: 0.5rem;
}
</style>
