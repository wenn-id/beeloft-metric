<template>
  <div
    ref="stageWrap"
    class="bm-hero-3d"
    :class="{ 'bm-hero-3d--dragging': isDragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerLeave"
  >
    <canvas v-if="webglSupported" ref="canvasEl" class="bm-hero-3d__canvas" aria-hidden="true"></canvas>

    <!-- Honest 2D fallback if WebGL is unavailable -->
    <div v-else class="bm-hero-3d__fallback" aria-hidden="true">
      <svg viewBox="0 0 320 240" class="bm-hero-3d__fallback-svg">
        <circle cx="160" cy="120" r="84" fill="none" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.5" />
        <ellipse cx="160" cy="120" rx="96" ry="38" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5" transform="rotate(-24 160 120)" />
        <polygon points="160,64 208,96 190,156 130,156 112,96" fill="rgba(140,47,20,0.16)" stroke="currentColor" stroke-width="1.8" />
      </svg>
    </div>

    <div class="bm-hero-3d__hud-top">
      <span class="bm-hero-3d__chip">
        <span class="bm-hero-3d__live-dot" aria-hidden="true"></span>
        3D Orbital Telemetry · Drag to rotate
      </span>
      <span class="bm-hero-3d__nodes tabular-nums">{{ activeChannelsLabel }}</span>
    </div>

    <div class="bm-hero-3d__hud-bottom">
      <div class="bm-hero-3d__legend">
        <span><strong>Core:</strong> {{ statusLabel }}</span>
        <span class="bm-hero-3d__sep" aria-hidden="true">·</span>
        <span><strong>Cadence:</strong> 5m Cron</span>
      </div>

      <button
        v-if="webglSupported"
        type="button"
        class="bm-hero-3d__ctrl"
        :aria-pressed="paused"
        :aria-label="paused ? 'Resume 3D orbital motion' : 'Pause 3D orbital motion'"
        @click.stop="togglePause"
      >
        {{ paused ? 'Play 3D' : 'Pause 3D' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';

const props = withDefaults(
  defineProps<{
    theme?: 'light' | 'dark';
    statusLabel?: string;
    activeChannelsLabel?: string;
  }>(),
  {
    theme: 'light',
    statusLabel: 'Cloudflare Edge D1',
    activeChannelsLabel: '15 channel nodes'
  }
);

const stageWrap = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const webglSupported = ref(true);
const paused = ref(false);
const isDragging = ref(false);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let rootGroup: THREE.Group | null = null;
let coreMesh: THREE.Mesh | null = null;
let cageMesh: THREE.LineSegments | null = null;
let ringGroups: THREE.Group[] = [];
let coreMat: THREE.MeshPhysicalMaterial | null = null;
let cageMat: THREE.LineBasicMaterial | null = null;
let ringMats: THREE.MeshStandardMaterial[] = [];
let particleMat: THREE.PointsMaterial | null = null;
let rafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

let pointerX = 0;
let pointerY = 0;
let dragRotX = 0.18;
let dragRotY = -0.32;
let velX = 0;
let velY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let scrollTilt = 0;

const disposables: Array<{ dispose: () => void }> = [];

function applyThemeMaterials(mode: 'light' | 'dark'): void {
  const isDark = mode === 'dark';
  if (coreMat) {
    coreMat.color.setHex(isDark ? 0xd97757 : 0x9c3618);
    coreMat.emissive.setHex(isDark ? 0x3a1408 : 0x240b04);
  }
  if (cageMat) {
    cageMat.color.setHex(isDark ? 0xfbd6c0 : 0x452012);
  }
  for (const rm of ringMats) {
    rm.color.setHex(isDark ? 0xc8bfb3 : 0x3b352f);
  }
  if (particleMat) {
    particleMat.color.setHex(isDark ? 0xfbd6c0 : 0x7c341c);
  }
}

function initThree(): void {
  if (!canvasEl.value || !stageWrap.value) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    paused.value = true;
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl.value,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch {
    webglSupported.value = false;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  scene = new THREE.Scene();

  const rect = stageWrap.value.getBoundingClientRect();
  const w = Math.max(280, rect.width);
  const h = Math.max(260, rect.height);
  camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
  camera.position.set(0, 0.15, 6.6);
  renderer.setSize(w, h, false);

  // Studio warm lighting
  const ambient = new THREE.AmbientLight(0xfff5eb, 1.35);
  const keyLight = new THREE.DirectionalLight(0xffe7d4, 2.2);
  keyLight.position.set(4, 5, 6);
  const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
  rimLight.position.set(-5, -3, 3);
  const warmPoint = new THREE.PointLight(0xf97316, 1.4, 12);
  warmPoint.position.set(0, 2.2, 2.5);
  scene.add(ambient, keyLight, rimLight, warmPoint);

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Faceted Tactile Core
  const coreGeo = new THREE.IcosahedronGeometry(1.08, 1);
  coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x9c3618,
    emissive: 0x240b04,
    roughness: 0.28,
    metalness: 0.32,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
    flatShading: true
  });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  rootGroup.add(coreMesh);
  disposables.push(coreGeo, coreMat);

  // Outer Precision Wireframe Cage
  const outerGeo = new THREE.IcosahedronGeometry(1.34, 1);
  const edgesGeo = new THREE.EdgesGeometry(outerGeo);
  cageMat = new THREE.LineBasicMaterial({
    color: 0x452012,
    transparent: true,
    opacity: 0.36
  });
  cageMesh = new THREE.LineSegments(edgesGeo, cageMat);
  rootGroup.add(cageMesh);
  disposables.push(outerGeo, edgesGeo, cageMat);

  // Three Orbital Gimbals with Channel Satellites
  const ringConfigs = [
    { radius: 1.88, tiltX: 1.08, tiltY: 0.22, speed: 0.38, satColor: 0x10b981, count: 3 },
    { radius: 2.26, tiltX: -0.68, tiltY: 0.78, speed: -0.28, satColor: 0xe11d48, count: 3 },
    { radius: 2.62, tiltX: 0.35, tiltY: -0.95, speed: 0.2, satColor: 0x2563eb, count: 4 }
  ];

  ringGroups = [];
  ringMats = [];

  for (const cfg of ringConfigs) {
    const grp = new THREE.Group();
    grp.rotation.x = cfg.tiltX;
    grp.rotation.y = cfg.tiltY;
    grp.userData = { speed: cfg.speed };

    const torusGeo = new THREE.TorusGeometry(cfg.radius, 0.014, 12, 96);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x3b352f,
      roughness: 0.45,
      metalness: 0.5,
      transparent: true,
      opacity: 0.55
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    grp.add(torus);
    ringMats.push(torusMat);
    disposables.push(torusGeo, torusMat);

    const satGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const satMat = new THREE.MeshStandardMaterial({
      color: cfg.satColor,
      emissive: cfg.satColor,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.2
    });
    disposables.push(satGeo, satMat);

    for (let i = 0; i < cfg.count; i++) {
      const angle = (i / cfg.count) * Math.PI * 2;
      const sat = new THREE.Mesh(satGeo, satMat);
      sat.position.set(Math.cos(angle) * cfg.radius, Math.sin(angle) * cfg.radius, 0);
      grp.add(sat);
    }

    rootGroup.add(grp);
    ringGroups.push(grp);
  }

  // Subtle spatial depth dust
  const dustCount = 72;
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const r = 2.8 + (i % 7) * 0.22;
    const theta = i * 2.39996;
    const y = ((i / dustCount) - 0.5) * 3.2;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r * 0.65;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleMat = new THREE.PointsMaterial({
    color: 0x7c341c,
    size: 0.045,
    transparent: true,
    opacity: 0.45
  });
  const dustPoints = new THREE.Points(dustGeo, particleMat);
  rootGroup.add(dustPoints);
  disposables.push(dustGeo, particleMat);

  applyThemeMaterials(props.theme);

  const renderFrame = (timeMs: number) => {
    if (!renderer || !scene || !camera || !rootGroup) return;
    const t = timeMs * 0.001;

    if (!paused.value) {
      if (coreMesh) {
        coreMesh.rotation.y = t * 0.32;
        coreMesh.rotation.x = Math.sin(t * 0.5) * 0.16;
      }
      if (cageMesh) {
        cageMesh.rotation.y = -t * 0.2;
        cageMesh.rotation.z = t * 0.12;
      }
      for (const grp of ringGroups) {
        grp.rotation.z += grp.userData.speed * 0.012;
      }
    }

    if (!isDragging.value) {
      dragRotY += velY;
      dragRotX = Math.max(-0.85, Math.min(0.85, dragRotX + velX));
      velX *= 0.92;
      velY *= 0.92;
    }

    const targetX = dragRotX + pointerY * 0.22 + scrollTilt * 0.3;
    const targetY = dragRotY + pointerX * 0.28 + scrollTilt * 0.45;
    rootGroup.rotation.x += (targetX - rootGroup.rotation.x) * 0.09;
    rootGroup.rotation.y += (targetY - rootGroup.rotation.y) * 0.09;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(renderFrame);
  };

  rafId = requestAnimationFrame(renderFrame);

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry || !renderer || !camera) return;
    const nw = Math.max(260, entry.contentRect.width);
    const nh = Math.max(240, entry.contentRect.height);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(stageWrap.value);
}

