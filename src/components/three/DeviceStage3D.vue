<template>
  <div
    ref="stageEl"
    class="bm-device-stage"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div class="bm-device-stage__bar">
      <span class="bm-device-stage__caption">{{ label }}</span>
      <button
        type="button"
        class="bm-device-stage__toggle"
        :aria-pressed="flatMode"
        @click="flatMode = !flatMode"
      >
        {{ flatMode ? 'Enable 3D tilt' : 'Flat view' }}
      </button>
    </div>

    <div class="bm-device-stage__viewport">
      <div class="bm-device-chassis" :style="chassisStyle">
        <!-- Extruded 3D titanium backplate depth layer -->
        <div class="bm-device-chassis__extrude" aria-hidden="true"></div>

        <!-- Front bezel and screen -->
        <div class="bm-device-chassis__front">
          <div class="bm-device-island" aria-hidden="true"></div>
          <div class="bm-device-screen" :style="{ backgroundColor: screenBg }">
            <slot />
          </div>
          <div class="bm-device-glare" aria-hidden="true" :style="glareStyle"></div>
        </div>
      </div>

      <div class="bm-device-shadow" aria-hidden="true" :style="shadowStyle"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

withDefaults(
  defineProps<{
    label?: string;
    screenBg?: string;
  }>(),
  {
    label: '3D Device Preview',
    screenBg: '#fcfaf7'
  }
);

const stageEl = ref<HTMLDivElement | null>(null);
const flatMode = ref(false);
const rotX = ref(4);
const rotY = ref(-8);
const glareX = ref(35);
const glareY = ref(25);

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function onPointerMove(ev: PointerEvent): void {
  if (flatMode.value || reducedMotion() || !stageEl.value) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const rect = stageEl.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = (ev.clientX - rect.left) / rect.width;
  const ny = (ev.clientY - rect.top) / rect.height;
  rotY.value = (nx - 0.5) * 18;
  rotX.value = (0.5 - ny) * 14;
  glareX.value = Math.round(nx * 100);
  glareY.value = Math.round(ny * 100);
}

function onPointerLeave(): void {
  rotX.value = 4;
  rotY.value = -8;
  glareX.value = 35;
  glareY.value = 25;
}

const chassisStyle = computed(() => {
  if (flatMode.value || reducedMotion()) {
    return {
      transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg)'
    };
  }
  return {
    transform: `perspective(1100px) rotateX(${rotX.value.toFixed(2)}deg) rotateY(${rotY.value.toFixed(2)}deg)`
  };
});

const glareStyle = computed(() => ({
  opacity: flatMode.value ? '0.12' : '0.36',
  background: `radial-gradient(circle 180px at ${glareX.value}% ${glareY.value}%, rgba(255,255,255,0.65), transparent 72%)`
}));

const shadowStyle = computed(() => {
  if (flatMode.value || reducedMotion()) {
    return { transform: 'translateX(0px) scale(0.92)' };
  }
  const shiftX = (-rotY.value * 1.3).toFixed(1);
  return {
    transform: `translateX(${shiftX}px) scale(0.95)`
  };
});
</script>

<style scoped>
.bm-device-stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bm-device-stage__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.bm-device-stage__caption {
  font-size: 13px;
  font-weight: 600;
  color: var(--bm-text-muted);
}

.bm-device-stage__toggle {
  min-height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-control-border);
  background: var(--bm-elevated);
  color: var(--bm-text);
  font-size: 12px;
  font-weight: 600;
}

.bm-device-stage__viewport {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 8px 18px;
}

.bm-device-chassis {
  position: relative;
  width: min(296px, 100%);
  transform-style: preserve-3d;
  transition: transform 240ms var(--ease-spring);
}

.bm-device-chassis__extrude {
  position: absolute;
  inset: 0;
  border-radius: 38px;
  background: linear-gradient(145deg, #4b443e, #1f1c1a);
  transform: translateZ(-10px) translateX(4px) translateY(5px);
  box-shadow: 0 18px 34px rgba(17, 18, 21, 0.28);
}

.bm-device-chassis__front {
  position: relative;
  border-radius: 36px;
  padding: 11px;
  background: linear-gradient(160deg, #2d2926, #141312);
  border: 1px solid rgba(255, 255, 255, 0.22);
  overflow: hidden;
}

.bm-device-island {
  width: 74px;
  height: 18px;
  border-radius: 9999px;
  background: #0c0b0b;
  margin: 4px auto 10px;
}

.bm-device-screen {
  min-height: 410px;
  max-height: 460px;
  overflow-y: auto;
  border-radius: 26px;
  padding: 18px 14px;
  color: #181615;
}

.bm-device-glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 36px;
}

.bm-device-shadow {
  width: 210px;
  height: 18px;
  margin-top: 14px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(24, 22, 21, 0.26), transparent 72%);
  transition: transform 240ms var(--ease-spring);
}

@media (prefers-reduced-motion: reduce) {
  .bm-device-chassis,
  .bm-device-shadow {
    transition: none;
  }
}
</style>
