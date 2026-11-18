<template>
  <Teleport to="body">
    <div v-if="open" class="bm-cmd-backdrop" @click.self="$emit('close')">
      <div
        class="bm-cmd-dialog bm-artifact"
        role="dialog"
        aria-modal="true"
        aria-label="Quick workspace jump"
        @keydown="onDialogKeydown"
      >
        <div class="bm-cmd-head">
          <label for="bm-cmd-input" class="sr-only">Search pages, brands, or commands</label>
          <input
            id="bm-cmd-input"
            ref="searchInput"
            v-model="query"
            type="text"
            class="bm-cmd-input"
            placeholder="Jump to section, switch brand, or toggle theme..."
            autocomplete="off"
          />
          <button type="button" class="bm-cmd-esc" aria-label="Close quick jump" @click="$emit('close')">
            Esc
          </button>
        </div>

        <div class="bm-cmd-list" role="listbox" aria-label="Matching actions">
          <div v-if="filteredItems.length === 0" class="bm-cmd-empty">
            No matching workspace destination for "{{ query }}".
          </div>

          <button
            v-for="(item, idx) in filteredItems"
            :key="item.id"
            type="button"
            role="option"
            :aria-selected="idx === selectedIdx"
            class="bm-cmd-item"
            :class="{ 'bm-cmd-item--selected': idx === selectedIdx }"
            @mouseenter="selectedIdx = idx"
            @click="runItem(item)"
          >
            <div class="bm-cmd-item__left">
              <span class="bm-cmd-item__cat">{{ item.category }}</span>
              <strong>{{ item.label }}</strong>
            </div>
            <span class="bm-cmd-item__hint">{{ item.hint }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';

interface PaletteAction {
  id: string;
  category: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open-add-brand'): void;
}>();

const router = useRouter();
const store = useAppStore();
const query = ref('');
const selectedIdx = ref(0);
const searchInput = ref<HTMLInputElement | null>(null);

function go(path: string): void {
  const q: Record<string, string> = {};
  if (store.activeBlogId) q.blogId = String(store.activeBlogId);
  if (store.user?.userId) q.userId = String(store.user.userId);
  router.push({ path, query: q });
  emit('close');
}

const allItems = computed<PaletteAction[]>(() => {
  const list: PaletteAction[] = [
    {
      id: 'nav-summary',
      category: 'Analytics',
      label: 'Brand Summary Overview',
      hint: '/evolution/brandSummary',
      run: () => go('/evolution/brandSummary')
    },
    {
      id: 'nav-rt-globe',
      category: '3D Live',
      label: 'Real-Time 3D Visitor Globe',
      hint: '/evolution/web/real-time',
      run: () => go('/evolution/web/real-time')
    },
    {
      id: 'nav-planner',
      category: 'Publishing',
      label: 'Planning Calendar, AI Composer & Flows',
      hint: '/planner',
      run: () => go('/planner')
    },
    {
      id: 'nav-smartlink',
      category: '3D Studio',
      label: 'SmartLinks Bio Studio & 3D Device Preview',
      hint: '/smartlink',
      run: () => go('/smartlink')
    },
    {
      id: 'nav-inbox',
      category: 'Engage',
      label: 'Unified Social Inbox',
      hint: '/inbox',
      run: () => go('/inbox')
    },
    {
      id: 'nav-reports',
      category: 'Reports',
      label: 'PDF/PPTX Reports & Reporting Studio',
      hint: '/reporting',
      run: () => go('/reporting')
    },
    {
      id: 'nav-ads',
      category: 'Paid Media',
      label: 'Advertising Campaigns & ROAS',
      hint: '/advertising/campaigns',
      run: () => go('/advertising/campaigns')
    },
    {
      id: 'nav-connections',
      category: 'Setup',
      label: 'Brand Connections & Website Tracker',
      hint: '/brands/connections',
      run: () => go('/brands/connections')
    },
    {
      id: 'nav-settings',
      category: 'Account',
      label: 'Account Profile, Password & Billing',
      hint: '/user-settings/account',
      run: () => go('/user-settings/account')
    },
    {
      id: 'nav-security',
      category: 'Security',
      label: 'REST API Token, MCP & 2FA Authenticator',
      hint: '/user-settings/api',
      run: () => go('/user-settings/api')
    },
    {
      id: 'act-theme',
      category: 'Appearance',
      label: `Switch to ${store.theme === 'light' ? 'Dark Obsidian' : 'Warm Light'} Theme`,
      hint: 'Toggle theme',
      run: () => {
        store.toggleTheme();
        emit('close');
      }
    },
    {
      id: 'act-new-brand',
      category: 'Workspace',
      label: 'Create New Brand Workspace',
      hint: '+ Add brand',
      run: () => {
        emit('close');
        emit('open-add-brand');
      }
    }
  ];

  if (store.user?.role === 'ADMIN') {
    list.push({
      id: 'nav-backoffice',
      category: 'Admin',
      label: 'Operator Backoffice & Feature Flags',
      hint: '/backoffice/feature-flags',
      run: () => go('/backoffice/feature-flags')
    });
  }

  for (const b of store.brands) {
    list.push({
      id: `brand-${b.blogId}`,
      category: 'Switch Brand',
      label: b.name,
      hint: b.blogId === store.activeBlogId ? 'Active' : `${b.connectionsCount} ch`,
      run: async () => {
        await store.setActiveBrand(b.blogId);
        emit('close');
      }
    });
  }

  return list;
});

const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allItems.value;
  return allItems.value.filter(
    (it) =>
      it.label.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      it.hint.toLowerCase().includes(q)
  );
});

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      query.value = '';
      selectedIdx.value = 0;
      await nextTick();
      searchInput.value?.focus();
    }
  }
);

watch(query, () => {
  selectedIdx.value = 0;
});

function runItem(item: PaletteAction): void {
  item.run();
}

function onDialogKeydown(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') {
    ev.preventDefault();
    emit('close');
    return;
  }
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    if (filteredItems.value.length > 0) {
      selectedIdx.value = (selectedIdx.value + 1) % filteredItems.value.length;
    }
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    if (filteredItems.value.length > 0) {
      selectedIdx.value =
        (selectedIdx.value - 1 + filteredItems.value.length) % filteredItems.value.length;
    }
  } else if (ev.key === 'Enter') {
    const target = filteredItems.value[selectedIdx.value];
    if (target) {
      ev.preventDefault();
      runItem(target);
    }
  }
}
</script>

<style scoped>
.bm-cmd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(17, 18, 21, 0.48);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10vh 16px 24px;
}

.bm-cmd-dialog {
  width: min(620px, 100%);
  max-height: 76dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.bm-cmd-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bm-divider);
}

.bm-cmd-input {
  flex: 1;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--bm-text);
  outline: none;
}

.bm-cmd-esc {
  min-height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-inputs);
  border: 1px solid var(--bm-divider);
  background: var(--bm-surface);
  color: var(--bm-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.bm-cmd-list {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bm-cmd-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--bm-text-muted);
  font-size: 14px;
}

.bm-cmd-item {
  width: 100%;
  min-height: 46px;
  padding: 8px 12px;
  border-radius: var(--radius-inputs);
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
}

.bm-cmd-item--selected {
  background: var(--bm-surface);
  border-color: var(--bm-border-soft);
}

.bm-cmd-item__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bm-cmd-item__cat {
  padding: 2px 8px;
  border-radius: var(--radius-buttons);
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.bm-cmd-item__hint {
  font-size: 12px;
  color: var(--bm-text-muted);
  white-space: nowrap;
}
</style>
