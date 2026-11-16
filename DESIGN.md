# Steep Style Reference (Adopted for BeeloftMetric)
> serif analytics on warm paper

**Theme:** light (default Steep editorial system)

BeeloftMetric adopts the Steep visual system: Signifier-style serif headlines (`Source Serif 4` regular weight `400`, Georgia fallback) float over a near-monochrome Paper White (`#ffffff`) and Mist Gray (`#f2f2f3`) canvas, while a single Blush Peach (`#fbe1d1`) and Sienna Brown (`#5d2a1a`) accent pair punctuates the 97% achromatic interface.

## Tokens - Colors
- `--color-ink-black`: `#17191c` (primary text, filled pill CTAs, nav logo; 17.61:1 on `#ffffff`)
- `--color-paper-white`: `#ffffff` (canvas, elevated floating product artifacts, inverse button ink)
- `--color-mist-gray`: `#f2f2f3` (neutral flat cards at 24px radius, secondary input fills)
- `--color-fog-white`: `#fafafb` (alternating section bands and quiet hover surfaces)
- `--color-slate-gray`: `#777b86` (Steep reference muted token; normal text under 18px uses `#686c76` for 5.26:1 AA compliance)
- `--color-ash-gray`: `#979799` (ghost category tags)
- `--color-smoke-gray`: `#a3a6af` (placeholder and disabled metadata)
- `--color-blush-peach`: `#fbe1d1` (rare editorial accent card background, max one callout per page)
- `--color-sienna-brown`: `#5d2a1a` (ink on `#fbe1d1` surfaces at 9.27:1 contrast, and gestural chart line strokes)

## Tokens - Typography
- `--font-signifier`: `'Signifier', 'Source Serif 4', Georgia, ui-serif, serif` (used strictly at weight `400` on `h1` and `h2`, sizes 44px / 64px / 90px responsive, line-height `1.3`, negative tracking `-2.25px` / `-0.96px` / `-0.66px`)
- `--font-sohne`: `'Sohne', 'Inter', ui-sans-serif, system-ui, sans-serif` (weights `400`, `430`, `450`, `480`, `500`; tabular numerals on KPIs and tables)

## Tokens - Radii & Elevation
- Cards (`.bm-card`): `24px` radius, `#f2f2f3` Mist Gray, zero border, zero shadow
- Floating Product Artifacts (`.bm-artifact`): `20px` radius, `#ffffff`, subtle 10% shadow `--shadow-subtle-3`
- Inputs: `16px` radius, `#ffffff` or `#f2f2f3`
- Pill Buttons: `9999px` radius (`#17191c` filled + `1px solid #17191c` transparent ghost pair)
- Accent Peach Card (`.bm-peach-card`): `24px` radius, `#fbe1d1` fill, `#5d2a1a` text/strokes, zero shadow

## Antislop & Accessibility Notes (`R-02`, `R-25`, `R-37`)
- Typography substitutes documented in `DESIGN.md` (`Source Serif 4` and `Inter`) are loaded explicitly via Google Fonts.
- Normal muted body text uses `#686c76` (5.26:1 on `#ffffff`, 4.70:1 on `#f2f2f3`) so every label passes WCAG AA.
- Zero em dashes (U+2014) or decorative emojis appear in UI copy.
- `[SAMPLE DATA]` banners use the single Blush Peach editorial card per view.
