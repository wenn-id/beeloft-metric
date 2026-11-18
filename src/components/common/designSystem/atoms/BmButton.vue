<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="['bm-btn', 'bm-transition', `bm-btn--${variant}`, `bm-btn--${size}`]"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="bm-btn__spinner" aria-hidden="true"></span>
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false
  }
);

defineEmits<{
  (e: 'click', ev: MouseEvent): void;
}>();
</script>

<style scoped>
.bm-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 20px;
  border-radius: var(--radius-buttons);
  border: 1px solid transparent;
  font-family: var(--font-sohne);
  font-weight: 500;
  font-size: 15px;
  line-height: 1.2;
  white-space: nowrap;
  user-select: none;
}

.bm-btn--sm {
  min-height: 44px;
  padding: 0 16px;
  font-size: 14px;
}

.bm-btn--primary {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border-color: var(--bm-brand);
  box-shadow: var(--bm-shadow-btn-primary);
}

.bm-btn--primary:hover:not(:disabled) {
  background: var(--bm-brand-hover);
  border-color: var(--bm-brand-hover);
  transform: translateY(-1px);
}

.bm-btn--primary:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: var(--bm-shadow-btn-primary-active);
}

.bm-btn--accent {
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  border-color: var(--bm-accent);
  box-shadow: 0 2px 0 rgba(140, 47, 20, 0.22);
}

.bm-btn--accent:hover:not(:disabled) {
  transform: translateY(-1px);
}

.bm-btn--accent:active:not(:disabled) {
  transform: translateY(1px);
}

.bm-btn--secondary {
  background: var(--bm-elevated);
  color: var(--bm-text);
  border-color: var(--bm-control-border);
  box-shadow: 0 1px 0 var(--bm-border-specular) inset, 0 2px 4px rgba(24, 22, 21, 0.06);
}

.bm-btn--secondary:hover:not(:disabled) {
  background: var(--bm-surface);
  border-color: var(--bm-text);
  transform: translateY(-1px);
}

.bm-btn--secondary:active:not(:disabled) {
  transform: translateY(1px);
}

.bm-btn--ghost {
  background: transparent;
  color: var(--bm-text);
  border-color: transparent;
}

.bm-btn--ghost:hover:not(:disabled) {
  background: var(--bm-surface);
}

.bm-btn--danger {
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border-color: var(--bm-danger-border);
}

.bm-btn--danger:hover:not(:disabled) {
  transform: translateY(-1px);
}

.bm-btn--danger:active:not(:disabled) {
  transform: translateY(1px);
}

.bm-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: bm-spin 0.7s linear infinite;
}

@keyframes bm-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bm-btn__spinner {
    animation: none;
  }

  .bm-btn:hover:not(:disabled),
  .bm-btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
