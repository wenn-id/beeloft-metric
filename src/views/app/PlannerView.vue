<template>
  <AppShell>
    <div class="bm-planner-page">
      <div class="bm-page-head">
        <div>
          <h1>Planning, Flows & AI Scheduler</h1>
          <p class="bm-page-sub">
            Schedule posts, automate DM flows, manage reusable templates, and review peak hours for
            <strong>{{ store.activeBrand?.name }}</strong>.
          </p>
        </div>
        <BmButton variant="primary" @click="openComposer">+ Create post</BmButton>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Planner views" />

      <BmStateView
        v-if="loading"
        kind="loading"
        title="Loading planner workspace"
        description="Fetching calendar queue, AutoLists, Flows, and Posts Library."
      />

      <!-- Calendar View -->
      <template v-else-if="activeTab === 'calendar'">
        <div class="bm-calendar-bar bm-card">
          <div>
            <strong>Upcoming Week Window</strong>
            <span class="bm-cal-range">Nov 14 to Nov 20, 2026</span>
          </div>
          <BmButton variant="secondary" size="sm" @click="activeTab = 'best-times'">
            Inspect Best Time to Post
          </BmButton>
        </div>

        <div class="bm-calendar-grid">
          <section v-for="day in calendarDays" :key="day.iso" class="bm-card bm-day-col">
            <header class="bm-day-col__head">
              <strong>{{ day.label }}</strong>
              <span class="tabular-nums">{{ day.iso }}</span>
            </header>

            <div class="bm-day-col__list">
              <div v-if="postsForDay(day.iso).length === 0" class="bm-day-empty">
                No posts queued
              </div>
              <article
                v-for="post in postsForDay(day.iso)"
                :key="post.id"
                class="bm-post-slot bm-card"
              >
                <div class="bm-post-slot__top">
                  <time class="tabular-nums">{{ post.scheduledAt.slice(11, 16) }}</time>
                  <BmBadge :tone="postTone(post.status)">{{ post.status }}</BmBadge>
                </div>
                <div class="bm-post-slot__nets">
                  <NetworkBadge v-for="n in post.networks" :key="n" :network="n" />
                </div>
                <p class="bm-post-slot__copy">{{ post.text }}</p>
                <div class="bm-post-slot__actions">
                  <button
                    v-if="post.status === 'SCHEDULED'"
                    type="button"
                    class="bm-slot-link"
                    @click="markPublished(post)"
                  >
                    Publish now
                  </button>
                  <button type="button" class="bm-slot-del" @click="deletePost(post.id)">
                    Move to trash
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </template>

      <!-- List / History View -->
      <template v-else-if="activeTab === 'list' || activeTab === 'history'">
        <BmStateView
          v-if="filteredPosts.length === 0"
          kind="empty"
          badge-text="Queue empty"
          :title="activeTab === 'history' ? 'No published posts in archive' : 'No scheduled posts queued'"
          description="Use Create post to schedule content or restore deleted items."
          action-label="+ Create post"
          @action="openComposer"
        />

        <div v-else class="bm-card bm-table-scroll">
          <table class="bm-table">
            <thead>
              <tr>
                <th>Scheduled Time</th>
                <th>Target Networks</th>
                <th>Post Copy</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="post in filteredPosts" :key="post.id">
                <td class="tabular-nums">{{ post.scheduledAt.replace('T', ' ') }}</td>
                <td>
                  <div class="bm-net-list">
                    <NetworkBadge v-for="n in post.networks" :key="n" :network="n" />
                  </div>
                </td>
                <td>{{ post.text }}</td>
                <td><BmBadge :tone="postTone(post.status)">{{ post.status }}</BmBadge></td>
                <td>
                  <div class="bm-row-actions">
                    <BmButton
                      v-if="post.status === 'SCHEDULED'"
                      variant="secondary"
                      size="sm"
                      @click="markPublished(post)"
                    >
                      Mark published
                    </BmButton>
                    <BmButton variant="danger" size="sm" @click="deletePost(post.id)">
                      Move to trash
                    </BmButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- AutoLists -->
      <template v-else-if="activeTab === 'autolists'">
        <div class="bm-card bm-autolist-create">
          <h2>Create evergreen AutoList</h2>
          <form class="bm-autolist-form" @submit.prevent="createAutoList">
            <div>
              <label for="al-name" class="bm-label">List name</label>
              <input id="al-name" v-model="autoName" type="text" class="bm-input" placeholder="Product Tips Queue" required />
            </div>
            <div>
              <label for="al-rule" class="bm-label">Schedule cadence</label>
              <input id="al-rule" v-model="autoRule" type="text" class="bm-input" placeholder="Every Wednesday at 10:00" required />
            </div>
            <BmButton type="submit" variant="primary">Add AutoList</BmButton>
          </form>
        </div>

        <BmStateView
          v-if="autolists.length === 0"
          kind="empty"
          badge-text="No AutoLists"
          title="No recurring AutoLists created yet"
          description="Create an evergreen queue above to recycle posts automatically."
        />

        <div v-else class="bm-autolist-grid">
          <article v-for="al in autolists" :key="al.id" class="bm-card bm-al-card">
            <div class="bm-al-card__head">
              <h3>{{ al.name }}</h3>
              <BmBadge :tone="al.active ? 'success' : 'neutral'">
                {{ al.active ? 'Active' : 'Paused' }}
              </BmBadge>
            </div>
            <p class="bm-al-card__rule">{{ al.scheduleRule }}</p>
            <div class="bm-net-list">
              <NetworkBadge v-for="n in al.networks" :key="n" :network="n" />
            </div>
            <div class="bm-al-card__foot">
              <span class="tabular-nums">{{ al.postsCount }} queued posts</span>
              <BmButton variant="secondary" size="sm" @click="toggleAutoList(al)">
                {{ al.active ? 'Pause list' : 'Activate list' }}
              </BmButton>
            </div>
          </article>
        </div>
      </template>

      <!-- Flows Automation -->
      <template v-else-if="activeTab === 'flows'">
        <div class="bm-card bm-autolist-create">
          <div class="bm-flow-head">
            <div>
              <h2>Automated Comment-to-DM Flows</h2>
              <p class="bm-page-sub">Automatically reply to comments and deliver links inside DMs.</p>
            </div>
            <BmButton variant="primary" size="sm" @click="flowModalOpen = true">+ New flow</BmButton>
          </div>
        </div>

        <section class="bm-flow-templates">
          <h3>Ready-to-use Flow Templates</h3>
          <div class="bm-autolist-grid">
            <article v-for="ftpl in flowTemplates" :key="ftpl.id" class="bm-card bm-al-card">
              <div class="bm-al-card__head">
                <strong>{{ ftpl.name }}</strong>
                <NetworkBadge :network="ftpl.network" />
              </div>
              <p class="bm-al-card__rule">{{ ftpl.description }}</p>
              <BmButton variant="secondary" size="sm" @click="applyFlowTemplate(ftpl)">
                Use flow template
              </BmButton>
            </article>
          </div>
        </section>

        <BmStateView
          v-if="flows.length === 0"
          kind="empty"
          badge-text="No flows"
          title="No automation flows configured for this brand"
          description="Create a Comment-to-DM flow or apply one of the templates above."
        />

        <div v-else class="bm-autolist-grid">
          <article v-for="fl in flows" :key="fl.id" class="bm-card bm-al-card">
            <div class="bm-al-card__head">
              <span class="bm-flow-title">
                <NetworkBadge :network="fl.network" />
                <strong>{{ fl.name }}</strong>
              </span>
              <BmBadge :tone="fl.status === 'ACTIVE' ? 'success' : 'warning'">{{ fl.status }}</BmBadge>
            </div>
            <p class="bm-al-card__rule">Keywords: {{ fl.keywords.join(', ') }}</p>
            <p class="bm-post-slot__copy">{{ fl.dmText }}</p>
            <div class="bm-al-card__foot">
              <span class="tabular-nums">{{ fl.executionsCount }} runs</span>
              <BmButton variant="secondary" size="sm" @click="toggleFlowStatus(fl)">
                {{ fl.status === 'ACTIVE' ? 'Pause' : 'Activate' }}
              </BmButton>
            </div>
          </article>
        </div>
      </template>

      <!-- Posts Library -->
      <template v-else-if="activeTab === 'library'">
        <div class="bm-card bm-autolist-create">
          <h2>Save Reusable Post Template</h2>
          <form class="bm-autolist-form" @submit.prevent="createLibraryTemplate">
            <div>
              <label for="lib-title" class="bm-label">Template title</label>
              <input id="lib-title" v-model="libTitle" type="text" class="bm-input" placeholder="Product Launch Reminder" required />
            </div>
            <div>
              <label for="lib-copy" class="bm-label">Template caption</label>
              <input id="lib-copy" v-model="libText" type="text" class="bm-input" placeholder="Reusable caption text..." required />
            </div>
            <BmButton type="submit" variant="primary">Save to library</BmButton>
          </form>
        </div>

        <BmStateView
          v-if="libraryPosts.length === 0"
          kind="empty"
          badge-text="Library empty"
          title="No saved templates in Posts Library"
          description="Save repeatable captions above to insert them quickly into the post scheduler."
        />

        <div v-else class="bm-autolist-grid">
          <article v-for="item in libraryPosts" :key="item.id" class="bm-card bm-al-card">
            <h3>{{ item.title }}</h3>
            <p class="bm-al-card__rule">{{ item.text }}</p>
            <div class="bm-al-card__foot">
              <BmButton variant="primary" size="sm" @click="useLibraryItem(item)">
                Use in composer
              </BmButton>
              <BmButton variant="danger" size="sm" @click="deleteLibraryItem(item.id)">
                Remove
              </BmButton>
            </div>
          </article>
        </div>
      </template>

      <!-- Deleted Posts Trash -->
      <template v-else-if="activeTab === 'deleted'">
        <BmStateView
          v-if="deletedPosts.length === 0"
          kind="empty"
          badge-text="Trash empty"
          title="No deleted posts waiting for recovery"
          description="Posts removed from the Calendar or List appear here so you can restore them."
        />

        <div v-else class="bm-card bm-table-scroll">
          <table class="bm-table">
            <thead>
              <tr>
                <th>Original Schedule</th>
                <th>Networks</th>
                <th>Caption</th>
                <th>Deleted At</th>
                <th>Restore</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dp in deletedPosts" :key="dp.id">
                <td class="tabular-nums">{{ dp.scheduledAt.replace('T', ' ') }}</td>
                <td>
                  <div class="bm-net-list">
                    <NetworkBadge v-for="n in dp.networks" :key="n" :network="n" />
                  </div>
                </td>
                <td>{{ dp.text }}</td>
                <td class="tabular-nums">{{ dp.deletedAt.slice(0, 10) }}</td>
                <td>
                  <BmButton variant="secondary" size="sm" @click="restorePost(dp.id)">
                    Restore to calendar
                  </BmButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Best Time to Post Heatmap -->
      <template v-else>
        <div class="bm-card bm-heatmap-card">
          <div class="bm-heatmap-head">
            <div>
              <h2>Audience Activity Heatmap (0 to 100 engagement score)</h2>
              <p>Select a channel to view suggested publication windows.</p>
            </div>
            <div>
              <label for="bt-network" class="sr-only">Heatmap channel</label>
              <select id="bt-network" v-model="bestTimesNetwork" class="bm-select" @change="loadBestTimes">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
          </div>

          <div class="bm-table-scroll">
            <table class="bm-heat-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th v-for="hr in 24" :key="hr" class="tabular-nums">{{ String(hr - 1).padStart(2, '0') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, dIdx) in bestTimesMatrix" :key="dIdx">
                  <th>{{ bestTimesDays[dIdx] }}</th>
                  <td
                    v-for="(score, hIdx) in row"
                    :key="hIdx"
                    class="bm-heat-cell tabular-nums"
                    :class="score >= 70 ? 'bm-heat--high' : score >= 45 ? 'bm-heat--mid' : 'bm-heat--low'"
                    :title="`${bestTimesDays[dIdx]} ${String(hIdx).padStart(2, '0')}:00 - score ${score}`"
                  >
                    {{ score }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Composer Modal with AI Assistant + Approval Workflow -->
      <BmModal :open="composerOpen" title="Schedule New Post" @close="composerOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitPost">
          <fieldset class="bm-net-fieldset">
            <legend class="bm-label">Select destination channels</legend>
            <div class="bm-net-checkboxes">
              <label v-for="net in composerNetworks" :key="net" :for="`net-${net}`" class="bm-check-pill">
                <input :id="`net-${net}`" v-model="postForm.networks" type="checkbox" :value="net" />
                <NetworkBadge :network="net" />
                <span>{{ net }}</span>
              </label>
            </div>
          </fieldset>

          <div class="bm-ai-box">
            <div class="bm-ai-box__head">
              <strong>AI Natural Language Assistant</strong>
              <BmButton variant="secondary" size="sm" :loading="aiGenerating" @click="generateAiCopy">
                Generate draft
              </BmButton>
            </div>
            <div class="bm-ai-box__controls">
              <div>
                <label for="ai-prompt" class="sr-only">AI prompt</label>
                <input
                  id="ai-prompt"
                  v-model="aiPrompt"
                  type="text"
                  class="bm-input"
                  placeholder="Describe post topic (e.g. Announce Q4 webinar)"
                />
              </div>
              <div>
                <label for="ai-lang" class="sr-only">Language</label>
                <select id="ai-lang" v-model="aiLang" class="bm-select">
                  <option value="en">English</option>
                  <option value="id">Indonesian</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label for="post-dt" class="bm-label">Publish date and time</label>
            <input id="post-dt" v-model="postForm.scheduledAt" type="datetime-local" class="bm-input" required />
          </div>

          <div>
            <div class="bm-copy-head">
              <label for="post-text" class="bm-label">Post caption</label>
              <span class="bm-char-count tabular-nums">{{ postForm.text.length }} chars</span>
            </div>
            <textarea
              id="post-text"
              v-model="postForm.text"
              class="bm-textarea"
              placeholder="Write your scheduled post copy..."
              required
            ></textarea>
          </div>

          <div>
            <label for="post-comment" class="bm-label">First comment (optional)</label>
            <input id="post-comment" v-model="postForm.firstComment" type="text" class="bm-input" placeholder="Include link or hashtags" />
          </div>

          <label for="post-review" class="bm-check-pill">
            <input id="post-review" v-model="postForm.requestReview" type="checkbox" />
            <span>Submit approval task to My Tasks reviewer queue</span>
          </label>

          <p v-if="formError" class="bm-error-text">{{ formError }}</p>

          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="composerOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary" :loading="saving">Save to calendar</BmButton>
          </div>
        </form>
      </BmModal>

      <!-- Create Flow Modal -->
      <BmModal :open="flowModalOpen" title="Create Automation Flow" @close="flowModalOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitFlow">
          <div>
            <label for="fl-name" class="bm-label">Flow name</label>
            <input id="fl-name" v-model="flowForm.name" type="text" class="bm-input" placeholder="Comment Guide Delivery" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="fl-net" class="bm-label">Network</label>
              <select id="fl-net" v-model="flowForm.network" class="bm-select">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label for="fl-kw" class="bm-label">Trigger keywords (comma-separated)</label>
              <input id="fl-kw" v-model="flowForm.keywordsText" type="text" class="bm-input" placeholder="GUIDE, CHECKLIST" />
            </div>
          </div>
          <div>
            <label for="fl-dm" class="bm-label">Automated DM message</label>
            <textarea id="fl-dm" v-model="flowForm.dmText" class="bm-textarea" placeholder="Here is the requested link..." required></textarea>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="flowModalOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Create flow</BmButton>
          </div>
        </form>
      </BmModal>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmModal from '@/components/common/designSystem/atoms/BmModal.vue';
import BmStateView from '@/components/common/designSystem/atoms/BmStateView.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import NetworkBadge from '@/components/common/designSystem/atoms/NetworkBadge.vue';
import { useAppStore } from '@/stores/appStore';
import { apiRequest } from '@/services/api';
import type {
  AutoList,
  AutomationFlow,
  DeletedPlannerPost,
  FlowTemplate,
  LibraryPostTemplate,
  NetworkKey,
  PlannerPost
} from '@/types/api';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const tabs = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'list', label: 'List' },
  { id: 'autolists', label: 'AutoLists' },
  { id: 'flows', label: 'Flows' },
  { id: 'library', label: 'Posts Library' },
  { id: 'deleted', label: 'Trash' },
  { id: 'history', label: 'History' },
  { id: 'best-times', label: 'Best Time to Post' }
];

