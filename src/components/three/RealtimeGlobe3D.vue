<template>
  <section class="bm-card bm-globe-card" aria-label="Interactive 3D Real-Time Visitor Globe">
    <div class="bm-globe-head">
      <div>
        <h2>Live Visitor Geography (3D Edge Telemetry)</h2>
        <p class="bm-globe-sub">
          Drag the globe to inspect active country beacons reported by <code>/tracker.js</code> via
          Cloudflare edge headers.
        </p>
      </div>
      <div class="bm-globe-controls">
        <span class="bm-globe-pill tabular-nums">
          {{ countries.length }} active {{ countries.length === 1 ? 'country' : 'countries' }}
        </span>
        <button
          v-if="webglSupported"
          type="button"
          class="bm-globe-btn"
          :aria-pressed="paused"
          @click="paused = !paused"
        >
          {{ paused ? 'Auto-rotate' : 'Pause spin' }}
        </button>
      </div>
    </div>

    <div class="bm-globe-body">
      <div
        ref="viewportEl"
        class="bm-globe-stage"
        :class="{ 'bm-globe-stage--dragging': dragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <canvas v-if="webglSupported" ref="canvasEl" class="bm-globe-canvas" aria-hidden="true"></canvas>
        <div v-else class="bm-globe-fallback">
          <p>3D WebGL view is disabled on this device. Country table remains live on the right.</p>
        </div>
      </div>

      <div class="bm-globe-list">
        <div v-if="countries.length === 0" class="bm-globe-empty">
          <strong>Waiting for first visitor beacon</strong>
          <p>
            Open any page with your embedded <code>tracker.js</code> snippet or public SmartLink to
            light up live country pins on the 3D globe.
          </p>
        </div>

        <ul v-else class="bm-country-items">
          <li v-for="ct in countries" :key="ct.code" class="bm-country-row">
            <button type="button" class="bm-country-focus" @click="focusCountry(ct.code)">
              <span class="bm-country-pin" aria-hidden="true"></span>
              <span>{{ ct.country }} <small>({{ ct.code }})</small></span>
              <strong class="tabular-nums">{{ ct.visitors }} online</strong>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';

interface CountryStat {
  code: string;
  country: string;
  visitors: number;
}

const props = withDefaults(
  defineProps<{
    countries: CountryStat[];
    theme?: 'light' | 'dark';
  }>(),
  {
    theme: 'light'
  }
);

const COUNTRY_COORDS: Record<string, [number, number]> = {
  ID: [-6.2, 106.8],
  SG: [1.35, 103.82],
  MY: [3.14, 101.69],
  TH: [13.75, 100.5],
  VN: [21.03, 105.85],
  PH: [14.6, 120.98],
  JP: [35.68, 139.76],
  KR: [37.56, 126.97],
  CN: [31.23, 121.47],
  HK: [22.32, 114.17],
  TW: [25.03, 121.56],
  IN: [28.61, 77.21],
  AU: [-33.87, 151.21],
  NZ: [-36.85, 174.76],
  AE: [25.2, 55.27],
  SA: [24.71, 46.67],
  GB: [51.51, -0.13],
  DE: [52.52, 13.4],
  NL: [52.37, 4.9],
  FR: [48.86, 2.35],
  ES: [40.42, -3.7],
  IT: [41.9, 12.5],
  SE: [59.33, 18.07],
  CH: [47.37, 8.54],
  PL: [52.23, 21.01],
  TR: [41.01, 28.98],
  US: [38.9, -77.04],
  CA: [43.65, -79.38],
  MX: [19.43, -99.13],
  BR: [-23.55, -46.63],
  AR: [-34.6, -58.38],
  ZA: [-26.2, 28.05],
  NG: [6.52, 3.38]
};

function resolveLatLon(code: string): [number, number] {
  const upper = code.toUpperCase();
  if (COUNTRY_COORDS[upper]) return COUNTRY_COORDS[upper];
  const h1 = upper.charCodeAt(0) || 70;
  const h2 = upper.charCodeAt(1) || 70;
  const lat = ((h1 * 13) % 110) - 55;
  const lon = ((h2 * 29) % 320) - 160;
  return [lat, lon];
}

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

const viewportEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const webglSupported = ref(true);
const paused = ref(false);
const dragging = ref(false);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let globeGroup: THREE.Group | null = null;
let markersGroup: THREE.Group | null = null;
let sphereMat: THREE.MeshStandardMaterial | null = null;
let gridMat: THREE.LineBasicMaterial | null = null;
let rafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

// Start facing Indonesia / Southeast Asia
let rotY = -2.95;
let rotX = 0.14;
let velY = 0;
let velX = 0;
let lastX = 0;
let lastY = 0;

