<template>
  <Teleport to="body">
    <div v-if="open" class="bm-modal-backdrop" @click.self="$emit('close')">
      <div
        class="bm-modal bm-artifact"
        :class="{ 'bm-modal--wide': wide }"
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
  wide?: boolean;
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
  background: rgba(6, 8, 13, 0.7);
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
  border: 1px solid var(--bm-divider);
  box-shadow: var(--bm-shadow-lift);
  background: var(--bm-elevated);
  color: var(--bm-text);
}

.bm-modal--wide {
  width: min(920px, 100%);
}

.bm-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem clamp(14px, 3vw, 24px);
  border-bottom: 1px solid var(--bm-divider);
}

.bm-modal__title {
  font-family: var(--font-signifier);
  font-size: clamp(1.5rem, 3.5vw, 2.25rem);
  font-weight: 300;
  letter-spacing: -0.035em;
}

.bm-modal__close {
  flex: none;
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
  padding: clamp(14px, 3vw, 24px);
}
</style>