function resolveTabFromPath(path: string): string {
  const seg = path.split('/')[2] || '';
  if (seg === 'list' || seg === 'autolists' || seg === 'flows' || seg === 'library' || seg === 'deleted' || seg === 'history' || seg === 'best-times') {
    return seg;
  }
  return 'calendar';
}

const activeTab = ref(resolveTabFromPath(route.path));
const loading = ref(true);
const saving = ref(false);
const composerOpen = ref(false);
const flowModalOpen = ref(false);
const formError = ref('');

const posts = ref<PlannerPost[]>([]);
const deletedPosts = ref<DeletedPlannerPost[]>([]);
const libraryPosts = ref<LibraryPostTemplate[]>([]);
const autolists = ref<AutoList[]>([]);
const flows = ref<AutomationFlow[]>([]);
const flowTemplates = ref<FlowTemplate[]>([]);

const autoName = ref('');
const autoRule = ref('Every Monday and Thursday at 09:30');
const libTitle = ref('');
const libText = ref('');

const bestTimesNetwork = ref('instagram');
const bestTimesDays = ref<string[]>([]);
const bestTimesMatrix = ref<number[][]>([]);

const composerNetworks: NetworkKey[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'twitter', 'facebook'];
const postForm = ref({
  scheduledAt: '2026-11-18T10:00',
  text: '',
  firstComment: '',
  networks: ['instagram', 'linkedin'] as NetworkKey[],
  requestReview: false
});

