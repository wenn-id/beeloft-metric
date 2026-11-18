<template>
  <div class="bm-shell">
    <a href="#main-content" class="bm-skip-link">Skip to main content</a>

    <header class="bm-topbar">
      <div class="bm-topbar__inner">
        <div class="bm-topbar__left">
          <router-link :to="brandUrl('/evolution/brandSummary')" class="bm-brand-link">
            <span class="bm-brand-text">
              <strong class="bm-shell-wordmark">BeeloftMetric</strong>
            </span>
          </router-link>

          <nav class="bm-primary-nav" aria-label="Primary sections">
            <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="brandUrl(item.to)"
              class="bm-nav-item bm-transition"
              :class="{ 'bm-nav-item--active': route.path.startsWith(item.matchPrefix) }"
            >
              {{ item.label }}
            </router-link>
          </nav>
        </div>

        <div class="bm-topbar__right">
          <button
            type="button"
            class="bm-mobile-menu-btn bm-topbar-btn"
            :aria-expanded="mobileNavOpen"
            @click="mobileNavOpen = !mobileNavOpen"
          >
            Menu
          </button>

          <router-link :to="brandUrl('/user-settings/plan')" class="bm-plan-pill">
            {{ formattedPlan }}
          </router-link>

          <div class="bm-dropdown-wrap">
            <button
              type="button"
              class="bm-topbar-btn bm-brand-btn"
              :aria-expanded="brandMenuOpen"
              @click="toggleBrandMenu"
            >
              <span class="bm-brand-btn__name">{{ store.activeBrand?.name || 'Select brand' }}</span>
              <span aria-hidden="true">v</span>
            </button>

            <div v-if="brandMenuOpen" class="bm-popover bm-artifact" role="menu">
              <p class="bm-popover__heading">Switch brand</p>
              <button
                v-for="brand in store.brands"
                :key="brand.blogId"
                type="button"
                role="menuitem"
                class="bm-popover__item"
                :class="{ 'bm-popover__item--active': brand.blogId === store.activeBlogId }"
                @click="selectBrand(brand.blogId)"
              >
                <span>{{ brand.name }}</span>
                <span class="bm-popover__meta tabular-nums">{{ brand.connectionsCount }} ch</span>
              </button>

              <div class="bm-popover__divider"></div>
              <p class="bm-popover__caption tabular-nums">
                <template v-if="isUnlimitedUser">
                  {{ store.brands.length }} brands active · Unlimited quota
                </template>
                <template v-else>
                  {{ store.brands.length }} of {{ store.user?.brandLimit ?? 10 }} brands used
                </template>
              </p>
              <BmButton variant="primary" size="sm" @click="openAddBrand">
                + Add brand
              </BmButton>
            </div>
          </div>

          <button
            type="button"
            class="bm-topbar-btn"
            :aria-label="`Switch to ${store.theme === 'light' ? 'dark' : 'light'} theme`"
            @click="store.toggleTheme()"
          >
            {{ store.theme === 'light' ? 'Dark' : 'Light' }}
          </button>

          <button
            type="button"
            class="bm-topbar-btn bm-notif-btn"
            aria-label="Open notifications drawer"
            :aria-expanded="notifDrawerOpen"
            @click="openNotifDrawer"
          >
            <span>Alerts</span>
            <span v-if="store.unreadNotificationsCount > 0" class="bm-count-pill tabular-nums">
              {{ store.unreadNotificationsCount }}
            </span>
          </button>

          <button
            type="button"
            class="bm-topbar-btn bm-topbar-btn--filled"
            aria-label="Open user account drawer"
            :aria-expanded="userDrawerOpen"
            @click="openUserDrawer"
          >
            Account
          </button>
        </div>
      </div>
    </header>

    <div v-if="mobileNavOpen" class="bm-mobile-drawer">
      <nav aria-label="Mobile sections" class="bm-mobile-drawer__list">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="brandUrl(item.to)"
          class="bm-mobile-drawer__link"
          :class="{ 'bm-mobile-drawer__link--active': route.path.startsWith(item.matchPrefix) }"
          @click="mobileNavOpen = false"
        >
          {{ item.label }}
        </router-link>
        <router-link
          :to="brandUrl('/brands/connections')"
          class="bm-mobile-drawer__link"
          @click="mobileNavOpen = false"
        >
          Brand Connections
        </router-link>
        <router-link
          :to="brandUrl('/my-tasks')"
          class="bm-mobile-drawer__link"
          @click="mobileNavOpen = false"
        >
          My Tasks
        </router-link>
      </nav>
    </div>

    <main id="main-content" class="bm-main">
      <slot />
    </main>

    <!-- Notifications Drawer -->
    <div v-if="notifDrawerOpen" class="bm-drawer-backdrop" @click.self="notifDrawerOpen = false">
      <aside class="bm-drawer bm-artifact" role="dialog" aria-modal="true" aria-label="Notifications">
        <div class="bm-drawer__head">
          <h2>Notifications</h2>
          <button type="button" class="bm-drawer__close" aria-label="Close notifications" @click="notifDrawerOpen = false">
            Close
          </button>
        </div>

        <BmTabs v-model="notifTab" :tabs="notifTabs" label="Notification filter" />

        <div class="bm-drawer__list">
          <div v-if="filteredNotifications.length === 0" class="bm-drawer__empty">
            All notifications in this view have been read.
          </div>
          <article
            v-for="n in filteredNotifications"
            :key="n.id"
            class="bm-notif-card bm-card"
          >
            <div class="bm-notif-card__top">
              <strong>{{ n.title }}</strong>
              <BmBadge :tone="n.read ? 'neutral' : 'accent'">
                {{ n.read ? 'Read' : 'Unread' }}
              </BmBadge>
            </div>
            <p class="bm-notif-card__body">{{ n.body }}</p>
            <div class="bm-notif-card__foot">
              <small>{{ n.createdAt.slice(0, 10) }}</small>
              <button
                v-if="!n.read"
                type="button"
                class="bm-text-action"
                @click="store.markNotificationRead(n.id)"
              >
                Mark as read
              </button>
            </div>
          </article>
        </div>
      </aside>
    </div>

    <!-- User Account Drawer -->
    <div v-if="userDrawerOpen" class="bm-drawer-backdrop" @click.self="userDrawerOpen = false">
      <aside class="bm-drawer bm-artifact" role="dialog" aria-modal="true" aria-label="Account menu">
        <div class="bm-drawer__head">
          <h2>Account & Workspace</h2>
          <button type="button" class="bm-drawer__close" aria-label="Close account menu" @click="userDrawerOpen = false">
            Close
          </button>
        </div>

        <div class="bm-account-summary bm-card">
          <p class="bm-account-summary__name">{{ store.user?.name || 'Beeloft Operator' }}</p>
          <p class="bm-account-summary__email">{{ store.user?.email }}</p>
          <div class="bm-account-summary__tags">
            <BmBadge tone="accent">{{ formattedPlan }}</BmBadge>
            <BmBadge tone="neutral">User ID: {{ store.user?.userId }}</BmBadge>
          </div>
        </div>

        <nav aria-label="Account links" class="bm-account-links">
          <router-link :to="brandUrl('/user-settings/account')" class="bm-account-link" @click="userDrawerOpen = false">
            Account Settings
          </router-link>
          <router-link :to="brandUrl('/user-settings/plan')" class="bm-account-link" @click="userDrawerOpen = false">
            Subscription & Plans
          </router-link>
          <router-link :to="brandUrl('/user-settings/api')" class="bm-account-link" @click="userDrawerOpen = false">
            API, MCP & 2FA
          </router-link>
          <router-link :to="brandUrl('/brands/connections')" class="bm-account-link" @click="userDrawerOpen = false">
            Brand Connections & Settings
          </router-link>
          <router-link :to="brandUrl('/my-tasks')" class="bm-account-link" @click="userDrawerOpen = false">
            My Tasks & Approvals
          </router-link>
          <router-link :to="brandUrl('/user-management/users')" class="bm-account-link" @click="userDrawerOpen = false">
            Team & Organization
          </router-link>
          <router-link :to="brandUrl('/affiliation/general')" class="bm-account-link" @click="userDrawerOpen = false">
            Affiliation Program
          </router-link>
          <router-link
            v-if="store.user?.role === 'ADMIN'"
            :to="brandUrl('/backoffice/feature-flags')"
            class="bm-account-link"
            @click="userDrawerOpen = false"
          >
            Operator Backoffice
          </router-link>
          <router-link to="/pricing" class="bm-account-link" @click="userDrawerOpen = false">
            Public Pricing Overview
          </router-link>
          <router-link to="/" class="bm-account-link" @click="userDrawerOpen = false">
            Editorial Landing Page
          </router-link>
        </nav>

        <div class="bm-account-footer">
          <BmButton variant="danger" @click="handleLogout">Log out</BmButton>
        </div>
      </aside>
    </div>

    <!-- Add Brand Modal -->
    <BmModal :open="addBrandOpen" title="Create New Brand" @close="addBrandOpen = false">
      <form class="bm-form-stack" @submit.prevent="submitNewBrand">
        <div>
          <label for="new-brand-name" class="bm-label">Brand name</label>
          <input
            id="new-brand-name"
            v-model="newBrandName"
            type="text"
            class="bm-input"
            placeholder="Your brand or client name"
            required
          />
        </div>
        <p v-if="addBrandError" class="bm-error-text">{{ addBrandError }}</p>
        <div class="bm-modal-actions">
          <BmButton variant="secondary" @click="addBrandOpen = false">Cancel</BmButton>
          <BmButton type="submit" variant="primary" :loading="creatingBrand">Create brand</BmButton>
        </div>
      </form>
    </BmModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import BmBadge from '@/components/common/designSystem/atoms/BmBadge.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import BmModal from '@/components/common/designSystem/atoms/BmModal.vue';
