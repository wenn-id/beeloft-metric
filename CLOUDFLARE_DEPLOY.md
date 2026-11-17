# Panduan Deploy Produksi ke `beeloftmetric.biz.id` (Cloudflare)

Zona domain `beeloftmetric.biz.id` sudah aktif di Cloudflare DNS. Seluruh infrastruktur aplikasi ini telah dikonfigurasi agar langsung berjalan secara real-time di Cloudflare Workers + D1 + R2 + Cron Triggers.

## 1. Deploy Langsung ke `https://beeloftmetric.biz.id` (2 Perintah)

Buka terminal di folder proyek ini, lalu jalankan:

```bash
npx wrangler login
npm run cf:deploy
```

Apa yang dilakukan `npm run cf:deploy` secara otomatis:
1. Memastikan sesi login Cloudflare Wrangler aktif.
2. Membuat database **Cloudflare D1** bernama `beeloft-metric-db` dan menuliskan `database_id` ke `wrangler.toml`.
3. Menjalankan skema tabel produksi (`migrations/0001_production_schema.sql`) ke D1 remote.
4. Membuat bucket **Cloudflare R2** `beeloft-metric-media` (jika R2 sudah diaktifkan di akun Cloudflare Anda; jika belum, upload gambar ukuran `<= 1.5 MB` tetap berjalan otomatis memakai tabel D1).
5. Mem-build bundle produksi frontend ke `dist/` dan men-deploy Worker beserta custom domain `beeloftmetric.biz.id` serta `www.beeloftmetric.biz.id` dan jadwal Cron tiap 5 menit (`*/5 * * * *`).

> **Catatan Akun Pertama (Admin)**: Akun pertama yang mendaftar di `https://beeloftmetric.biz.id/register` secara otomatis mendapatkan role `ADMIN` (akses penuh ke menu **Operator Backoffice**, pembuatan kupon diskon, dan pengelolaan feature flags). Akun publik berikutnya otomatis terisolasi pada role `USER` paket `FREE`.

---

## 2. Konfigurasi Secret Opsional (OAuth Sosial, Email, Payment Gateway & AI)

Fitur inti (Multi-user Auth, 2FA TOTP, Real-Time Website Tracker `tracker.js`, Public SmartLinks `/bio/:slug`, Planner Calendar, R2 Media Upload, Inbox, Studio Reports, dan Workers AI) langsung berjalan tanpa secret tambahan.

Untuk mengaktifkan integrasi pihak ketiga, tambahkan secret melalui `npx wrangler secret put <NAMA_SECRET>` atau lewat **Cloudflare Dashboard -> Workers & Pages -> beeloft-metric -> Settings -> Variables and Secrets**:

### Email Transaksional (Verifikasi Email, Reset Password, Invite Tim)
Pilih salah satu provider:
- `RESEND_API_KEY`: API key dari Resend (`https://resend.com`)
- `MAILCHANNELS_API_KEY`: API key MailChannels
- `SMTP_RELAY_URL`: Endpoint HTTP relay milik Anda
- `EMAIL_FROM`: Alamat pengirim (default: `noreply@beeloftmetric.biz.id`)

### Payment Gateway (Upgrade Paket Otomatis)
- **Midtrans Snap (IDR)**:
  - `MIDTRANS_SERVER_KEY`: Server Key Midtrans Anda
  - `MIDTRANS_CLIENT_KEY`: Client Key Midtrans Anda
  - `MIDTRANS_IS_PRODUCTION`: `"true"` untuk live atau `"false"` untuk sandbox
  - Set Payment Notification URL di dashboard Midtrans ke: `https://beeloftmetric.biz.id/api/v2/webhooks/billing/midtrans`
- **Stripe Checkout (USD)**:
  - `STRIPE_SECRET_KEY`: Secret key Stripe (`sk_live_...`)
  - `STRIPE_WEBHOOK_SECRET`: Signing secret webhook Stripe (`whsec_...`) untuk event `checkout.session.completed` ke `https://beeloftmetric.biz.id/api/v2/webhooks/billing/stripe`

### OAuth2 Sosial Media & Auto-Publish API
Setel Redirect URI di portal developer masing-masing platform ke `https://beeloftmetric.biz.id/api/v2/oauth/<network>/callback`:
- **Instagram / Facebook / Meta Ads / Threads**: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` (Webhook URL: `https://beeloftmetric.biz.id/api/v2/webhooks/instagram`)
- **TikTok**: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
- **YouTube / Google Business / Google Ads**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **X (Twitter)**: `X_CLIENT_ID`, `X_CLIENT_SECRET`
- **LinkedIn**: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

### AI Eksternal (Opsional jika ingin selain Cloudflare Workers AI bawaan)
- `GEMINI_API_KEY` atau `OPENAI_API_KEY`

---

## 3. Auto-Deploy dari GitHub Actions (CI/CD)
Workflow `.github/workflows/deploy-cloudflare.yml` sudah disiapkan. Tambahkan repository secrets berikut di GitHub (`wenn-id/beeloft-metric` -> Settings -> Secrets and variables -> Actions):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Setiap `git push origin main` akan otomatis menjalankan tes produksi dan men-deploy pembaruan ke `https://beeloftmetric.biz.id`.