const aiPrompt = ref('');
const aiLang = ref('en');
const aiGenerating = ref(false);

const flowForm = ref({
  name: '',
  network: 'instagram' as 'instagram' | 'tiktok' | 'facebook',
  keywordsText: 'GUIDE, LINK',
  dmText: ''
});

const calendarDays = [
  { label: 'Sat', iso: '2026-11-14' },
  { label: 'Sun', iso: '2026-11-15' },
  { label: 'Mon', iso: '2026-11-16' },
  { label: 'Tue', iso: '2026-11-17' },
  { label: 'Wed', iso: '2026-11-18' },
  { label: 'Thu', iso: '2026-11-19' },
  { label: 'Fri', iso: '2026-11-20' }
];

const filteredPosts = computed(() => {
  if (activeTab.value === 'history') {
    return posts.value.filter((p) => p.status === 'PUBLISHED');
  }
  return posts.value;
});

function postsForDay(dayIso: string): PlannerPost[] {
  return posts.value.filter((p) => p.scheduledAt.startsWith(dayIso));
}

function postTone(st: PlannerPost['status']): 'accent' | 'success' | 'neutral' | 'danger' {
  if (st === 'PUBLISHED') return 'success';
  if (st === 'SCHEDULED') return 'accent';
  if (st === 'FAILED') return 'danger';
  return 'neutral';
}

