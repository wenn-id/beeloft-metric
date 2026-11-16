<template>
  <AppShell>
    <div class="bm-org-page">
      <div class="bm-page-head">
        <div>
          <h1>Team, Users & Organization Settings</h1>
          <p class="bm-page-sub">
            Manage workspace users, roles, client reviewers, custom domain, and agency SMTP mail.
          </p>
        </div>
        <BmButton variant="primary" @click="inviteOpen = true">+ Invite member</BmButton>
      </div>

      <BmTabs v-model="activeTab" :tabs="tabs" label="Organization management tabs" />

      <p v-if="savedMsg" class="bm-saved-banner" role="status">{{ savedMsg }}</p>

      <!-- Tab 1: Users, Roles, Team & Clients -->
      <template v-if="activeTab === 'members'">
        <div class="bm-card bm-table-scroll">
          <table class="bm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Category</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in members" :key="m.id">
                <td><strong>{{ m.name }}</strong></td>
                <td>{{ m.email }}</td>
                <td><BmBadge tone="neutral">{{ m.kind }}</BmBadge></td>
                <td><BmBadge tone="accent">{{ m.role }}</BmBadge></td>
                <td><BmBadge :tone="m.status === 'ACTIVE' ? 'success' : 'warning'">{{ m.status }}</BmBadge></td>
                <td>
                  <BmButton
                    v-if="m.role !== 'OWNER'"
                    variant="danger"
                    size="sm"
                    @click="removeMember(m.id)"
                  >
                    Remove
                  </BmButton>
                  <span v-else class="bm-page-sub">Owner</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Tab 2: Roles Matrix -->
      <template v-else-if="activeTab === 'roles'">
        <div class="bm-roles-grid">
          <article v-for="r in roleDefs" :key="r.role" class="bm-card bm-role-card">
            <h2>{{ r.role }}</h2>
            <p class="bm-page-sub">{{ r.desc }}</p>
            <ul class="bm-role-list">
              <li v-for="perm in r.perms" :key="perm">{{ perm }}</li>
            </ul>
          </article>
        </div>
      </template>

      <!-- Tab 3: Agency General & Domain -->
      <section v-else-if="activeTab === 'general' && agency" class="bm-card bm-form-card">
        <h2>Agency & Custom Domain Configuration</h2>
        <form class="bm-form-stack" @submit.prevent="saveAgency">
          <div>
            <label for="org-name" class="bm-label">Organization name</label>
            <input id="org-name" v-model="agency.organizationName" type="text" class="bm-input" required />
          </div>
          <div>
            <label for="org-dom" class="bm-label">White-label custom domain</label>
            <input id="org-dom" v-model="agency.customDomain" type="text" class="bm-input" required />
          </div>
          <div>
            <label for="org-loc" class="bm-label">Default locale</label>
            <select id="org-loc" v-model="agency.defaultLocale" class="bm-select">
              <option value="en">English (en)</option>
              <option value="id">Indonesian (id)</option>
              <option value="es">Spanish (es)</option>
            </select>
          </div>
          <div>
            <BmButton type="submit" variant="primary">Save organization settings</BmButton>
          </div>
        </form>
      </section>

      <!-- Tab 4: Mail / SMTP Configuration -->
      <section v-else-if="agency" class="bm-card bm-form-card">
        <h2>Agency SMTP Mail Configuration</h2>
        <form class="bm-form-stack" @submit.prevent="saveAgency">
          <div class="bm-two-col">
            <div>
              <label for="smtp-host" class="bm-label">SMTP Host</label>
              <input id="smtp-host" v-model="agency.smtpHost" type="text" class="bm-input" required />
            </div>
            <div>
              <label for="smtp-port" class="bm-label">Port</label>
              <input id="smtp-port" v-model.number="agency.smtpPort" type="number" class="bm-input" required />
            </div>
          </div>
          <div class="bm-two-col">
            <div>
              <label for="smtp-user" class="bm-label">SMTP Username</label>
              <input id="smtp-user" v-model="agency.smtpUser" type="text" class="bm-input" required />
            </div>
            <div>
              <label for="smtp-sender" class="bm-label">Sender email</label>
              <input id="smtp-sender" v-model="agency.senderEmail" type="email" class="bm-input" required />
            </div>
          </div>
          <div class="bm-smtp-actions">
            <BmButton type="submit" variant="primary">Save SMTP settings</BmButton>
            <BmButton variant="secondary" @click="sendTestMail">Send test email</BmButton>
          </div>
          <p v-if="agency.lastTestStatus" class="bm-test-note">{{ agency.lastTestStatus }}</p>
        </form>
      </section>

      <BmModal :open="inviteOpen" title="Invite Collaborator or Client" @close="inviteOpen = false">
        <form class="bm-form-stack" @submit.prevent="submitInvite">
          <div>
            <label for="inv-name" class="bm-label">Full name</label>
            <input id="inv-name" v-model="inviteForm.name" type="text" class="bm-input" placeholder="Your Name" required />
          </div>
          <div>
            <label for="inv-email" class="bm-label">Email</label>
            <input id="inv-email" v-model="inviteForm.email" type="email" class="bm-input" placeholder="email@example.com" required />
          </div>
          <div class="bm-two-col">
            <div>
              <label for="inv-role" class="bm-label">Role</label>
              <select id="inv-role" v-model="inviteForm.role" class="bm-select">
                <option value="ADMIN">ADMIN</option>
                <option value="EDITOR">EDITOR</option>
                <option value="CLIENT_REVIEWER">CLIENT_REVIEWER</option>
              </select>
            </div>
            <div>
              <label for="inv-kind" class="bm-label">Group</label>
              <select id="inv-kind" v-model="inviteForm.kind" class="bm-select">
                <option value="team">Team Member</option>
                <option value="client">Client</option>
              </select>
            </div>
          </div>
          <div class="bm-modal-actions">
            <BmButton variant="secondary" @click="inviteOpen = false">Cancel</BmButton>
            <BmButton type="submit" variant="primary">Send invite</BmButton>
          </div>
        </form>
      </BmModal>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmModal from '@/components/common/designSystem/atoms/BmModal.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';
