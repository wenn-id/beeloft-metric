<template>
  <Teleport to="body">
    <div v-if="open" class="bm-modal-backdrop" @click.self="$emit('close')">
      <div
        class="bm-modal bm-artifact"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="bm-modal__head">
          <h2 :id="titleId" class="bm-modal__title">{{ title }}</h2>
          <button
            type="button"
            class="bm-modal__close"
            aria-label="Close dialog"
            @click="$emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="bm-modal__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const titleId = `bm-modal-title-${Math.random().toString(36).slice(2, 8)}`;

function onKeyDown(ev: KeyboardEvent): void {
  if (props.open && ev.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.bm-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(23, 25, 28, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}

.bm-modal {
  width: min(640px, 100%);
  max-height: 90dvh;
  overflow-y: auto;
  border-radius: var(--radius-cards);
  box-shadow: var(--shadow-subtle-2);
  background: var(--bm-elevated);
}

.bm-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--bm-divider);
}

.bm-modal__title {
  font-family: var(--font-signifier);
  font-size: 26px;
  font-weight: 400;
  letter-spacing: -0.23px;
}

.bm-modal__close {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-divider);
  background: var(--bm-elevated);
}

.bm-modal__body {
  padding: 1.5rem;
}
</style>
