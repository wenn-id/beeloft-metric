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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public & Auth (Ft & Gh enums)
    { path: '/', component: LandingView },
    { path: '/pricing', component: PricingView },
    { path: '/login', component: LoginView },
    { path: '/login/:variant', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/activate-user', component: LoginView },
    { path: '/activate-collaborator', component: LoginView },
    { path: '/new-password', component: LoginView },
    { path: '/logout', redirect: '/login' },
    { path: '/oauth/:action', component: LoginView },
    { path: '/legal', component: LegalView },
    { path: '/bio/:slug', component: PublicBioView },
    { path: '/public/smartlink/:slug', component: PublicBioView },

    // Analytics / Evolution (ft enum - specific routes before :network)
    { path: '/evolution', redirect: '/evolution/brandSummary' },
    { path: '/evolution/web/real-time', component: EvolutionView },
    { path: '/evolution/competitors', component: EvolutionView },
    { path: '/evolution/hashtag-tracker', component: EvolutionView },
    { path: '/evolution/hashtag-tracker/analytics', component: EvolutionView },
    { path: '/evolution/settings/:tab?', redirect: (to) => `/brands/${to.params.tab || 'connections'}` },
    { path: '/evolution/reports', redirect: '/reporting' },
    { path: '/evolution/:network', component: EvolutionView },

    // Reporting, Studio (metrifacts) & Campaigns Dashboard (Si, cr, Ir enums)
    { path: '/reporting/studio/public/:id', component: StudioPublicView },
    { path: '/reporting', component: ReportingView },
    { path: '/reporting/:section', component: ReportingView },
    { path: '/reporting/:section/:sub', component: ReportingView },
    { path: '/metrifacts', redirect: '/reporting/studio' },
    { path: '/metrifacts/:pathMatch(.*)*', redirect: '/reporting/studio' },

    // Inbox (Ss enum)
    { path: '/inbox', component: InboxView },

    // Planner, AutoLists, Flows, Library, Trash (di / planner routes)
    { path: '/planner', component: PlannerView },
    { path: '/planner/:section', component: PlannerView },

    // SmartLinks (Ff enum)
    { path: '/smartlink', component: SmartLinkView },
    { path: '/smartlink/:section', component: SmartLinkView },

    // Advertising 5-Tab Suite (Oo enum)
    { path: '/advertising', redirect: '/advertising/campaigns' },
    { path: '/advertising/:section', component: AdvertisingView },

    // Brand Settings 6-Tab Suite (di enum)
    { path: '/brands', redirect: '/brands/connections' },
    { path: '/brands/brandSettings', redirect: '/brands/configuration' },
    { path: '/brands/connections-all', redirect: '/brands/connections' },
    { path: '/brands/networks', redirect: '/brands/connections' },
    { path: '/brand-connections', redirect: '/brands/connections' },
    { path: '/brands/:section', component: ConnectionsView },

    // User Settings (Ln enum)
    { path: '/user-settings', redirect: '/user-settings/account' },
    { path: '/user-settings/:section', component: UserSettingsView },

    // My Tasks & Review Portals (ls, Jg, Uf enums)
    { path: '/my-tasks', component: TasksView },
    { path: '/my-tasks/:filter', component: TasksView },
    { path: '/review/post', component: TasksView },
    { path: '/review-portals', component: TasksView },

    // Team, Users & Organization Settings (lA, Dd enums)
    { path: '/user-management', component: TeamOrgView },
    { path: '/user-management/:section', component: TeamOrgView },
    { path: '/organization-settings', component: TeamOrgView },
    { path: '/organization-settings/:section', component: TeamOrgView },
    { path: '/agencies-management/:section?', redirect: '/organization-settings' },

    // Affiliation (jr enum)
    { path: '/affiliation', component: AffiliationView },
    { path: '/affiliation/:section', component: AffiliationView },

    // Operator Backoffice (en enum)
    { path: '/backoffice', component: BackofficeView },
    { path: '/backoffice/:section', component: BackofficeView },
    { path: '/notifications', redirect: '/user-settings/notifications' },

    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach((to) => {
  const qBlog = Number(to.query.blogId);
  if (Number.isFinite(qBlog) && qBlog > 0) {
    const store = useAppStore();
    if (store.activeBlogId !== qBlog) {
      store.setActiveBrand(qBlog).catch(() => undefined);
    }
  }
});

router.afterEach((to) => {
  trackAttributionEvent('route_view', to.fullPath);
});

export default router;
