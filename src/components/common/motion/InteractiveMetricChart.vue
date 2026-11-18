<template>
  <div class="bm-ic-wrap">
    <div v-if="activePoint" class="bm-ic-readout tabular-nums" aria-live="polite">
      <span class="bm-ic-readout__date">{{ activePoint.date }}</span>
      <span>Impressions: <strong>{{ activePoint.impressions.toLocaleString() }}</strong></span>
      <span>Reach: <strong>{{ activePoint.reach.toLocaleString() }}</strong></span>
      <span>Followers: <strong>{{ activePoint.followers.toLocaleString() }}</strong></span>
    </div>

    <div class="bm-ic-svg-box">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        class="bm-ic-svg"
        role="img"
        aria-label="Interactive daily impressions and reach chart"
        @pointerleave="activeIdx = null"
      >
        <defs>
          <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--bm-chart-line)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--bm-chart-line)" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Subtle horizontal reference lines -->
        <line
          v-for="g in gridLines"
          :key="g"
          x1="14"
          :x2="width - 14"
          :y1="g"
          :y2="g"
          stroke="var(--bm-divider)"
          stroke-dasharray="3 4"
          stroke-width="1"
        />

        <!-- Impressions bars -->
        <g v-for="(pt, idx) in series" :key="pt.date">
          <rect
            :x="barX(idx)"
            :y="valY(pt.impressions)"
            :width="barWidth"
            :height="Math.max(2, plotBottom - valY(pt.impressions))"
            :fill="activeIdx === idx ? 'var(--bm-chart-bar)' : 'var(--bm-chart-bar-muted)'"
            rx="4"
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
        <g v-if="activeIdx !== null && series[activeIdx]">
          <line
            :x1="pointX(activeIdx)"
            :x2="pointX(activeIdx)"
            y1="14"
            :y2="plotBottom"
            stroke="var(--bm-accent)"
            stroke-width="1.2"
            stroke-dasharray="3 3"
          />
          <circle
            :cx="pointX(activeIdx)"
            :cy="valY(series[activeIdx].reach)"
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
            @focus="activeIdx = idx"
            @blur="activeIdx = null"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DailyMetricPoint } from '@/types/api';

const props = defineProps<{
  series: DailyMetricPoint[];
}>();

const width = 760;
const height = 250;
const plotTop = 18;
const plotBottom = height - 28;
const gradId = `bm-reach-grad-${Math.random().toString(36).slice(2, 8)}`;

const activeIdx = ref<number | null>(null);

const activePoint = computed(() => {
  if (activeIdx.value !== null && props.series[activeIdx.value]) {
    return props.series[activeIdx.value];
  }
  return props.series[props.series.length - 1] ?? null;
});

const maxVal = computed(() => {
  const mx = Math.max(100, ...props.series.map((p) => Math.max(p.impressions, p.reach)));
  return Math.ceil(mx * 1.12);
});

const slotStep = computed(() => {
  const n = Math.max(1, props.series.length);
  return (width - 32) / n;
});

const barWidth = computed(() => Math.max(6, Math.min(24, Math.floor(slotStep.value * 0.56))));
const labelStride = computed(() => Math.max(1, Math.floor(props.series.length / 6)));
const gridLines = [plotTop + 12, Math.round((plotTop + plotBottom) / 2), plotBottom];

function slotLeft(idx: number): number {
  return 16 + idx * slotStep.value;
}

function barX(idx: number): number {
  return slotLeft(idx) + (slotStep.value - barWidth.value) / 2;
}

function pointX(idx: number): number {
  return slotLeft(idx) + slotStep.value / 2;
}

function valY(val: number): number {
  const usable = plotBottom - plotTop;
  return plotBottom - Math.round((val / maxVal.value) * usable);
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
    const cp1y = Math.min(plotBottom, Math.max(plotTop, p1.y + (p2.y - p0.y) / 6));
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = Math.min(plotBottom, Math.max(plotTop, p2.y - (p3.y - p1.y) / 6));
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
});

const areaPath = computed(() => {
  if (!curvePath.value || props.series.length < 2) return '';
  const firstX = pointX(0).toFixed(1);
  const lastX = pointX(props.series.length - 1).toFixed(1);
  return `${curvePath.value} L ${lastX} ${plotBottom} L ${firstX} ${plotBottom} Z`;
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
  gap: 14px;
  padding: 8px 14px;
  border-radius: var(--radius-inputs);
  background: var(--bm-surface);
  border: 1px solid var(--bm-border-soft);
  font-size: 13px;
  color: var(--bm-text-muted);
}

.bm-ic-readout strong {
  color: var(--bm-text);
  font-weight: 600;
}

.bm-ic-readout__date {
  padding: 2px 8px;
  border-radius: var(--radius-buttons);
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  font-weight: 600;
}

.bm-ic-svg-box {
  width: 100%;
  overflow-x: auto;
}

.bm-ic-svg {
  width: 100%;
  min-width: 520px;
  height: auto;
  display: block;
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
