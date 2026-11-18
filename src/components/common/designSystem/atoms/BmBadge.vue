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
  padding: 4px 11px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-divider);
  font-family: var(--font-sohne);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.01em;
}

.bm-badge--neutral {
  background: var(--bm-surface);
  color: var(--bm-text-muted);
  border-color: var(--bm-border-soft);
}

.bm-badge--success {
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border-color: var(--bm-success-border);
}

.bm-badge--warning {
  background: var(--bm-warning-bg);
  color: var(--bm-warning-text);
  border-color: var(--bm-warning-border);
}

.bm-badge--danger {
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border-color: var(--bm-danger-border);
}

.bm-badge--accent {
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  border-color: rgba(140, 47, 20, 0.3);
}

.bm-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