import BmTabs from '@/components/common/designSystem/atoms/BmTabs.vue';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const mobileNavOpen = ref(false);
const brandMenuOpen = ref(false);
const notifDrawerOpen = ref(false);
const userDrawerOpen = ref(false);
const addBrandOpen = ref(false);
const newBrandName = ref('');
const addBrandError = ref('');
const creatingBrand = ref(false);
const notifTab = ref('update');

const notifTabs = [
  { id: 'update', label: 'Updates' },
  { id: 'unread', label: 'Unread' }
];

const navItems = [
  { label: 'Analytics', to: '/evolution/brandSummary', matchPrefix: '/evolution' },
  { label: 'Reports', to: '/reporting', matchPrefix: '/reporting' },
  { label: 'Inbox', to: '/inbox', matchPrefix: '/inbox' },
  { label: 'Planning', to: '/planner', matchPrefix: '/planner' },
  { label: 'SmartLinks', to: '/smartlink', matchPrefix: '/smartlink' },
  { label: 'Ads', to: '/advertising/campaigns', matchPrefix: '/advertising' }
];

const isUnlimitedUser = computed(
  () => store.user?.role === 'ADMIN' || (store.user?.brandLimit ?? 0) >= 999999
);

const formattedPlan = computed(() => {
  if (isUnlimitedUser.value) return 'Unlimited';
  if (store.user?.trialActive) {
    const days = store.user.trialDaysRemaining ?? 7;
    return `Trial (${days}d left)`;
  }
  const plan = store.user?.plan || 'FREE';
  if (plan === 'ENTERPRISE_CUSTOM') return 'Enterprise';
  return plan.charAt(0) + plan.slice(1).toLowerCase();
});