async function loadPlanner(): Promise<void> {
  loading.value = true;
  try {
    const [postsRes, delRes, libRes, alRes, flRes, ftRes] = await Promise.all([
      apiRequest<{ data: PlannerPost[] }>(`/api/v2/planner/posts?blogId=${store.activeBlogId}`),
      apiRequest<{ data: DeletedPlannerPost[] }>(`/api/v2/planner/deleted?blogId=${store.activeBlogId}`),
      apiRequest<{ data: LibraryPostTemplate[] }>(`/api/v2/planner/library?blogId=${store.activeBlogId}`),
      apiRequest<{ data: AutoList[] }>(`/api/v2/planner/autolists?blogId=${store.activeBlogId}`),
      apiRequest<{ data: AutomationFlow[] }>(`/api/v2/flows?blogId=${store.activeBlogId}`),
      apiRequest<{ data: FlowTemplate[] }>('/api/v2/flows/templates')
    ]);
    posts.value = postsRes.data;
    deletedPosts.value = delRes.data;
    libraryPosts.value = libRes.data;
    autolists.value = alRes.data;
    flows.value = flRes.data;
    flowTemplates.value = ftRes.data;
    await loadBestTimes();
  } finally {
    loading.value = false;
  }
}

async function loadBestTimes(): Promise<void> {
  const res = await apiRequest<{ data: { days: string[]; matrix: number[][] } }>(
    `/api/v2/planner/best-times?network=${bestTimesNetwork.value}`
  );
  bestTimesDays.value = res.data.days;
  bestTimesMatrix.value = res.data.matrix;
}