import { apiRequest } from '@/services/api';
import type { AgencySettings, TeamMember } from '@/types/api';

const route = useRoute();
const tabs = [
  { id: 'members', label: 'Users, Team & Clients' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'general', label: 'Organization Settings' },
  { id: 'mail', label: 'Mail & SMTP' }
];

function tabFromPath(p: string): string {
  if (p.includes('roles')) return 'roles';
  if (p.includes('mail-configuration')) return 'mail';
  if (p.includes('organization-settings')) return 'general';
  return 'members';
}

const activeTab = ref(tabFromPath(route.path));
const members = ref<TeamMember[]>([]);
const agency = ref<AgencySettings | null>(null);
const savedMsg = ref('');
const inviteOpen = ref(false);

const inviteForm = ref({
  name: '',
  email: '',
  role: 'EDITOR' as TeamMember['role'],
  kind: 'team' as TeamMember['kind']
});

const roleDefs = [
  {
    role: 'OWNER',
    desc: 'Unrestricted access across billing, API tokens, team invites, and all brands.',
    perms: ['Billing & Subscription', 'API & MCP Tokens', 'Backoffice & Brands']
  },
  {
    role: 'EDITOR',
    desc: 'Schedule content, reply in Inbox, and build reports on assigned brands.',
    perms: ['Planner & Flows', 'Unified Inbox', 'Analytics & Reports']
  },
  {
    role: 'CLIENT_REVIEWER',
    desc: 'Review pending posts and inspect shared Studio reports.',
    perms: ['Approve/Reject Tasks', 'View Shared Reports']
  }
];

async function loadData(): Promise<void> {
  const [memRes, agRes] = await Promise.all([
    apiRequest<{ data: TeamMember[] }>('/api/v2/user-management'),
    apiRequest<{ data: AgencySettings }>('/api/v2/agency-CK/details')
  ]);
  members.value = memRes.data;
  agency.value = agRes.data;
}

async function submitInvite(): Promise<void> {
  await apiRequest('/api/v2/user-management/invite', {
    method: 'POST',
    body: JSON.stringify(inviteForm.value)
  });
  inviteForm.value.name = '';
  inviteForm.value.email = '';
  inviteOpen.value = false;
  savedMsg.value = 'Collaborator added to directory.';
  await loadData();
}

async function removeMember(id: string): Promise<void> {
  await apiRequest(`/api/v2/user-management/${id}`, { method: 'DELETE' });
  await loadData();
}

async function saveAgency(): Promise<void> {
  if (!agency.value) return;
  await apiRequest(`/api/v2/agency-CK/${agency.value.id}/smtp-configuration`, {
    method: 'PUT',
    body: JSON.stringify(agency.value)
  });
  savedMsg.value = 'Organization settings saved.';
}

async function sendTestMail(): Promise<void> {
  if (!agency.value) return;
  const res = await apiRequest<{ data: { status: string } }>(
    `/api/v2/agency-CK/${agency.value.id}/test-mail`,
    { method: 'POST', body: JSON.stringify({}) }
  );
  agency.value.lastTestStatus = res.data.status;
}

watch(() => route.path, (p) => {
  activeTab.value = tabFromPath(p);
});

onMounted(loadData);
</script>

<style scoped>
.bm-org-page {
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

.bm-saved-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-weight: 600;
}

.bm-table-scroll {
  overflow-x: auto;
  padding: 0.5rem;
}

.bm-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

.bm-table th,
.bm-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--bm-divider);
  text-align: left;
  font-size: 0.875rem;
}

.bm-roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.bm-role-card,
.bm-form-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bm-form-card {
  max-width: 660px;
}

.bm-role-list {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--bm-text-muted);
}

.bm-form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.bm-smtp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.bm-test-note {
  padding: 0.625rem 0.75rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-subtle);
  font-size: 0.875rem;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
}

@media (max-width: 640px) {
  .bm-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
