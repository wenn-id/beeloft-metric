import { createRouter, createWebHistory } from 'vue-router';
import { trackAttributionEvent } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';

import LandingView from '@/views/LandingView.vue';
import PricingView from '@/views/PricingView.vue';
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import PublicBioView from '@/views/PublicBioView.vue';
import LegalView from '@/views/LegalView.vue';
import StudioPublicView from '@/views/StudioPublicView.vue';

import EvolutionView from '@/views/app/EvolutionView.vue';
import ReportingView from '@/views/app/ReportingView.vue';
import InboxView from '@/views/app/InboxView.vue';
import PlannerView from '@/views/app/PlannerView.vue';
import SmartLinkView from '@/views/app/SmartLinkView.vue';
import AdvertisingView from '@/views/app/AdvertisingView.vue';
import ConnectionsView from '@/views/app/ConnectionsView.vue';
import UserSettingsView from '@/views/app/UserSettingsView.vue';
import TasksView from '@/views/app/TasksView.vue';
import TeamOrgView from '@/views/app/TeamOrgView.vue';
import AffiliationView from '@/views/app/AffiliationView.vue';
import BackofficeView from '@/views/app/BackofficeView.vue';

const editorialPublic = { public: true, editorial: true };

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash === '#capabilities') return { el: to.hash, top: 78 };
    if (to.meta.editorial && to.path !== from.path) return { top: 0 };
    return false;
  },
  routes: [
    // Public & Auth
    { path: '/', component: LandingView, meta: editorialPublic },
    { path: '/pricing', component: PricingView, meta: editorialPublic },
    { path: '/login', component: LoginView, meta: editorialPublic },
    { path: '/login/:variant', component: LoginView, meta: editorialPublic },
    { path: '/register', component: RegisterView, meta: editorialPublic },
    { path: '/activate-user', component: LoginView, meta: editorialPublic },
    { path: '/activate-collaborator', component: LoginView, meta: editorialPublic },
    { path: '/new-password', component: LoginView, meta: editorialPublic },
    { path: '/logout', redirect: '/login' },
    { path: '/oauth/:action', component: LoginView, meta: editorialPublic },
    { path: '/legal', component: LegalView, meta: editorialPublic },
    { path: '/bio/:slug', component: PublicBioView, meta: { public: true } },
    { path: '/public/smartlink/:slug', component: PublicBioView, meta: { public: true } },
    { path: '/reporting/studio/public/:id', component: StudioPublicView, meta: editorialPublic },

    // Analytics / Evolution
    { path: '/evolution', redirect: '/evolution/brandSummary' },
    { path: '/evolution/web/real-time', component: EvolutionView },
    { path: '/evolution/competitors', component: EvolutionView },
    { path: '/evolution/hashtag-tracker', component: EvolutionView },
    { path: '/evolution/hashtag-tracker/analytics', component: EvolutionView },
    { path: '/evolution/settings/:tab?', redirect: (to) => `/brands/${to.params.tab || 'connections'}` },
    { path: '/evolution/reports', redirect: '/reporting' },
    { path: '/evolution/:network', component: EvolutionView },

    // Reporting, Studio & Campaigns Dashboard
    { path: '/reporting', component: ReportingView },
    { path: '/reporting/:section', component: ReportingView },
    { path: '/reporting/:section/:sub', component: ReportingView },
    { path: '/metrifacts', redirect: '/reporting/studio' },
    { path: '/metrifacts/:pathMatch(.*)*', redirect: '/reporting/studio' },

    // Inbox
    { path: '/inbox', component: InboxView },

    // Planner, AutoLists, Flows, Library, Trash
    { path: '/planner', component: PlannerView },
    { path: '/planner/:section', component: PlannerView },

    // SmartLinks
    { path: '/smartlink', component: SmartLinkView },
    { path: '/smartlink/:section', component: SmartLinkView },

    // Advertising 5-Tab Suite
    { path: '/advertising', redirect: '/advertising/campaigns' },
    { path: '/advertising/:section', component: AdvertisingView },

    // Brand Settings 6-Tab Suite
    { path: '/brands', redirect: '/brands/connections' },
    { path: '/brands/brandSettings', redirect: '/brands/configuration' },
    { path: '/brands/connections-all', redirect: '/brands/connections' },
    { path: '/brands/networks', redirect: '/brands/connections' },
    { path: '/brand-connections', redirect: '/brands/connections' },
    { path: '/brands/:section', component: ConnectionsView },

    // User Settings
    { path: '/user-settings', redirect: '/user-settings/account' },
    { path: '/user-settings/:section', component: UserSettingsView },

    // My Tasks & Review Portals
    { path: '/my-tasks', component: TasksView },
    { path: '/my-tasks/:filter', component: TasksView },
    { path: '/review/post', component: TasksView },
    { path: '/review-portals', component: TasksView },

    // Team, Users & Organization Settings
    { path: '/user-management', component: TeamOrgView },
    { path: '/user-management/:section', component: TeamOrgView },
    { path: '/organization-settings', component: TeamOrgView },
    { path: '/organization-settings/:section', component: TeamOrgView },
    { path: '/agencies-management/:section?', redirect: '/organization-settings' },

    // Affiliation
    { path: '/affiliation', component: AffiliationView },
    { path: '/affiliation/:section', component: AffiliationView },

    // Operator Backoffice (Admin only)
    { path: '/backoffice', component: BackofficeView, meta: { requiresAdmin: true } },
    { path: '/backoffice/:section', component: BackofficeView, meta: { requiresAdmin: true } },
    { path: '/notifications', redirect: '/user-settings/notifications' },

    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach(async (to) => {
  const store = useAppStore();

  if (!to.meta.public) {
    const authed = await store.ensureBootstrapped();
    if (!authed) {
      return { path: '/login', query: { next: to.fullPath } };
    }
    if (to.meta.requiresAdmin && store.user?.role !== 'ADMIN') {
      return { path: '/evolution/brandSummary' };
    }
  }

  const qBlog = Number(to.query.blogId);
  if (
    store.isAuthenticated &&
    Number.isFinite(qBlog) &&
    qBlog > 0 &&
    store.brands.some((b) => b.blogId === qBlog) &&
    store.activeBlogId !== qBlog
  ) {
    store.setActiveBrand(qBlog).catch(() => undefined);
  }

  return true;
});

router.afterEach((to, _from, failure) => {
  if (!failure) useAppStore().applyPageTheme(to.meta.public && !to.meta.editorial ? 'light' : 'dark');
  trackAttributionEvent('route_view', to.fullPath);
});

export default router;
