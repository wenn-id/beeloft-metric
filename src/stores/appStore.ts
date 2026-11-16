import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiRequest } from '@/services/api';
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
    Number(window.localStorage.getItem(ACTIVE_BRAND_KEY)) || 8137744
  );
  const connections = ref<BrandConnection[]>([]);
  const notifications = ref<AppNotification[]>([]);
  const features = ref<Record<string, boolean>>({});
  const theme = ref<'light' | 'dark'>(
    window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  );
  const loading = ref(false);
  const error = ref<string | null>(null);

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

  async function bootstrap(): Promise<void> {
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
      }

      await refreshConnections();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load workspace data.';
    } finally {
      loading.value = false;
    }
  }

  async function refreshConnections(): Promise<void> {
    if (!activeBlogId.value) return;
    const res = await apiRequest<{ data: BrandConnection[] }>(
      `/api/v2/settings/brands/connections?blogId=${activeBlogId.value}`
    );
    connections.value = res.data;
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
    connect?: boolean
  ): Promise<void> {
    await apiRequest(`/api/v2/settings/brands/connections/${network}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ blogId: activeBlogId.value, handle, connect })
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
    brands,
    activeBlogId,
    activeBrand,
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
    refreshConnections,
    setActiveBrand,
    createBrand,
    toggleNetworkConnection,
    markNotificationRead
  };
});
