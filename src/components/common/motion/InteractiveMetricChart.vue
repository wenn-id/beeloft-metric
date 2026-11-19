<template>
  <div class="bm-ic-wrap">
    <div v-if="activePoint" class="bm-ic-readout tabular-nums">
      <select
        :value="pointIndex"
        class="bm-ic-readout__date"
        aria-label="Day shown in chart"
        @change="selectDay"
      >
        <option v-for="(day, index) in series" :key="day.date" :value="index">{{ day.date }}</option>
      </select>
      <div class="bm-ic-readout__metrics" aria-live="polite">
        <span>Impressions: <strong>{{ activePoint.impressions.toLocaleString() }}</strong></span>
        <span>Reach: <strong>{{ activePoint.reach.toLocaleString() }}</strong></span>
        <span>Followers: <strong>{{ activePoint.followers.toLocaleString() }}</strong></span>
      </div>
    </div>

    <div ref="plotBox" class="bm-ic-svg-box">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        class="bm-ic-svg"
        role="group"
        aria-label="Interactive daily impressions and reach chart"
        @pointerleave="activeIdx = null"
      >
        <defs>
          <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--bm-chart-line)" stop-opacity="0.16" />
            <stop offset="100%" stop-color="var(--bm-chart-line)" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Subtle horizontal reference lines -->
        <g v-for="level in gridLevels" :key="level" aria-hidden="true">
          <line
            :x1="plotLeft"
            :x2="plotRight"
            :y1="valY(maxVal * level)"
            :y2="valY(maxVal * level)"
            stroke="var(--bm-divider)"
            stroke-dasharray="3 4"
          />
          <text
            :x="plotLeft - 9"
            :y="valY(maxVal * level)"
            text-anchor="end"
            dominant-baseline="middle"
            font-size="12"
            fill="var(--bm-text-muted)"
          >{{ axisNumber.format(maxVal * level) }}</text>
        </g>

        <!-- Impressions bars -->
        <g v-for="(pt, idx) in series" :key="pt.date">
          <rect
            :x="barX(idx)"
            :y="valY(pt.impressions)"
            :width="barWidth"
            :height="Math.max(2, plotBottom - valY(pt.impressions))"
            :fill="highlightedIndex === idx ? 'var(--bm-chart-bar)' : 'var(--bm-chart-bar-muted)'"
            rx="2"
            class="bm-ic-bar"
          />
          <text
            v-if="idx % labelStride === 0"
            :x="pointX(idx)"
            :y="height - 8"
            text-anchor="middle"
            font-size="11"
            fill="var(--bm-text-muted)"
          >
            {{ pt.date.slice(5) }}
          </text>
        </g>

        <!-- Smooth Reach area & curve -->
        <path v-if="areaPath" :d="areaPath" :fill="`url(#${gradId})`" />
        <path
          v-if="curvePath"
          :d="curvePath"
          fill="none"
          stroke="var(--bm-chart-line)"
          stroke-width="2.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="bm-ic-line"
        />

        <!-- Magnetic crosshair & active dot -->
        <g v-if="highlightedIndex !== null && activePoint" aria-hidden="true">
          <line
            :x1="pointX(highlightedIndex)"
            :x2="pointX(highlightedIndex)"
            y1="14"
            :y2="plotBottom"
            stroke="var(--bm-accent)"
            stroke-width="1.2"
            stroke-dasharray="3 3"
          />
          <circle
            :cx="pointX(highlightedIndex)"
            :cy="valY(activePoint.reach)"
            r="5.5"
            fill="var(--bm-elevated)"
            stroke="var(--bm-chart-line)"
            stroke-width="2.75"
          />
        </g>

        <!-- Invisible hit columns for smooth scrubbing + keyboard focus -->
        <g v-for="(pt, idx) in series" :key="`hit-${pt.date}`">
          <rect
            :x="slotLeft(idx)"
            y="8"
            :width="slotStep"
            :height="plotBottom - 4"
            fill="transparent"
            tabindex="0"
            role="button"
            :aria-label="`${pt.date}: ${pt.impressions} impressions, ${pt.reach} reach`"
            @pointerenter="activeIdx = idx"
            @click="selectedIdx = idx"
            @focus="activeIdx = idx"
            @blur="activeIdx = null"
            @keydown.enter.prevent="selectedIdx = idx"
            @keydown.space.prevent="selectedIdx = idx"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { DailyMetricPoint } from '@/types/api';

