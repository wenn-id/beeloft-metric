<template>
  <div class="bm-tabs" role="tablist" :aria-label="label">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :class="['bm-tab', 'bm-transition', { 'bm-tab--active': modelValue === tab.id }]"
      @click="$emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export interface BmTabItem {
  id: string;
  label: string;
}

withDefaults(
  defineProps<{
    tabs: BmTabItem[];
    modelValue: string;
    label?: string;
  }>(),
  {
    label: 'Section tabs'
  }
);

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>

<style scoped>
.bm-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px;
  border-radius: var(--radius-buttons);
  background: var(--bm-surface);
  width: fit-content;
  max-width: 100%;
}

.bm-tab {
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--radius-buttons);
  border: 1px solid transparent;
  background: transparent;
  color: var(--bm-text-muted);
  font-family: var(--font-sohne);
  font-weight: 400;
  font-size: 15px;
}

.bm-tab:hover {
  color: var(--bm-text);
  background: var(--bm-elevated);
}

.bm-tab--active {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  font-weight: 500;
}
</style>