function openComposer(): void {
  formError.value = '';
  composerOpen.value = true;
}

async function generateAiCopy(): Promise<void> {
  if (!aiPrompt.value.trim()) {
    formError.value = 'Enter a short prompt for the AI assistant first.';
    return;
  }
  aiGenerating.value = true;
  formError.value = '';
  try {
    const res = await apiRequest<{
      data: { generatedCopy: string; suggestedHashtags: string[]; suggestedTime: string };
    }>('/api/v2/integrations/ai/natural-language-scheduling', {
      method: 'POST',
      body: JSON.stringify({
        blogId: store.activeBlogId,
        prompt: aiPrompt.value,
        language: aiLang.value,
        network: postForm.value.networks[0] || 'instagram'
      })
    });
    postForm.value.text = `${res.data.generatedCopy} ${res.data.suggestedHashtags.join(' ')}`;
    postForm.value.scheduledAt = res.data.suggestedTime;
  } finally {
    aiGenerating.value = false;
  }
}

async function submitPost(): Promise<void> {
  if (postForm.value.networks.length === 0) {
    formError.value = 'Select at least one destination network.';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    const created = await apiRequest<{ data: PlannerPost }>('/api/v2/planner/posts', {
      method: 'POST',
      body: JSON.stringify({
        blogId: store.activeBlogId,
        scheduledAt: postForm.value.scheduledAt,
        text: postForm.value.text,
        firstComment: postForm.value.firstComment,
        networks: postForm.value.networks,
        status: postForm.value.requestReview ? 'DRAFT' : 'SCHEDULED'
      })
    });

    if (postForm.value.requestReview) {
      await apiRequest('/api/v2/tasks', {
        method: 'POST',
        body: JSON.stringify({
          blogId: store.activeBlogId,
          postId: created.data.id,
          postText: created.data.text,
          network: created.data.networks[0],
          scheduledAt: created.data.scheduledAt
        })
      });
    }

    postForm.value.text = '';
    postForm.value.firstComment = '';
    postForm.value.requestReview = false;
    composerOpen.value = false;
    await loadPlanner();
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Unable to save post.';
  } finally {
    saving.value = false;
  }
}

