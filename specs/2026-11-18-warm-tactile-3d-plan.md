# Warm Tactile Studio & 3D Precision Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade BeeloftMetric's UI/UX into a tactile, animated, 3D-enhanced analytics and publishing experience (`Opsi A: Warm Tactile Studio + 3D Precision Objects`) across public and authenticated views while maintaining 60fps performance, code-split WebGL chunks, and full WCAG AA compliance.

**Architecture:** Layer warm dimensional tokens and spring micro-interactions into the base CSS and atomic design system, build lazy-loaded procedural `Three.js` components (`OrbitalHeroScene`, `RealtimeGlobe3D`) alongside a CSS-3D `DeviceStage3D` and SVG `InteractiveMetricChart`, and wire a `Ctrl+K` `CommandPalette` plus route transitions into `AppShell`.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), TypeScript, Vite (manual async chunking for `three`), Three.js, Pinia, Cloudflare Workers + Static Assets.

**Spec:** `specs/2026-11-18-warm-tactile-3d-spec.md`

## Global Constraints
- Zero em dashes (`U+2014`) in any code, comment, UI copy, spec, or commit message (`R-02`).
- Every text/background pair >= 4.5:1 contrast in both Light and Dark themes (`R-25`, `R-34`).
- All non-essential motion stops under `prefers-reduced-motion: reduce`, and any >5s animation includes an accessible Pause/Play toggle (`R-39`).
- Every WebGL scene disposes geometries, materials, and `WebGLRenderer` on `onUnmounted` and falls back cleanly when WebGL is unavailable.

---

### Task 1: Tactile Tokens, Semantic Colors, Physical Atoms & Vite Chunking
**Files:**
- Modify: `package.json`, `vite.config.ts`
- Modify: `src/assets/styles/tokens.css`, `src/assets/styles/base.css`
- Modify: `src/components/common/designSystem/atoms/BmButton.vue`
- Modify: `src/components/common/designSystem/atoms/BmTabs.vue`
- Modify: `src/components/common/designSystem/atoms/BmBadge.vue`
- Modify: `src/components/common/designSystem/atoms/NetworkBadge.vue`
- [x] Step 1: Install `three` and `@types/three` and configure `manualChunks` in `vite.config.ts` so `three` splits into its own cacheable async vendor chunk.
- [x] Step 2: Upgrade `tokens.css` & `base.css` with Warm Alabaster / Stone / Obsidian surfaces, verified Emerald/Amber/Rose/Terracotta status tokens, tactile shadows, specular borders, and route/modal spring transitions.
- [x] Step 3: Upgrade `BmButton.vue` (3D lip + tactile press), `BmTabs.vue` (sliding active indicator pill), `BmBadge.vue`, and `NetworkBadge.vue` (subtle channel-coded pills).

### Task 2: Motion & Ergonomic Primitives (`AnimatedNumber`, `TiltSurface`, `InteractiveMetricChart`, `CommandPalette`)
**Files:**
- Create: `src/components/common/motion/AnimatedNumber.vue`
- Create: `src/components/common/motion/TiltSurface.vue`
- Create: `src/components/common/motion/InteractiveMetricChart.vue`
- Create: `src/components/common/CommandPalette.vue`
- Modify: `src/components/layout/AppShell.vue`, `src/App.vue`
- [x] Step 1: Build `AnimatedNumber.vue` (`requestAnimationFrame` cubic-out interpolation) and `TiltSurface.vue` (`rotateX`/`rotateY` <= 3.5deg + radial glare).
- [x] Step 2: Build `InteractiveMetricChart.vue` with smooth bezier curve, gradient fill, animated bar heights, and magnetic hover/focus tooltip.
- [x] Step 3: Build `CommandPalette.vue` (`Ctrl+K` / `Cmd+K` + Escape close + keyboard up/down/enter) and integrate it + smooth `<Transition name="bm-page">` into `AppShell.vue`.

### Task 3: Procedural 3D Components (`OrbitalHeroScene`, `RealtimeGlobe3D`, `DeviceStage3D`)
**Files:**
- Create: `src/components/three/OrbitalHeroScene.vue`
- Create: `src/components/three/RealtimeGlobe3D.vue`
- Create: `src/components/three/DeviceStage3D.vue`
- [x] Step 1: Implement `OrbitalHeroScene.vue` using procedural Three.js icosahedron/torus-gyroscope geometry, warm physical/standard lighting, orbiting channel satellites, cursor parallax, scroll tilt, Pause/Play button, and full GPU cleanup.
- [x] Step 2: Implement `RealtimeGlobe3D.vue` using Three.js sphere + lat/lon wireframe + country coordinate mapping (`lat/lon -> 3D vector`) with glowing visitor beacons, pointer drag rotation with inertia, Pause/Play button, and 2D fallback.
- [x] Step 3: Implement `DeviceStage3D.vue` with extruded 3D titanium/warm-stone bezel layers, dynamic specular reflection, and interactive tilt + reset toggle.

### Task 4: Integrate 3D & Tactile UX Across Views (`LandingView`, `BrandHeaderPublic`, `EvolutionView`, `SmartLinkView`, `PlannerView`)
**Files:**
- Modify: `src/components/common/BrandHeaderPublic.vue`
- Modify: `src/views/LandingView.vue`
- Modify: `src/views/app/EvolutionView.vue`
- Modify: `src/views/app/SmartLinkView.vue`
- Modify: `src/views/app/PlannerView.vue`
- Modify: `src/views/PricingView.vue`
- [x] Step 1: Add working Light/Dark theme toggle to `BrandHeaderPublic.vue` and upgrade `LandingView.vue` with the split 2-column 3D `OrbitalHeroScene` stage, `TiltSurface` interactive artifacts, varied section rhythm (`RHYTHM 3`), and full Dark Mode compatibility.
- [x] Step 2: Upgrade `EvolutionView.vue` with `TiltSurface` + `AnimatedNumber` KPI cards, `InteractiveMetricChart`, and `RealtimeGlobe3D` in `Real-Time Web`.
- [x] Step 3: Upgrade `SmartLinkView.vue` and `PlannerView.vue` (composer live preview) with `DeviceStage3D`, plus polish `PricingView.vue` cards with tactile depth.

### Task 5: Verification, Antislop Delivery Gate, Cloudflare Deploy & Git Push
**Files:**
- Modify: `specs/2026-11-18-warm-tactile-3d-plan.md`
- [x] Step 1: Run `npm test`, `npm run build`, `GITHUB_PAGES=true npm run build:pages`, contrast check, and zero-em-dash scan.
- [x] Step 2: Deploy live to `https://beeloftmetric.biz.id` via `npx wrangler deploy`, verify live HTTP 200 on `/`, `/assets/*`, and `/api/v2/system/readiness`, run the full Antislop Delivery Gate, and push to `origin/main`.