function onScroll(): void {
  if (paused.value) return;
  scrollTilt = Math.min(1.4, window.scrollY * 0.0016);
}

function onPointerDown(ev: PointerEvent): void {
  isDragging.value = true;
  lastPointerX = ev.clientX;
  lastPointerY = ev.clientY;
}

function onPointerMove(ev: PointerEvent): void {
  if (!stageWrap.value) return;
  const rect = stageWrap.value.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    pointerX = ((ev.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((ev.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  if (isDragging.value) {
    const dx = ev.clientX - lastPointerX;
    const dy = ev.clientY - lastPointerY;
    lastPointerX = ev.clientX;
    lastPointerY = ev.clientY;
    velY = dx * 0.008;
    velX = dy * 0.008;
    dragRotY += velY;
    dragRotX = Math.max(-0.85, Math.min(0.85, dragRotX + velX));
  }
}

function onPointerUp(): void {
  isDragging.value = false;
}

function onPointerLeave(): void {
  isDragging.value = false;
  pointerX = 0;
  pointerY = 0;
}

function togglePause(): void {
  paused.value = !paused.value;
}

watch(
  () => props.theme,
  (next) => {
    if (next) applyThemeMaterials(next);
  }
);

onMounted(() => {
  initThree();
  window.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  if (rafId !== null) cancelAnimationFrame(rafId);
  resizeObserver?.disconnect();
  for (const item of disposables) {
    item.dispose();
  }
  disposables.length = 0;
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
});
</script>

<style scoped>
.bm-hero-3d {
  position: relative;
  width: 100%;
  height: 390px;
  border-radius: var(--radius-cards);
  background: radial-gradient(
      circle at 50% 42%,
      rgba(251, 225, 209, 0.52),
      rgba(243, 238, 231, 0.25) 62%,
      transparent 100%
    ),
    var(--bm-elevated);
  border: 1px solid var(--bm-divider);
  box-shadow: var(--bm-shadow-lift);
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}

[data-theme='dark'] .bm-hero-3d {
  background: radial-gradient(
      circle at 50% 42%,
      rgba(140, 47, 20, 0.34),
      rgba(26, 28, 33, 0.65) 66%,
      transparent 100%
    ),
    var(--bm-elevated);
}

.bm-hero-3d--dragging {
  cursor: grabbing;
}

.bm-hero-3d__canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.bm-hero-3d__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bm-accent);
}

.bm-hero-3d__fallback-svg {
  width: 240px;
  height: 180px;
}

.bm-hero-3d__hud-top,
.bm-hero-3d__hud-bottom {
  position: absolute;
  left: 16px;
  right: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
}

.bm-hero-3d__hud-top {
  top: 14px;
}

.bm-hero-3d__hud-bottom {
  bottom: 14px;
}

.bm-hero-3d__chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: var(--radius-buttons);
  background: var(--bm-elevated);
  border: 1px solid var(--bm-divider);
  box-shadow: 0 2px 8px rgba(24, 22, 21, 0.08);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--bm-text);
}

.bm-hero-3d__live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--bm-success-border);
}

.bm-hero-3d__nodes {
  padding: 4px 10px;
  border-radius: var(--radius-buttons);
  background: var(--bm-accent-soft);
  color: var(--bm-accent-soft-text);
  font-size: 12px;
  font-weight: 600;
}

.bm-hero-3d__legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-buttons);
  background: var(--bm-elevated);
  border: 1px solid var(--bm-divider);
  font-size: 12.5px;
  color: var(--bm-text-muted);
}

.bm-hero-3d__legend strong {
  color: var(--bm-text);
  font-weight: 600;
}

.bm-hero-3d__ctrl {
  pointer-events: auto;
  min-height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-control-border);
  background: var(--bm-elevated);
  color: var(--bm-text);
  font-size: 12.5px;
  font-weight: 600;
}

.bm-hero-3d__ctrl:hover {
  background: var(--bm-surface);
}

@media (max-width: 640px) {
  .bm-hero-3d {
    height: 310px;
  }

  .bm-hero-3d__nodes {
    display: none;
  }
}
</style>