async function markPublished(post: PlannerPost): Promise<void> {
  await apiRequest(`/api/v2/planner/posts/${post.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'PUBLISHED' })
  });
  await loadPlanner();
}

async function deletePost(id: string): Promise<void> {
  await apiRequest(`/api/v2/planner/posts/${id}`, { method: 'DELETE' });
  await loadPlanner();
}

async function restorePost(id: string): Promise<void> {
  await apiRequest(`/api/v2/planner/deleted/${id}/restore`, { method: 'POST' });
  await loadPlanner();
}

async function createLibraryTemplate(): Promise<void> {
  await apiRequest('/api/v2/planner/library', {
    method: 'POST',
    body: JSON.stringify({ blogId: store.activeBlogId, title: libTitle.value, text: libText.value })
  });
  libTitle.value = '';
  libText.value = '';
  await loadPlanner();
}

function useLibraryItem(item: LibraryPostTemplate): void {
  postForm.value.text = item.text;
  postForm.value.networks = [...item.networks];
  openComposer();
}

async function deleteLibraryItem(id: string): Promise<void> {
  await apiRequest(`/api/v2/planner/library/${id}`, { method: 'DELETE' });
  await loadPlanner();
}

async function createAutoList(): Promise<void> {
  if (!autoName.value.trim()) return;
  await apiRequest('/api/v2/planner/autolists', {
    method: 'POST',
    body: JSON.stringify({
      blogId: store.activeBlogId,
      name: autoName.value,
      scheduleRule: autoRule.value
    })
  });
  autoName.value = '';
  await loadPlanner();
}

async function toggleAutoList(al: AutoList): Promise<void> {
  await apiRequest(`/api/v2/planner/autolists/${al.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active: !al.active })
  });
  await loadPlanner();
}

function applyFlowTemplate(ftpl: FlowTemplate): void {
  flowForm.value = {
    name: ftpl.name,
    network: ftpl.network,
    keywordsText: ftpl.keywords.join(', '),
    dmText: ftpl.dmText
  };
  flowModalOpen.value = true;
}

