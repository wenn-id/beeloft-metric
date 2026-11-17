# BeeloftMetric

Production multi-tenant social analytics, publishing calendar, Comment-to-DM automation, Unified Inbox, SmartLinks (`/bio/:slug`), and first-party web attribution platform engineered for Cloudflare Edge (`https://beeloftmetric.biz.id`).

## Production Stack

- **Frontend (`src/`)**: Vue 3 + Vite + Pinia + Vue Router with the Steep editorial design system (`Source Serif 4`, `Inter`, Paper White `#ffffff`, Mist Gray `#f2f2f3`, Ink Black `#17191c`, Blush Peach `#fbe1d1`, and Sienna Brown `#5d2a1a`).
- **Cloudflare Edge Runtime (`worker/index.ts`, `functions/`)**:
  - **Cloudflare Workers + Static Assets** (`wrangler.toml`) and **Cloudflare Pages Functions** (`functions/`) sharing a single universal routing core (`server/cloudflare/edgeRouter.ts`).
  - **Cloudflare D1 (`DB`)**: Relational SQLite schema (`migrations/0001_production_schema.sql`) with multi-user workspace isolation, global `/bio/:slug` SmartLink index, global shared Studio report index, and real-time `web_events` aggregation.
  - **Cloudflare R2 (`MEDIA_BUCKET`)**: Binary image and video uploads (`POST /api/v2/media/upload`, `GET /api/v2/media/:id`) with D1 fallback for smaller assets.
  - **Cloudflare Cron Triggers (`*/5 * * * *`)**: Background scheduler (`server/jobs/scheduler.ts`) executing due `SCHEDULED` posts and active queues automatically.
  - **Cloudflare Workers AI / Gemini / OpenAI**: Natural language post drafting (`POST /api/v2/integrations/ai/natural-language-scheduling`).
- **Security, OAuth2, Email & Billing**:
  - `PBKDF2-SHA256` (100,000 iterations) salted password hashing, `HttpOnly; Secure; SameSite=Lax` session cookies (`_bm_session`), `X-Mc-Auth` API tokens, RFC 6238 `TOTP` 2FA, and `ROLE_ADMIN` RBAC.
  - OAuth2 authorization & callback flows for Meta (Instagram/Facebook), TikTok, Google/YouTube, X (PKCE), and LinkedIn + signed webhook ingestion (`/api/v2/webhooks/:network`).
  - Transactional email via Resend, MailChannels, or webhook relay (`server/services/mailer.ts`).
  - Subscription quotas & checkout via Midtrans Snap (IDR) and Stripe Checkout (USD) with signed webhook verification (`/api/v2/webhooks/billing/:provider`).

## Deploy to `beeloftmetric.biz.id` (Cloudflare)

```bash
npx wrangler login
npm run cf:deploy
```

`npm run cf:deploy` automatically provisions your `beeloft-metric-db` D1 database, applies `migrations/0001_production_schema.sql`, provisions the `beeloft-metric-media` R2 bucket (when R2 is active on your account), builds `dist/`, and deploys the Worker + Custom Domain routes (`beeloftmetric.biz.id` and `www.beeloftmetric.biz.id`).

See [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) for optional OAuth2, SMTP/Resend, AI, and Midtrans/Stripe secret configuration.

## Local Development & Testing

```bash
npm install
npm run dev
npm test
npm run build
```
