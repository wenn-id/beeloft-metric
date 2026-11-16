# BeeloftMetric

Full-stack social analytics, content planning, inbox, SmartLinks, reporting, and attribution platform built with Vue 3, Vite, Pinia, and Fastify, styled with the Steep editorial design system ("serif analytics on warm paper").

## Architecture

- **Frontend (`src/`)**: Vue 3 + TypeScript + Pinia + Vue Router (`127.0.0.1:5173`), featuring the Steep design system (`Source Serif 4`, `Inter`, `#ffffff` Paper White canvas, `#f2f2f3` Mist Gray cards, `#17191c` Ink Black pill CTAs, `#fbe1d1` Blush Peach / `#5d2a1a` Sienna Brown editorial accents).
- **Backend (`server/`)**: Fastify 5 + TypeScript + local JSON store (`127.0.0.1:4000`), pre-seeded with `Beeloft Studio [SAMPLE DATA]` (`blogId=8137744`) and `Empty brand` (`blogId=8137743`).
- **Modules & Suites**:
  - Public Marketing Landing, Pricing, Login/Register, Public SmartLink Bio (`/bio/:slug`), and Public Studio View
  - Analytics / Evolution (`/evolution/brandSummary`, real-time web analytics, competitors, hashtag tracker)
  - Planner, AutoLists, Flows, Media Library, and Trash (`/planner`)
  - Unified Inbox (`/inbox`), SmartLinks (`/smartlink`), Reporting & Studio (`/reporting`), Advertising Suite (`/advertising`), Brand Connections (`/brands/connections`), Tasks & Review Portals (`/my-tasks`), Team & Org Settings (`/user-management`, `/organization-settings`), User Settings, Affiliation, and Backoffice
  - First-party attribution tracker endpoints (`/s/session`, `/s`, `/p`, `/s/apvid/:vid`)

## Quickstart

```bash
npm install
npm run dev
```

- Web app: `http://127.0.0.1:5173`
- API server: `http://127.0.0.1:4000` (proxied automatically via Vite `/api/*`, `/s/*`, `/p`)

## Scripts

- `npm run dev` - Run Fastify API (`dev:api`) and Vite dev server (`dev:web`) concurrently
- `npm run build` - Run `vue-tsc --noEmit` and production `vite build`
- `npm test` - Run Vitest API & attribution integration tests (`server/__tests__/api.test.ts`)
- `npm run preview` - Preview production build on port `4173`