async function submitFlow(): Promise<void> {
  await apiRequest('/api/v2/flows', {
    method: 'POST',
    body: JSON.stringify({
      blogId: store.activeBlogId,
      name: flowForm.value.name,
      network: flowForm.value.network,
      keywords: flowForm.value.keywordsText.split(',').map((k) => k.trim()).filter(Boolean),
      dmText: flowForm.value.dmText
    })
  });
  flowForm.value.name = '';
  flowForm.value.dmText = '';
  flowModalOpen.value = false;
  await loadPlanner();
}

async function toggleFlowStatus(fl: AutomationFlow): Promise<void> {
  await apiRequest(`/api/v2/flows/${fl.id}/status`, { method: 'PATCH', body: JSON.stringify({}) });
  await loadPlanner();
}

watch(() => route.path, (p) => {
  activeTab.value = resolveTabFromPath(p);
});

watch(activeTab, (tab) => {
  const target = tab === 'calendar' ? '/planner' : `/planner/${tab}`;
  if (route.path !== target) {
    router.replace({ path: target, query: route.query });
  }
});

watch(() => store.activeBlogId, loadPlanner);
onMounted(loadPlanner);
</script>

<style scoped>
.bm-planner-page {
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

.bm-calendar-bar {
  padding: 0.875rem 1.125rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.bm-cal-range {
  margin-left: 0.625rem;
  color: var(--bm-text-muted);
  font-size: 0.875rem;
}

.bm-calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 0.75rem;
}

.bm-day-col {
  padding: 0.75rem;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-day-col__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--bm-divider);
  font-size: 0.875rem;
}

.bm-day-empty {
  color: var(--bm-text-muted);
  font-size: 0.8125rem;
  padding: 0.5rem 0;
}

.bm-post-slot {
  padding: 12px;
  background: var(--bm-elevated);
  border: 1px solid var(--bm-divider);
  border-radius: var(--radius-smallcards);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bm-post-slot__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.bm-post-slot__nets,
.bm-net-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.bm-post-slot__copy {
  font-size: 0.8125rem;
}

.bm-post-slot__actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.bm-slot-link,
.bm-slot-del {
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0;
}

.bm-slot-link {
  color: var(--bm-accent);
}

.bm-slot-del {
  color: var(--bm-danger-text);
}

.bm-table-scroll {
  overflow-x: auto;
  padding: 0.5rem;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-row-actions {
  display: flex;
  gap: 0.5rem;
}

.bm-autolist-create,
.bm-heatmap-card {
  padding: 1.25rem;
}

.bm-autolist-form {
  margin-top: 0.875rem;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.875rem;
  align-items: end;
}

.bm-autolist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1rem;
}

.bm-flow-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.bm-flow-templates {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-flow-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.bm-al-card {
  padding: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-al-card__head,
.bm-al-card__foot,
.bm-heatmap-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.bm-al-card__rule {
  color: var(--bm-text-muted);
  font-size: 0.875rem;
}

.bm-heat-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 780px;
  margin-top: 1rem;
}

.bm-heat-table th,
.bm-heat-table td {
  padding: 0.375rem;
  border: 1px solid var(--bm-divider);
  text-align: center;
  font-size: 0.75rem;
}

.bm-heat--high {
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  font-weight: 500;
}

.bm-heat--mid {
  background: var(--color-mist-gray);
  color: var(--color-ink-black);
}

.bm-heat--low {
  background: var(--color-paper-white);
  color: var(--bm-text-muted);
}

.bm-form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-ai-box {
  padding: 0.875rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.bm-ai-box__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.bm-ai-box__controls {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 0.5rem;
}

.bm-net-fieldset {
  border: 1px solid var(--bm-divider);
  border-radius: var(--bm-radius-md);
  padding: 0.75rem;
}

.bm-net-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bm-check-pill {
  min-height: 44px;
  padding: 0 0.75rem;
  border: 1px solid var(--bm-control-border);
  border-radius: var(--bm-radius-md);
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: capitalize;
}

.bm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bm-copy-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-char-count {
  font-size: 0.75rem;
  color: var(--bm-text-muted);
}

.bm-error-text {
  color: var(--bm-danger-text);
  font-weight: 600;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}

@media (max-width: 760px) {
  .bm-autolist-form,
  .bm-two-col,
  .bm-ai-box__controls {
    grid-template-columns: 1fr;
  }
}
</style>
