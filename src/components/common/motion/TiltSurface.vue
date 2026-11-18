<template>
  <component
    :is="tag"
    ref="cardEl"
    class="bm-tilt-surface"
    :class="{ 'bm-tilt-surface--active': hovering }"
    :style="surfaceStyle"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <span class="bm-tilt-surface__sheen" aria-hidden="true" :style="sheenStyle"></span>
    <div class="bm-tilt-surface__inner">
      <slot />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    tag?: string;
    maxDeg?: number;
  }>(),
  {
    tag: 'article',
    maxDeg: 3.5
  }
);

const cardEl = ref<HTMLElement | null>(null);
const rotX = ref(0);
const rotY = ref(0);
const glareX = ref(50);
const glareY = ref(50);
const hovering = ref(false);

function canTilt(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  return true;
}

function onPointerMove(ev: PointerEvent): void {
  if (!canTilt() || !cardEl.value) return;
  const rect = cardEl.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = (ev.clientX - rect.left) / rect.width;
  const ny = (ev.clientY - rect.top) / rect.height;
  rotY.value = (nx - 0.5) * 2 * props.maxDeg;
  rotX.value = (0.5 - ny) * 2 * props.maxDeg;
  glareX.value = Math.round(nx * 100);
  glareY.value = Math.round(ny * 100);
  hovering.value = true;
}

function onPointerLeave(): void {
  hovering.value = false;
  rotX.value = 0;
  rotY.value = 0;
}

const surfaceStyle = computed(() => {
  if (!hovering.value) {
    return {
      transform: 'perspective(960px) rotateX(0deg) rotateY(0deg) translateZ(0)'
    };
  }
  return {
    transform: `perspective(960px) rotateX(${rotX.value.toFixed(2)}deg) rotateY(${rotY.value.toFixed(2)}deg) translateY(-2px)`
  };
});

const sheenStyle = computed(() => ({
  opacity: hovering.value ? '1' : '0',
  background: `radial-gradient(circle 220px at ${glareX.value}% ${glareY.value}%, rgba(255, 245, 236, 0.24), transparent 72%)`
}));
</script>

<style scoped>
.bm-tilt-surface {
  position: relative;
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 280ms var(--ease-spring), box-shadow 260ms var(--ease-spring),
    border-color 220ms var(--ease-out-quart);
}

.bm-tilt-surface--active {
  transition: transform 90ms linear, box-shadow 220ms var(--ease-spring),
    border-color 180ms var(--ease-out-quart);
  border-color: rgba(140, 47, 20, 0.28);
}

.bm-tilt-surface__sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  transition: opacity 220ms var(--ease-out-quart);
}

.bm-tilt-surface__inner {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .bm-tilt-surface {
    transition: none;
  }
}
</style>
