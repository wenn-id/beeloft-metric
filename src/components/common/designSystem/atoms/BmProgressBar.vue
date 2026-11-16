<template>
  <div class="bm-progress" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
    <div class="bm-progress__fill" :style="{ width: `${percent}%` }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: number;
  max?: number;
}>();

const percent = computed(() => {
  const cap = props.max || 100;
  return Math.max(0, Math.min(100, Math.round((props.value / cap) * 100)));
});
</script>

<style scoped>
.bm-progress {
  width: 100%;
  height: 8px;
  background: var(--bm-subtle);
  border: 1px solid var(--bm-divider);
  border-radius: var(--bm-radius-pill);
  overflow: hidden;
}

.bm-progress__fill {
  height: 100%;
  background: var(--bm-accent);
  border-radius: var(--bm-radius-pill);
}
</style>