const filteredNotifications = computed(() => {
  if (notifTab.value === 'unread') {
    return store.notifications.filter((n) => !n.read);
  }
  return store.notifications;
});

function brandUrl(path: string): string {
  if (!store.activeBlogId) return path;
  const uid = store.user?.userId;
  return uid ? `${path}?blogId=${store.activeBlogId}&userId=${uid}` : `${path}?blogId=${store.activeBlogId}`;
}

function toggleBrandMenu(): void {
  brandMenuOpen.value = !brandMenuOpen.value;
  notifDrawerOpen.value = false;
  userDrawerOpen.value = false;
}

function openNotifDrawer(): void {
  notifDrawerOpen.value = true;
  brandMenuOpen.value = false;
  userDrawerOpen.value = false;
}

function openUserDrawer(): void {
  userDrawerOpen.value = true;
  brandMenuOpen.value = false;
  notifDrawerOpen.value = false;
}

async function selectBrand(blogId: number): Promise<void> {
  brandMenuOpen.value = false;
  await store.setActiveBrand(blogId);
  await router.replace({
    path: route.path,
    query: { ...route.query, blogId: String(blogId), ...(store.user?.userId ? { userId: String(store.user.userId) } : {}) }
  });
}

function openAddBrand(): void {
  brandMenuOpen.value = false;
  addBrandError.value = '';
  newBrandName.value = '';
  addBrandOpen.value = true;
}

async function submitNewBrand(): Promise<void> {
  creatingBrand.value = true;
  addBrandError.value = '';
  try {
    await store.createBrand(newBrandName.value);
    addBrandOpen.value = false;
  } catch (err) {
    addBrandError.value = err instanceof Error ? err.message : 'Unable to create brand.';
  } finally {
    creatingBrand.value = false;
  }
}

async function handleLogout(): Promise<void> {
  await store.logout();
  userDrawerOpen.value = false;
  await router.push('/login');
}

function onEscape(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') {
    brandMenuOpen.value = false;
    notifDrawerOpen.value = false;
    userDrawerOpen.value = false;
    mobileNavOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onEscape);
  if (!store.user) {
    store.bootstrap();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape);
});
</script>

<style scoped>
.bm-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bm-bg);
}

.bm-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bm-chrome-bg);
  color: var(--bm-chrome-text);
  border-bottom: 1px solid var(--bm-divider);
}

.bm-topbar__inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 68px;
  padding: 8px 20px;
}

.bm-topbar__left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.bm-brand-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  min-height: 44px;
  flex-shrink: 0;
}

