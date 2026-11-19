<template>
  <AppShell class="bm-shell--editorial">
    <div class="bm-workspace-page bm-inbox-page">
      <header class="bm-workspace-head">
        <div>
          <p v-if="store.activeBrand" class="bm-workspace-context">{{ store.activeBrand.name }}</p>
          <h1>Unified Inbox</h1>
          <p class="bm-page-sub">
            Triage comments, direct messages, and reviews.
          </p>
        </div>
      </header>

      <div class="bm-inbox-grid" :class="{ 'bm-inbox-grid--reading': reading && selectedThread }">
        <aside class="bm-card bm-inbox-filters" aria-label="Inbox filters">
          <h2>Status</h2>
          <div class="bm-filter-list">
            <button
              v-for="st in statuses"
              :key="st.id"
              type="button"
              class="bm-filter-btn"
              :class="{ 'bm-filter-btn--active': statusFilter === st.id }"
              :aria-pressed="statusFilter === st.id"
              @click="statusFilter = st.id"
            >
              {{ st.label }}
            </button>
          </div>

          <h2>Channel</h2>
          <div class="bm-filter-list">
            <button
              type="button"
              class="bm-filter-btn"
              :class="{ 'bm-filter-btn--active': networkFilter === 'ALL' }"
              :aria-pressed="networkFilter === 'ALL'"
              @click="networkFilter = 'ALL'"
            >
              All channels
            </button>
            <button
              v-for="ch in ['instagram', 'youtube', 'tiktok', 'linkedin']"
              :key="ch"
              type="button"
              class="bm-filter-btn"
              :class="{ 'bm-filter-btn--active': networkFilter === ch }"
              :aria-pressed="networkFilter === ch"
              @click="networkFilter = ch"
            >
              <NetworkBadge :network="ch" /> {{ ch }}
            </button>
          </div>
        </aside>

        <section class="bm-card bm-inbox-list" aria-label="Conversations">
          <header class="bm-inbox-list__head">
            <h2 ref="listTitle" tabindex="-1">Conversations</h2>
            <span v-if="!loading" class="tabular-nums">{{ threads.length }}</span>
          </header>
          <BmStateView
            v-if="loading"
            kind="loading"
            title="Loading conversations"
            description="Fetching incoming DMs and comments."
          />

          <BmStateView
            v-else-if="threads.length === 0"
            kind="empty"
            badge-text="Inbox clear"
            title="No conversations match the current filter"
            description="Connect active social profiles or reset filters to see message threads."
            action-label="Brand Connections"
            @action="router.push(`/brands/connections?blogId=${store.activeBlogId}`)"
          />

          <div v-else class="bm-thread-items">
            <button
              v-for="thr in threads"
              :key="thr.id"
              type="button"
              class="bm-thread-row"
              :class="{ 'bm-thread-row--active': selectedThread?.id === thr.id }"
              :aria-current="selectedThread?.id === thr.id ? 'true' : undefined"
              @click="openThread(thr.id)"
            >
              <div class="bm-thread-row__top">
                <span class="bm-thread-row__author">
                  <NetworkBadge :network="thr.network" />
                  <strong>{{ thr.contactName }}</strong>
                </span>
                <BmBadge :tone="statusTone(thr.status)">{{ thr.status }}</BmBadge>
              </div>
              <p class="bm-thread-row__handle">{{ thr.contactHandle }} · {{ thr.channelType }}</p>
              <p class="bm-thread-row__snippet">{{ thr.messages[thr.messages.length - 1]?.text }}</p>
            </button>
          </div>
        </section>

        <section class="bm-card bm-inbox-detail" aria-label="Conversation thread detail">
          <BmStateView
            v-if="!selectedThread"
            kind="empty"
            badge-text="No selection"
            title="Select a conversation"
            description="Choose a thread from the list to read its messages and reply."
          />

          <template v-else>
            <BmButton class="bm-inbox-back" variant="secondary" size="sm" @click="backToThreads">
              Back to conversations
            </BmButton>
            <div class="bm-detail-head">
              <div>
                <h2 ref="threadTitle" tabindex="-1">{{ selectedThread.contactName }}</h2>
                <p class="bm-detail-meta">
                  {{ selectedThread.contactHandle }} on {{ selectedThread.network }} ({{ selectedThread.channelType }})
                </p>
              </div>
              <BmButton
                variant="secondary"
                size="sm"
                @click="toggleResolved(selectedThread)"
              >
                {{ selectedThread.status === 'RESOLVED' ? 'Reopen thread' : 'Mark resolved' }}
              </BmButton>
            </div>

            <div class="bm-messages">
              <article
                v-for="msg in selectedThread.messages"
                :key="msg.id"
                class="bm-msg"
                :class="msg.sender === 'operator' ? 'bm-msg--operator' : 'bm-msg--contact'"
              >
                <div class="bm-msg__head">
                  <strong>{{ msg.authorName }}</strong>
                  <time class="tabular-nums">{{ msg.sentAt.slice(0, 16).replace('T', ' ') }}</time>
                </div>
                <p>{{ msg.text }}</p>
              </article>
            </div>

            <form class="bm-reply-form" @submit.prevent="sendReply">
              <label for="inbox-reply" class="bm-label">Reply to {{ selectedThread.contactName }}</label>
              <textarea
                id="inbox-reply"
                v-model="replyText"
                class="bm-textarea"
                placeholder="Write your reply message..."
                required
              ></textarea>
              <div class="bm-reply-actions">
                <BmButton type="submit" variant="primary" :loading="sending">Send reply</BmButton>
              </div>
            </form>
          </template>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import NetworkBadge from '@/components/common/designSystem/atoms/NetworkBadge.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type { InboxThread } from '@/types/api';

