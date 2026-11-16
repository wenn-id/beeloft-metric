<template>
  <button
    v-if="clickable"
    type="button"
    :class="['bm-chip', 'bm-transition', { 'bm-chip--active': active }]"
    :aria-pressed="active"
    @click="$emit('click')"
  >
    <slot />
  </button>
  <span v-else :class="['bm-chip', { 'bm-chip--active': active }]">
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean;
    clickable?: boolean;
  }>(),
  {
    active: false,
    clickable: true
  }
);

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<style scoped>
.bm-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  padding: 0 0.875rem;
  border-radius: var(--bm-radius-pill);
  border: 1px solid var(--bm-control-border);
  background: var(--bm-surface);
  color: var(--bm-text);
  font-size: 0.875rem;
  font-weight: 600;
}

.bm-chip--active {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border-color: var(--bm-brand);
}
</style>