const baseDisposables: Array<{ dispose: () => void }> = [];
const markerDisposables: Array<{ dispose: () => void }> = [];

const GLOBE_RADIUS = 1.48;

function syncTheme(mode: 'light' | 'dark'): void {
  const dark = mode === 'dark';
  if (sphereMat) {
    sphereMat.color.setHex(dark ? 0x1b1f27 : 0xf2ece3);
  }
  if (gridMat) {
    gridMat.color.setHex(dark ? 0x5c6475 : 0x8f8578);
  }
}

function rebuildMarkers(): void {
  if (!markersGroup) return;
  while (markersGroup.children.length > 0) {
    markersGroup.remove(markersGroup.children[0]);
  }
  for (const d of markerDisposables) d.dispose();
  markerDisposables.length = 0;

  const list = props.countries.length > 0 ? props.countries : [{ code: 'ID', country: 'Indonesia', visitors: 0 }];

  const pinMat = new THREE.MeshStandardMaterial({
    color: props.countries.length > 0 ? 0x10b981 : 0x9c3618,
    emissive: props.countries.length > 0 ? 0x059669 : 0x541d0c,
    emissiveIntensity: 0.45,
    roughness: 0.25
  });
  const stemMat = new THREE.LineBasicMaterial({
    color: 0xd97706,
    transparent: true,
    opacity: 0.8
  });
  markerDisposables.push(pinMat, stemMat);

  const hubVec = latLonToVec3(-6.2, 106.8, GLOBE_RADIUS);

  for (const item of list) {
    const [lat, lon] = resolveLatLon(item.code);
    const surfacePos = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.01);
    const heightBoost = Math.min(0.42, 0.1 + item.visitors * 0.04);
    const tipPos = latLonToVec3(lat, lon, GLOBE_RADIUS + heightBoost);

    const stemGeo = new THREE.BufferGeometry().setFromPoints([surfacePos, tipPos]);
    const stem = new THREE.Line(stemGeo, stemMat);
    markersGroup.add(stem);
    markerDisposables.push(stemGeo);

    const headGeo = new THREE.SphereGeometry(item.visitors > 0 ? 0.055 : 0.04, 14, 14);
    const head = new THREE.Mesh(headGeo, pinMat);
    head.position.copy(tipPos);
    markersGroup.add(head);
    markerDisposables.push(headGeo);

    // Draw great-circle elevated arc to Jakarta edge hub when another country is active
    if (item.code.toUpperCase() !== 'ID' && item.visitors > 0) {
      const mid = surfacePos.clone().add(hubVec).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + 0.42);
      const curve = new THREE.QuadraticBezierCurve3(surfacePos, mid, hubVec);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(28));
      const arcLine = new THREE.Line(arcGeo, stemMat);
      markersGroup.add(arcLine);
      markerDisposables.push(arcGeo);
    }
  }
}

function buildLatLonGrid(radius: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let lat = -60; lat <= 60; lat += 20) {
    for (let lon = -180; lon < 180; lon += 6) {
      pts.push(latLonToVec3(lat, lon, radius));
      pts.push(latLonToVec3(lat, lon + 6, radius));
    }
  }
  for (let lon = -180; lon < 180; lon += 20) {
    for (let lat = -80; lat < 80; lat += 6) {
      pts.push(latLonToVec3(lat, lon, radius));
      pts.push(latLonToVec3(lat + 6, lon, radius));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function initGlobe(): void {
  if (!canvasEl.value || !viewportEl.value) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paused.value = true;
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl.value,
      antialias: true,
      alpha: true
    });
  } catch {
    webglSupported.value = false;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  scene = new THREE.Scene();

  const rect = viewportEl.value.getBoundingClientRect();
  const w = Math.max(240, rect.width);
  const h = Math.max(240, rect.height);
  camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 30);
  camera.position.set(0, 0.2, 4.55);
  renderer.setSize(w, h, false);

  const amb = new THREE.AmbientLight(0xffffff, 1.4);
  const dir = new THREE.DirectionalLight(0xffe8d6, 1.8);
  dir.position.set(4, 3, 5);
  scene.add(amb, dir);

  globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 44, 32);
  sphereMat = new THREE.MeshStandardMaterial({
    color: 0xf2ece3,
    roughness: 0.78,
    metalness: 0.08
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  globeGroup.add(sphere);
  baseDisposables.push(sphereGeo, sphereMat);

  const gridGeo = buildLatLonGrid(GLOBE_RADIUS + 0.005);
  gridMat = new THREE.LineBasicMaterial({
    color: 0x8f8578,
    transparent: true,
    opacity: 0.32
  });
  const grid = new THREE.LineSegments(gridGeo, gridMat);
  globeGroup.add(grid);
  baseDisposables.push(gridGeo, gridMat);

  markersGroup = new THREE.Group();
  globeGroup.add(markersGroup);

  syncTheme(props.theme);
  rebuildMarkers();

  const tick = () => {
    if (!renderer || !scene || !camera || !globeGroup) return;
    if (!dragging.value) {
      if (!paused.value) {
        rotY += 0.0028;
      }
      rotY += velY;
      rotX = Math.max(-0.9, Math.min(0.9, rotX + velX));
      velY *= 0.92;
      velX *= 0.92;
    }
    globeGroup.rotation.y += (rotY - globeGroup.rotation.y) * 0.12;
    globeGroup.rotation.x += (rotX - globeGroup.rotation.x) * 0.12;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry || !renderer || !camera) return;
    const nw = Math.max(220, entry.contentRect.width);
    const nh = Math.max(220, entry.contentRect.height);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  });
  resizeObserver.observe(viewportEl.value);
}

