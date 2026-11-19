<template>
  <div ref="rootEl" class="bm-tabs" role="tablist" :aria-label="label">
    <span
      v-if="pillReady"
      class="bm-tabs__glider"
      aria-hidden="true"
      :style="{
        transform: `translate3d(${pillLeft}px, ${pillTop}px, 0)`,
        width: `${pillWidth}px`,
        height: `${pillHeight}px`
      }"
    ></span>

    <button
      v-for="(tab, index) in tabs"
      :key="tab.id"
      :ref="(el) => setBtnRef(tab.id, el)"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :tabindex="modelValue === tab.id ? 0 : -1"
      :class="['bm-tab', 'bm-transition', { 'bm-tab--active': modelValue === tab.id }]"
      @click="$emit('update:modelValue', tab.id)"
      @keydown="onTabKeyDown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue';

export interface BmTabItem {
  id: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    tabs: BmTabItem[];
    modelValue: string;
    label?: string;
  }>(),
  {
    label: 'Section tabs'
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const rootEl = ref<HTMLElement | null>(null);
const btnMap = new Map<string, HTMLElement>();

const pillLeft = ref(4);
const pillTop = ref(4);
const pillWidth = ref(0);
const pillHeight = ref(44);
const pillReady = ref(false);

function setBtnRef(id: string, el: Element | ComponentPublicInstance | null): void {
  if (el instanceof HTMLElement) {
    btnMap.set(id, el);
  } else {
    btnMap.delete(id);
  }
}

function onTabKeyDown(event: KeyboardEvent, index: number): void {
  const last = props.tabs.length - 1;
  let target: number;
  switch (event.key) {
    case 'ArrowRight': target = index === last ? 0 : index + 1; break;
    case 'ArrowLeft': target = index === 0 ? last : index - 1; break;
    case 'Home': target = 0; break;
    case 'End': target = last; break;
    default: return;
  }
  event.preventDefault();
  const tab = props.tabs[target];
  emit('update:modelValue', tab.id);
  btnMap.get(tab.id)?.focus();
}

function measureActivePill(): void {
  const activeBtn = btnMap.get(props.modelValue);
  if (!activeBtn || !rootEl.value) {
    pillReady.value = false;
    return;
  }
  pillLeft.value = activeBtn.offsetLeft;
  pillTop.value = activeBtn.offsetTop;
  pillWidth.value = activeBtn.offsetWidth;
  pillHeight.value = activeBtn.offsetHeight;
  pillReady.value = pillWidth.value > 0;
}

watch(
  () => [props.modelValue, props.tabs.length],
  async () => {
    await nextTick();
    measureActivePill();
  },
  { immediate: true }
);

onMounted(() => {
  measureActivePill();
  window.addEventListener('resize', measureActivePill);
});

onUnmounted(() => {
  window.removeEventListener('resize', measureActivePill);
});
</script>

<style scoped>
.bm-tabs {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px;
  border-radius: var(--radius-buttons);
  background: var(--bm-subtle);
  border: 1px solid var(--bm-border-soft);
  width: fit-content;
  max-width: 100%;
}

.bm-tabs__glider {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: var(--radius-buttons);
  background: var(--bm-brand);
  pointer-events: none;
  z-index: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .bm-tabs__glider {
    transition: transform 280ms var(--ease-spring), width 260ms var(--ease-spring),
      height 220ms var(--ease-spring);
  }
}

.bm-tab {
  position: relative;
  z-index: 1;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-buttons);
  border: 1px solid transparent;
  background: transparent;
  color: var(--bm-text-muted);
  font-family: var(--font-sohne);
  font-weight: 500;
  font-size: 14px;
}

.bm-tab:hover:not(.bm-tab--active) {
  color: var(--bm-text);
  background: rgba(128, 120, 110, 0.1);
}

.bm-tab--active {
  color: var(--bm-brand-text);
}
</style>