const router = useRouter();
const store = useAppStore();

const statuses = [
  { id: 'ALL', label: 'All messages' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'RESOLVED', label: 'Resolved' }
];

const statusFilter = ref('ALL');
const networkFilter = ref('ALL');
const loading = ref(true);
const sending = ref(false);
const threads = ref<InboxThread[]>([]);
const selectedId = ref<string | null>(null);
const reading = ref(false);
const listTitle = ref<HTMLElement | null>(null);
const threadTitle = ref<HTMLElement | null>(null);
const replyText = ref('');

const selectedThread = computed(
  () => threads.value.find((t) => t.id === selectedId.value) ?? threads.value[0] ?? null
);

async function openThread(id: string): Promise<void> {
  selectedId.value = id;
  reading.value = true;
  if (window.matchMedia('(max-width: 960px)').matches) {
    await nextTick();
    threadTitle.value?.focus();
  }
}

async function backToThreads(): Promise<void> {
  reading.value = false;
  await nextTick();
  listTitle.value?.focus();
}

function statusTone(st: InboxThread['status']): 'warning' | 'accent' | 'success' {
  if (st === 'UNREAD') return 'warning';
  if (st === 'RESOLVED') return 'success';
  return 'accent';
}

async function loadThreads(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiRequest<{ data: InboxThread[] }>(
      `/api/v2/inbox/threads?blogId=${store.activeBlogId}&status=${statusFilter.value}&network=${networkFilter.value}`
    );
    threads.value = res.data;
    if (!threads.value.some((t) => t.id === selectedId.value)) {
      selectedId.value = threads.value[0]?.id ?? null;
      reading.value = false;
    }
  } finally {
    loading.value = false;
  }
}

async function sendReply(): Promise<void> {
  if (!selectedThread.value || !replyText.value.trim()) return;
  sending.value = true;
  try {
    await apiRequest(`/api/v2/inbox/threads/${selectedThread.value.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: replyText.value })
    });
    replyText.value = '';
    await loadThreads();
  } finally {
    sending.value = false;
  }
}

async function toggleResolved(thr: InboxThread): Promise<void> {
  const nextStatus = thr.status === 'RESOLVED' ? 'PENDING' : 'RESOLVED';
  await apiRequest(`/api/v2/inbox/threads/${thr.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: nextStatus })
  });
  await loadThreads();
}

watch(() => [store.activeBlogId, statusFilter.value, networkFilter.value], loadThreads);
onMounted(loadThreads);
</script>

<style scoped>
.bm-page-sub {
  color: var(--bm-text-muted);
}

.bm-inbox-grid {
  display: grid;
  grid-template-columns: 182px minmax(240px, 0.78fr) minmax(0, 1.45fr);
  gap: 14px;
  min-height: 540px;
}

.bm-inbox-filters,
.bm-inbox-list,
.bm-inbox-detail {
  min-width: 0;
  padding: clamp(14px, 1.55vw, 24px);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-inbox-filters h2 {
  font-family: var(--font-data);
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--bm-text-muted);
}

.bm-filter-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bm-filter-btn {
  min-height: 44px;
  padding: 0 0.75rem;
  border-radius: var(--radius-inputs);
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  text-transform: capitalize;
}

.bm-filter-btn:hover {
  background: var(--bm-subtle);
}

.bm-filter-btn--active {
  background: var(--bm-surface);
  border-color: var(--bm-divider);
}

.bm-inbox-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bm-inbox-list__head h2,
.bm-detail-head h2 {
  font-size: clamp(1.4rem, 2.3vw, 2rem);
  font-weight: 300;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}

.bm-inbox-list__head span {
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 12px;
}

.bm-thread-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bm-thread-row {
  width: 100%;
  padding: 0.75rem;
  border-radius: var(--radius-inputs);
  border: 1px solid var(--bm-divider);
  background: var(--bm-subtle);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bm-thread-row:hover,
.bm-thread-row--active {
  background: var(--bm-surface);
}

.bm-thread-row--active {
  border-color: var(--bm-control-border);
}

.bm-thread-row__top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.bm-thread-row__author {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.bm-thread-row__handle {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
  overflow-wrap: anywhere;
}

.bm-thread-row__snippet {
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bm-detail-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
}

.bm-detail-meta {
  font-size: 0.875rem;
  color: var(--bm-text-muted);
  overflow-wrap: anywhere;
}

.bm-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.bm-msg {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-inputs);
  border: 1px solid var(--bm-divider);
  max-width: 85%;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.bm-msg--contact {
  align-self: flex-start;
  background: var(--bm-subtle);
}

.bm-msg--operator {
  align-self: flex-end;
  background: color-mix(in srgb, var(--bm-accent) 12%, var(--bm-elevated));
  color: var(--bm-accent-soft-text);
}

.bm-msg__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.bm-msg__head time {
  color: var(--bm-text-muted);
  font-family: var(--font-data);
  font-size: 11px;
}

.bm-reply-form {
  border-top: 1px solid var(--bm-divider);
  padding-top: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-reply-actions {
  display: flex;
  justify-content: flex-end;
}

.bm-inbox-grid .bm-inbox-back {
  display: none;
}

@media (max-width: 960px) {
  .bm-inbox-grid {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .bm-inbox-grid:not(.bm-inbox-grid--reading) .bm-inbox-detail,
  .bm-inbox-grid--reading :is(.bm-inbox-filters, .bm-inbox-list) {
    display: none;
  }

  .bm-inbox-grid .bm-inbox-back {
    display: inline-flex;
    align-self: flex-start;
  }

  .bm-filter-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .bm-msg {
    max-width: 100%;
  }
}
</style>
