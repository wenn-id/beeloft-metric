<template>
  <div class="bm-state bm-card" role="status" :aria-live="kind === 'error' ? 'assertive' : 'polite'">
    <div v-if="kind === 'loading'" class="bm-state__inner">
      <div class="bm-state__spinner" aria-hidden="true"></div>
      <h3 class="bm-state__title">{{ title }}</h3>
      <p class="bm-state__desc">{{ description }}</p>
    </div>

    <div v-else-if="kind === 'error'" class="bm-state__inner">
      <BmBadge tone="danger">Error</BmBadge>
      <h3 class="bm-state__title">{{ title }}</h3>
      <p class="bm-state__desc">{{ description }}</p>
      <BmButton v-if="actionLabel" variant="secondary" @click="$emit('action')">
        {{ actionLabel }}
      </BmButton>
    </div>

    <div v-else class="bm-state__inner">
      <BmBadge tone="neutral">{{ badgeText }}</BmBadge>
      <h3 class="bm-state__title">{{ title }}</h3>
      <p class="bm-state__desc">{{ description }}</p>
      <BmButton v-if="actionLabel" variant="primary" @click="$emit('action')">
        {{ actionLabel }}
      </BmButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import BmBadge from './BmBadge.vue';
import BmButton from './BmButton.vue';

withDefaults(
  defineProps<{
    kind: 'loading' | 'empty' | 'error';
    title: string;
    description: string;
    badgeText?: string;
    actionLabel?: string;
  }>(),
  {
    badgeText: 'Not connected',
    actionLabel: ''
  }
);

defineEmits<{
  (e: 'action'): void;
}>();
</script>

<style scoped>
.bm-state {
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.bm-state__inner {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.bm-state__title {
  font-size: 1.125rem;
  font-weight: 700;
}

.bm-state__desc {
  color: var(--bm-text-muted);
  font-size: 0.9375rem;
}

.bm-state__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--bm-divider);
  border-top-color: var(--bm-brand);
  border-radius: 50%;
  animation: bm-state-spin 0.75s linear infinite;
}

@keyframes bm-state-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bm-state__spinner {
    animation: none;
  }
}
</style>
