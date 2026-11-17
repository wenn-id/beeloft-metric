import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ApiError, apiRequest } from '@/services/api';
import type {
  AppNotification,
  BrandConnection,
  BrandSummary,
  NetworkKey,
  UserStatus
} from '@/types/api';

const ACTIVE_BRAND_KEY = 'bm_active_blog_id';
const THEME_KEY = 'bm_theme';

export const useAppStore = defineStore('app', () => {
  const user = ref<UserStatus | null>(null);
  const brands = ref<BrandSummary[]>([]);
  const activeBlogId = ref<number>(
    Number(window.localStorage.getItem(ACTIVE_BRAND_KEY)) || 0
  );
  const connections = ref<BrandConnection[]>([]);
  const activeTrackingKey = ref<string>('');
  const notifications = ref<AppNotification[]>([]);
  const features = ref<Record<string, boolean>>({});
  const theme = ref<'light' | 'dark'>(
    window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  );
  const loading = ref(false);
  const bootstrapped = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(user.value));

  const activeBrand = computed(
    () =>
      brands.value.find((b) => b.blogId === activeBlogId.value) ??
      brands.value[0] ??
      null
  );

  const unreadNotificationsCount = computed(
    () => notifications.value.filter((n) => !n.read).length
  );

  function applyTheme(next: 'light' | 'dark'): void {
    theme.value = next;
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(THEME_KEY, next);
  }

  function toggleTheme(): void {
    applyTheme(theme.value === 'light' ? 'dark' : 'light');
  }

  async function bootstrap(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    applyTheme(theme.value);
    try {
      const [status, featRes, notifRes] = await Promise.all([
        apiRequest<UserStatus>('/api/admin/userstatus'),
        apiRequest<{ data: Record<string, boolean> }>('/api/v2/features/check-all'),
        apiRequest<{ data: AppNotification[] }>('/api/v2/notifications')
      ]);

      user.value = status;
      brands.value = status.brands;
      features.value = featRes.data;
      notifications.value = notifRes.data;

      if (!brands.value.some((b) => b.blogId === activeBlogId.value) && brands.value[0]) {
        activeBlogId.value = brands.value[0].blogId;
        window.localStorage.setItem(ACTIVE_BRAND_KEY, String(activeBlogId.value));
      }

      await refreshConnections();
      bootstrapped.value = true;
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        user.value = null;
        brands.value = [];
        connections.value = [];
        notifications.value = [];
        bootstrapped.value = true;
        return false;
      }
      error.value = err instanceof Error ? err.message : 'Failed to load workspace data.';
      bootstrapped.value = true;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function ensureBootstrapped(): Promise<boolean> {
    if (bootstrapped.value) {
      return isAuthenticated.value;
    }
    return bootstrap();
  }

  async function logout(): Promise<void> {
    await apiRequest('/api/v2/auth/logout', { method: 'POST' }).catch(() => undefined);
    user.value = null;
    brands.value = [];
    connections.value = [];
    notifications.value = [];
    activeBlogId.value = 0;
    window.localStorage.removeItem(ACTIVE_BRAND_KEY);
  }

  async function refreshConnections(): Promise<void> {
    if (!activeBlogId.value) return;
    const res = await apiRequest<{ data: BrandConnection[]; trackingKey?: string }>(
      `/api/v2/settings/brands/connections?blogId=${activeBlogId.value}`
    );
    connections.value = res.data;
    activeTrackingKey.value = res.trackingKey || '';
  }

  async function setActiveBrand(blogId: number): Promise<void> {
    activeBlogId.value = blogId;
    window.localStorage.setItem(ACTIVE_BRAND_KEY, String(blogId));
    await refreshConnections();
  }

  async function createBrand(name: string): Promise<void> {
    const res = await apiRequest<{ data: { blogId: number } }>('/api/v2/brands', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    await bootstrap();
    await setActiveBrand(res.data.blogId);
  }

  async function toggleNetworkConnection(
    network: NetworkKey,
    handle?: string,
    connect?: boolean,
    accessToken?: string,
    accountId?: string
  ): Promise<void> {
    await apiRequest(`/api/v2/settings/brands/connections/${network}/toggle`, {
      method: 'POST',
      body: JSON.stringify({
        blogId: activeBlogId.value,
        handle,
        connect,
        accessToken,
        accountId
      })
    });
    await bootstrap();
  }

  async function markNotificationRead(id: string): Promise<void> {
    await apiRequest(`/api/v2/notifications/${id}/read`, { method: 'POST' });
    const item = notifications.value.find((n) => n.id === id);
    if (item) item.read = true;
  }

  return {
    user,
    isAuthenticated,
    bootstrapped,
    brands,
    activeBlogId,
    activeBrand,
    activeTrackingKey,
    connections,
    notifications,
    unreadNotificationsCount,
    features,
    theme,
    loading,
    error,
    applyTheme,
    toggleTheme,
    bootstrap,
    ensureBootstrapped,
    logout,
    refreshConnections,
    setActiveBrand,
    createBrand,
    toggleNetworkConnection,
    markNotificationRead
  };
});
