<template>
  <canvas
    ref="canvas"
    class="bm-hero-signal-field"
    aria-hidden="true"
    @pointermove="movePointer"
    @pointerdown="pressPointer"
    @pointerleave="hovering = false"
    @pointercancel="clearPointer"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{ dark: boolean }>();
const canvas = ref<HTMLCanvasElement | null>(null);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const palettes = {
  light: ['#008b84', '#168a9c', '#5065cf', '#6854d0', '#8965d7', '#aa6eb5'],
  dark: ['#5ce0c5', '#67d6e7', '#8d9cff', '#a896ff', '#c4a0ff', '#e49bcf']
};

const particles = Array.from({ length: 20 }, (_, row) =>
  Array.from({ length: 30 }, (_, column) => {
    const seed = (row * 91 + column * 47) % 101 / 101;
    return {
      lane: row / 19 * 2 - 1,
      phase: (column + seed * 1.7) / 30,
      color: Math.floor(row * palettes.light.length / 20),
      weight: seed,
      speed: 0.037 + row % 5 * 0.003
    };
  })
).flat();

let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | undefined;
let visibilityObserver: IntersectionObserver | undefined;
let frame = 0;
let lastDraw = -Infinity;
let visible = true;
let width = 0;
let height = 0;
let pointerX = 0;
let pointerY = 0;
let hovering = false;
let pulseAt = -Infinity;
let influence = 0;

function setPointer(event: PointerEvent): void {
  const bounds = canvas.value?.getBoundingClientRect();
  if (!bounds) return;
  pointerX = event.clientX - bounds.left;
  pointerY = event.clientY - bounds.top;
}

function movePointer(event: PointerEvent): void {
  if (reducedMotion.matches || event.pointerType === 'touch') return;
  setPointer(event);
  hovering = true;
}

function pressPointer(event: PointerEvent): void {
  if (reducedMotion.matches) return;
  setPointer(event);
  pulseAt = performance.now();
}

function clearPointer(): void {
  hovering = false;
  pulseAt = -Infinity;
}

function draw(now: number): void {
  if (!ctx || !width || !height) return;
  const still = reducedMotion.matches;
  const time = still ? 0 : now * 0.001;
  const pulse = still ? 0 : Math.max(0, 1 - (now - pulseAt) / 820);
  influence += ((hovering && !still ? 1 : 0) - influence) * 0.22;
  const force = Math.max(influence, pulse);
  const radius = Math.min(width * 0.31, 175);
  const palette = props.dark ? palettes.dark : palettes.light;
  const scale = Math.min(1, width / 530);

  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = 'round';

  for (const particle of particles) {
    const { lane, phase, color, weight, speed } = particle;
    const progress = (phase + time * speed) % 1;
    const arch = Math.sin(progress * Math.PI);
    const wave = progress * Math.PI * 2 + 0.48;
    const spread = lane * (0.046 + 0.145 * arch);
    let x = width * (0.048 + progress * 0.905 + lane * 0.075 * arch);
    let y = height * (0.77 - 0.52 * progress + Math.sin(wave) * 0.13 + spread);
    let response = 0;
    if (force > 0.01) {
      const dx = x - pointerX;
      const dy = y - pointerY;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < radius) {
        response = (1 - distance / radius) ** 2 * force;
        const push = response * radius * 0.57;
        x += dx / distance * push;
        y += dy / distance * push;
      }
    }

    const length = (0.8 + weight ** 2 * 6) * scale;
    const fade = Math.min(1, progress * 14, (1 - progress) * 14);
    const slope = height / width * (-0.52 + Math.cos(wave) * 0.82);
    ctx.strokeStyle = palette[color];
    ctx.globalAlpha = Math.min(1, (0.22 + weight * 0.64 + response * 0.35) * fade);
    ctx.lineWidth = (0.75 + weight * 1.8 + response * 1.6) * scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + length * slope);
    ctx.stroke();
  }

  if (pulse > 0) {
    ctx.strokeStyle = palette[2];
    ctx.globalAlpha = pulse * 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, (1 - pulse) * radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function animate(now: number): void {
  if (now - lastDraw >= 1000 / 36) {
    draw(now);
    lastDraw = now;
  }
  frame = requestAnimationFrame(animate);
}

function syncAnimation(): void {
  cancelAnimationFrame(frame);
  if (!visible || reducedMotion.matches) clearPointer();
  draw(performance.now());
  if (visible && !reducedMotion.matches) frame = requestAnimationFrame(animate);
}

function resize(): void {
  const element = canvas.value;
  if (!element || !ctx) return;
  width = element.clientWidth;
  height = element.clientHeight;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  element.width = Math.round(width * ratio);
  element.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw(performance.now());
}

watch(() => props.dark, () => draw(performance.now()));

onMounted(() => {
  const element = canvas.value;
  ctx = element?.getContext('2d') ?? null;
  if (!element || !ctx) return;
  resize();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
  }
  if (typeof IntersectionObserver !== 'undefined') {
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    });
    visibilityObserver.observe(element);
  }
  reducedMotion.addEventListener('change', syncAnimation);
  syncAnimation();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  visibilityObserver?.disconnect();
  reducedMotion.removeEventListener('change', syncAnimation);
});
</script>

<style scoped>
.bm-hero-signal-field {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
