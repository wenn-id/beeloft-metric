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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 20px;
  border-radius: var(--radius-buttons);
  border: 1px solid transparent;
  font-family: var(--font-sohne);
  font-weight: 400;
  font-size: 16px;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: none;
}

.bm-btn--sm {
  min-height: 44px;
  padding: 0 18px;
  font-size: 15px;
}

.bm-btn--primary {
  background: var(--bm-brand);
  color: var(--bm-brand-text);
  border-color: var(--bm-brand);
}

.bm-btn--primary:hover:not(:disabled) {
  background: var(--bm-brand-hover);
  border-color: var(--bm-brand-hover);
}

.bm-btn--accent {
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  border-color: var(--color-sienna-brown);
}

.bm-btn--secondary {
  background: transparent;
  color: var(--bm-text);
  border-color: var(--bm-text);
}

.bm-btn--secondary:hover:not(:disabled) {
  background: var(--bm-surface);
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
}
</style>
