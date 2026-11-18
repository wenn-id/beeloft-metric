# BeeloftMetric Warm Tactile Studio & 3D Precision Objects Design Spec

## 1. Design Read & Liveliness Dials
- **Public Landing (`/`):** Reading this as a multi-channel social analytics & attribution product page for agency operators and growth teams, in a Warm Tactile Studio + 3D Precision Objects visual language, dial `ENERGY 3 / RHYTHM 3 / MOTION 3`.
- **Workspace App (`/evolution/*`, `/planner`, `/smartlink`, etc.):** Reading this as a daily social analytics, publishing, and attribution workspace for operators, in a Warm Tactile Studio visual language, dial `ENERGY 2 / RHYTHM 2 / MOTION 2`.

## 2. One-Line Purpose Reasons (R-31)
- **Color Palette:** Warm alabaster (`#fcfaf7`), tactile stone (`#f3eee7`), and obsidian dark (`#111215`) give editorial warmth without sterile white flatness, paired with a single Terracotta/Sienna brand accent (`#8c2f14` / `#fbe1d1`) and functional status tones (Emerald `#065f46`, Amber `#78350f`, Rose `#881337`), all mathematically verified >= 6.38:1 WCAG AA contrast.
- **Typography:** Signifier/Source Serif 4 on `H1`/`H2` anchors BeeloftMetric's editorial identity, while Sohne/Inter with `tabular-nums` keeps dense tables, KPIs, and schedules crisp at any zoom level.
- **Layout & Rhythm:** Public landing alternates a split 2-column 3D Hero Stage, an asymmetric interactive capability showcase, and a full-bleed warm telemetry callout (`RHYTHM 3`); signed-in views prioritize the primary operator decision per screen (`RHYTHM 2`).
- **Spacing:** Fluid spacing tokens (`clamp()`) give desktop spreads breathing room while tightening mobile viewports so content stays above the fold without horizontal scroll.
- **Cards & Elevation:** Multi-layer warm ambient + 1px specular top-border shadows separate interactive foreground surfaces from recessed stone containers, reserving tilt elevation strictly for primary KPI and 3D stage cards (`R-12`).
- **3D & Illustrations (`Three.js`):** Procedural WebGL geometry directly visualizes product mechanics (multi-channel orbital telemetry in Hero, real-time country beacons on a 3D Globe in Evolution, and extruded 3D smartphone preview in SmartLink & Post Composer) with zero generic 3D blobs (`R-22`).
- **Motion & Accessibility:** Spring curves (`cubic-bezier(0.22, 1, 0.36, 1)`), sliding tab pills, number interpolation, and SVG curve drawing guide focus on state changes, pause cleanly via a visible control when running >5s, and stop automatically under `prefers-reduced-motion: reduce` (`R-19`, `R-39`).

## 3. Component Architecture
1. **`src/assets/styles/tokens.css` & `src/assets/styles/base.css`**:
   - Tactile surface elevation tokens (`--bm-shadow-card`, `--bm-shadow-float`, `--bm-border-specular`), spring easing variables (`--ease-spring`, `--ease-out-quart`), semantic status colors (`success`, `warning`, `danger`), and route transition classes.
2. **Tactile Design System Atoms & Interactive Primitives**:
   - `BmButton.vue`: Physical press feedback (`translateY(1px)` active state, 3D subtle bottom lip on primary CTA, hover lift).
   - `BmTabs.vue`: Smooth sliding active capsule indicator computed from the active tab button's offset/width, plus keyboard arrow navigation.
   - `BmBadge.vue` & `NetworkBadge.vue`: Distinct WCAG-verified semantic status tones and authentic subtle channel-tinted accents so operators distinguish Instagram, TikTok, YouTube, Meta Ads, and Web at a glance.
   - `AnimatedNumber.vue`: Smooth `requestAnimationFrame` ease-out number counter with `tabular-nums` (instant under `prefers-reduced-motion: reduce`).
   - `TiltSurface.vue`: Bounded 3D perspective card wrapper (`maxTilt = 3.5deg`) with cursor-tracked radial specular sheen for primary KPI cards.
   - `CommandPalette.vue`: `Ctrl+K` / `Cmd+K` modal palette integrated into `AppShell.vue` (with visible trigger button in topbar) to jump between brands, analytics channels, Planner composer, SmartLinks, Dark/Light theme, and settings.
3. **Three.js & Spatial 3D Subsystem (`src/components/three/`, lazy-loaded)**:
   - `OrbitalHeroScene.vue`: Procedural Three.js WebGL scene rendering a faceted warm-metallic & ceramic telemetry gyroscope core, three orbital rings with channel satellite nodes, cursor-damped camera parallax, scroll-linked rotation, WebGL fallback, and an accessible `Pause 3D / Play 3D` button.
   - `RealtimeGlobe3D.vue`: Interactive drag-to-rotate Three.js 3D wireframe/lat-lon globe for `EvolutionView.vue` (`Real-Time Web`), plotting glowing beacon pins + pulse rings from real `realtime.countries` ISO country codes (`ID`, `SG`, `US`, `GB`, `AU`, `JP`, `MY`, `DE`, `NL`, `IN`, etc.) with smooth inertia and automatic GPU disposal on unmount.
   - `DeviceStage3D.vue`: Interactive 3D extruded smartphone chassis with side-bezel depth, dynamic floor shadow, and cursor-linked tilt + glass sheen, used in `SmartLinkView.vue` (live bio microsite preview) and `PlannerView.vue` (live social post preview inside the composer modal).
   - `InteractiveMetricChart.vue`: Smooth cubic-bezier SVG area + bar chart with animated path draw-in and magnetic hover/keyboard crosshair tooltip showing exact daily Impressions, Reach, and Engagement.