function focusCountry(code: string): void {
  const [lat, lon] = resolveLatLon(code);
  rotY = -((lon + 90) * Math.PI) / 180;
  rotX = Math.max(-0.8, Math.min(0.8, (lat * Math.PI) / 180));
}

function onPointerDown(ev: PointerEvent): void {
  dragging.value = true;
  lastX = ev.clientX;
  lastY = ev.clientY;
}

function onPointerMove(ev: PointerEvent): void {
  if (!dragging.value) return;
  const dx = ev.clientX - lastX;
  const dy = ev.clientY - lastY;
  lastX = ev.clientX;
  lastY = ev.clientY;
  velY = dx * 0.007;
  velX = dy * 0.007;
  rotY += velY;
  rotX = Math.max(-0.9, Math.min(0.9, rotX + velX));
}

function onPointerUp(): void {
  dragging.value = false;
}

watch(
  () => props.countries,
  () => rebuildMarkers(),
  { deep: true }
);

watch(
  () => props.theme,
  (mode) => {
    if (mode) syncTheme(mode);
  }
);

onMounted(initGlobe);

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  resizeObserver?.disconnect();
  for (const d of markerDisposables) d.dispose();
  for (const d of baseDisposables) d.dispose();
  renderer?.dispose();
  renderer = null;
});
</script>

<style scoped>
.bm-globe-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bm-globe-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.bm-globe-head h2 {
  font-size: 1.25rem;
}

.bm-globe-sub {
  font-size: 0.875rem;
  color: var(--bm-text-muted);
  margin-top: 2px;
}

.bm-globe-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bm-globe-pill {
  padding: 5px 12px;
  border-radius: var(--radius-buttons);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-size: 12.5px;
  font-weight: 600;
}

.bm-globe-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: var(--radius-buttons);
  border: 1px solid var(--bm-control-border);
  background: var(--bm-elevated);
  color: var(--bm-text);
  font-size: 13px;
  font-weight: 500;
}

.bm-globe-body {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
  align-items: center;
}

.bm-globe-stage {
  height: 300px;
  border-radius: var(--radius-elevatedcards);
  background: radial-gradient(
      circle at 50% 50%,
      rgba(251, 225, 209, 0.35),
      transparent 70%
    ),
    var(--bm-surface);
  border: 1px solid var(--bm-border-soft);
  cursor: grab;
  overflow: hidden;
  touch-action: pan-y;
}

.bm-globe-stage--dragging {
  cursor: grabbing;
}

.bm-globe-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.bm-globe-fallback,
.bm-globe-empty {
  padding: 20px;
  border-radius: var(--radius-inputs);
  background: var(--bm-surface);
  border: 1px solid var(--bm-border-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--bm-text-muted);
}

.bm-globe-empty strong {
  color: var(--bm-text);
}

.bm-country-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.bm-country-focus {
  width: 100%;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: var(--radius-inputs);
  border: 1px solid var(--bm-border-soft);
  background: var(--bm-surface);
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  font-size: 14px;
}

.bm-country-focus:hover {
  border-color: var(--bm-accent);
}

.bm-country-focus strong {
  margin-left: auto;
  color: var(--bm-success-text);
  background: var(--bm-success-bg);
  padding: 2px 8px;
  border-radius: var(--radius-buttons);
  font-size: 12px;
}

.bm-country-pin {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bm-success-border);
  flex-shrink: 0;
}

@media (max-width: 820px) {
  .bm-globe-body {
    grid-template-columns: 1fr;
  }

  .bm-globe-stage {
    height: 250px;
  }
}
</style>