const props = defineProps<{
  series: DailyMetricPoint[];
}>();

const plotBox = ref<HTMLDivElement | null>(null);
const width = ref(760);
const height = computed(() => width.value < 520 ? 170 : 250);
const plotLeft = 46;
const plotRight = computed(() => width.value - 20);
const plotTop = 18;
const plotBottom = computed(() => height.value - 25);
const gridLevels = [1, 0.5, 0];
const axisNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const gradId = `bm-reach-grad-${Math.random().toString(36).slice(2, 8)}`;

const activeIdx = ref<number | null>(null);

const selectedIdx = ref<number | null>(null);
const highlightedIndex = computed(() => activeIdx.value ?? selectedIdx.value);
const pointIndex = computed(() => highlightedIndex.value ?? props.series.length - 1);
const activePoint = computed(() => props.series[pointIndex.value] ?? null);

let plotObserver: ResizeObserver | undefined;

onMounted(() => {
  if (!plotBox.value || typeof ResizeObserver === 'undefined') return;
  plotObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width > 0) width.value = Math.max(150, Math.floor(entry.contentRect.width));
  });
  plotObserver.observe(plotBox.value);
});

onBeforeUnmount(() => plotObserver?.disconnect());

function selectDay(event: Event): void {
  selectedIdx.value = Number((event.target as HTMLSelectElement).value);
  activeIdx.value = null;
}

const maxVal = computed(() => {
  const mx = Math.max(100, ...props.series.map((p) => Math.max(p.impressions, p.reach)));
  return Math.ceil(mx * 1.12);
});

const slotStep = computed(() => {
  const n = Math.max(1, props.series.length);
  return (plotRight.value - plotLeft) / n;
});

const barWidth = computed(() => Math.max(1, Math.min(24, Math.floor(slotStep.value * 0.56))));
const labelStride = computed(() => Math.max(1, Math.ceil(props.series.length / (width.value < 520 ? 3 : 6))));
function slotLeft(idx: number): number {
  return plotLeft + idx * slotStep.value;
}

function barX(idx: number): number {
  return slotLeft(idx) + (slotStep.value - barWidth.value) / 2;
}

function pointX(idx: number): number {
  return slotLeft(idx) + slotStep.value / 2;
}

function valY(val: number): number {
  const usable = plotBottom.value - plotTop;
  return plotBottom.value - Math.round((val / maxVal.value) * usable);
}

const curvePath = computed(() => {
  const pts = props.series.map((p, i) => ({ x: pointX(i), y: valY(p.reach) }));
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = Math.min(plotBottom.value, Math.max(plotTop, p1.y + (p2.y - p0.y) / 6));
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = Math.min(plotBottom.value, Math.max(plotTop, p2.y - (p3.y - p1.y) / 6));
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
});

const areaPath = computed(() => {
  if (!curvePath.value || props.series.length < 2) return '';
  const firstX = pointX(0).toFixed(1);
  const lastX = pointX(props.series.length - 1).toFixed(1);
  return `${curvePath.value} L ${lastX} ${plotBottom.value} L ${firstX} ${plotBottom.value} Z`;
});
</script>

<style scoped>
.bm-ic-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bm-ic-readout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 14px;
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--bm-surface);
  border: 1px solid var(--bm-border-soft);
  font-family: var(--font-data);
  font-size: 12px;
  color: var(--bm-text-muted);
}

.bm-ic-readout strong {
  color: var(--bm-text);
  font-weight: 600;
}

.bm-ic-readout__date {
  min-height: 44px;
  padding: 2px 8px;
  border: 1px solid var(--bm-divider);
  border-radius: 5px;
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  font-weight: 600;
}

.bm-ic-readout__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
}

.bm-ic-svg-box {
  width: 100%;
}

.bm-ic-svg {
  display: block;
  width: 100%;
  height: auto;
  font-family: var(--font-data);
}

@media (prefers-reduced-motion: no-preference) {
  .bm-ic-bar {
    transition: fill 160ms var(--ease-out-quart), y 320ms var(--ease-spring),
      height 320ms var(--ease-spring);
  }

  .bm-ic-line {
    stroke-dasharray: 1800;
    stroke-dashoffset: 1800;
    animation: bm-draw-line 720ms var(--ease-out-quart) forwards;
  }
}

@keyframes bm-draw-line {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
