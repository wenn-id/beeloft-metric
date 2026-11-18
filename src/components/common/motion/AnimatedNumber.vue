<template>
  <span class="tabular-nums">{{ prefix }}{{ formattedDisplay }}{{ suffix }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number | string;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  }>(),
  {
    duration: 520,
    decimals: 0,
    prefix: '',
    suffix: ''
  }
);

const currentNumeric = ref<number>(typeof props.value === 'number' ? props.value : 0);
let rafId: number | null = null;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateTo(target: number): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (prefersReducedMotion() || props.duration <= 0) {
    currentNumeric.value = target;
    return;
  }

  const startVal = currentNumeric.value;
  const delta = target - startVal;
  if (Math.abs(delta) < 0.001) {
    currentNumeric.value = target;
    return;
  }

  const startTime = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - startTime) / props.duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    currentNumeric.value = startVal + delta * eased;
    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      currentNumeric.value = target;
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(step);
}

watch(
  () => props.value,
  (next) => {
    if (typeof next === 'number' && Number.isFinite(next)) {
      animateTo(next);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
});

const formattedDisplay = computed(() => {
  if (typeof props.value !== 'number') {
    return props.value;
  }
  if (props.decimals > 0) {
    return currentNumeric.value.toLocaleString(undefined, {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals
    });
  }
  return Math.round(currentNumeric.value).toLocaleString();
});
</script>