.bm-shell-wordmark {
  font-family: var(--font-signifier);
  font-weight: 400;
  font-size: 22px;
  letter-spacing: -0.02em;
}

.bm-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}

.bm-brand-text strong {
  font-weight: 500;
  font-size: 16px;
}

.bm-logo-note {
  font-size: 0.5625rem;
  color: var(--bm-chrome-muted);
  white-space: nowrap;
}

.bm-primary-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bm-nav-item {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  border-radius: var(--radius-buttons);
  text-decoration: none;
  color: var(--bm-chrome-muted);
  font-size: 15px;
  font-weight: 400;
  white-space: nowrap;
}

.bm-nav-item:hover {
  color: var(--bm-chrome-text);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.bm-nav-item--active {
  color: var(--bm-chrome-text);
  background: var(--bm-chrome-active-bg);
  font-weight: 500;
}

.bm-topbar__right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.bm-plan-pill {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: var(--radius-buttons);
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}

.bm-topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  padding: 0 14px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-divider);
  background: transparent;
  color: var(--bm-chrome-text);
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
}

.bm-topbar-btn:hover {
  background: var(--bm-chrome-active-bg);
}

.bm-topbar-btn--filled {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border-color: var(--bm-brand);
}

.bm-topbar-btn--filled:hover {
  background: var(--bm-brand-hover);
}

.bm-brand-btn__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bm-count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-buttons);
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  font-size: 12px;
  font-weight: 500;
}

.bm-dropdown-wrap {
  position: relative;
}

.bm-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 280px;
  padding: 12px;
  color: var(--bm-text);
  box-shadow: var(--shadow-subtle);
  border-radius: var(--radius-elevatedcards);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bm-popover__heading {
  font-size: 12px;
  font-weight: 500;
  color: var(--bm-text-muted);
  padding: 4px 8px;
}

.bm-popover__item {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-inputs);
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  font-weight: 400;
  font-size: 14px;
}

.bm-popover__item:hover {
  background: var(--bm-surface);
}

.bm-popover__item--active {
  background: var(--bm-surface);
  font-weight: 500;
}

.bm-popover__meta {
  font-size: 12px;
  color: var(--bm-text-muted);
}

.bm-popover__divider {
  border-top: 1px solid var(--bm-divider);
  margin: 4px 0;
}

.bm-popover__caption {
  font-size: 12px;
  color: var(--bm-text-muted);
  padding: 0 4px;
}

.bm-mobile-menu-btn {
  display: none;
}

.bm-mobile-drawer {
  background: var(--bm-chrome-bg);
  color: var(--bm-chrome-text);
  padding: 12px 16px;
  border-bottom: 1px solid var(--bm-divider);
}

.bm-mobile-drawer__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bm-mobile-drawer__link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: var(--radius-buttons);
  text-decoration: none;
  font-weight: 400;
}

.bm-mobile-drawer__link--active {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
}

.bm-main {
  flex: 1;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 20px;
}

.bm-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(23, 25, 28, 0.35);
  z-index: 80;
  display: flex;
  justify-content: flex-end;
}

.bm-drawer {
  width: min(380px, 100%);
  height: 100%;
  border-radius: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  box-shadow: var(--shadow-subtle-2);
}

.bm-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bm-drawer__head h2 {
  font-size: 24px;
}

.bm-drawer__close {
  min-height: 44px;
  padding: 0 16px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-text);
  background: transparent;
  font-weight: 400;
}

.bm-drawer__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bm-drawer__empty {
  color: var(--bm-text-muted);
  padding: 16px 0;
}

.bm-notif-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bm-notif-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.bm-notif-card__body {
  font-size: 14px;
  color: var(--bm-text-muted);
}

.bm-notif-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bm-text-action {
  border: none;
  background: transparent;
  color: var(--bm-accent);
  font-weight: 500;
  font-size: 13px;
  min-height: 36px;
}

.bm-account-summary {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bm-account-summary__name {
  font-weight: 500;
}

.bm-account-summary__email {
  color: var(--bm-text-muted);
  font-size: 14px;
}

.bm-account-summary__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.bm-account-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bm-account-link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: var(--radius-buttons);
  text-decoration: none;
  font-weight: 400;
}

.bm-account-link:hover {
  background: var(--bm-surface);
}

.bm-account-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--bm-divider);
}

.bm-form-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.bm-error-text {
  color: var(--color-sienna-brown);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 1140px) {
  .bm-primary-nav,
  .bm-plan-pill {
    display: none;
  }

  .bm-mobile-menu-btn {
    display: inline-flex;
  }
}

@media (max-width: 640px) {
  .bm-topbar__inner {
    padding: 8px 12px;
  }

  .bm-brand-btn__name {
    max-width: 90px;
  }

  .bm-main {
    padding: 20px 14px;
  }
}
</style>
