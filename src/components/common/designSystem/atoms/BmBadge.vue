<template>
  <span :class="['bm-badge', `bm-badge--${tone}`]">
    <span v-if="dot" class="bm-badge__dot" aria-hidden="true"></span>
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
    dot?: boolean;
  }>(),
  {
    tone: 'neutral',
    dot: false
  }
);
</script>

<style scoped>
.bm-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 4px 12px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-divider);
  font-family: var(--font-sohne);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
}

.bm-badge--neutral {
  background: var(--bm-elevated);
  color: var(--bm-text-muted);
  border-color: var(--bm-divider);
}

.bm-badge--success {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border-color: var(--bm-brand);
}

.bm-badge--warning,
.bm-badge--danger,
.bm-badge--accent {
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  border-color: var(--color-blush-peach);
}

.bm-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
