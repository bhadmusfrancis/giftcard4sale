# GiftCard4Sale.com

A robust, cross-platform platform for selling gift cards for **USDT, Naira (NGN), or Cedi (GHS)** — similar to giftcardstonaira.com / noones.com.

- **Web app** (Next.js, App Router) — server-rendered, SEO-friendly, **mobile-responsive + installable PWA** (works like an app on phones).
- **REST API** (Express + Prisma + PostgreSQL).
- **Shared package** with the rate-text **parser** and **rate calculator** used by both.

> The same API powers any future native mobile client (React Native / Expo) — all business logic lives server-side.

---

## Features

### For users
- Browse gift card types and **calculate the live rate** (by card country/currency, denomination tier, physical vs e-code) **before** opening a trade.
- Email/password auth with **email verification** (required before trading/withdrawing).
- **Open a trade**: upload card pictures or paste e-codes, set physical/e-code, receipt (none/cash/debit). Strong warning against used/bad cards; trade is created as **PENDING**.
- **Dashboard**: display name & avatar, three wallets (USDT/NGN/GHS), bold **Good (green)** and **Bad (red)** transaction scores, trust level.
- **Wallet**: balances grow on successful trades, decrease on withdrawals. Send USDT to an address, send Naira to a **saved Nigerian bank account**, send Cedi to a mobile-money/address.
- **History**: wallet transactions, trade status, withdrawal status.
- **Referrals**: dedicated link/code, earn **1% of every successful trade by referrals, for life**; monitor referral growth & earnings.
- Request a rate that isn't listed (logged-in users).
- **Notifications**: in-app + email + web push for all major activity.

### For admins
- Create & manage users; mark **good/bad** transaction scores (+1 each); adjust balances.
- Create a trade on behalf of a user; update trade status; **trade chat** to request more info.
- Approve/reject **withdrawals** (rejection auto-refunds the held funds).
- Update gift-card rates **manually** or by **pasting the rate text** (Naira/USD format) — the system parses it, deducts **20% for Naira** and **30% for USDT/Cedi**, ignores "in Ns", and always uses the **SLOW** rate. NGN→USDT/GHS conversion uses configurable exchange rates.
- Manage the **referral program** percentage and exchange rates.
- Manage **SEO landing pages** rewritten from Facebook posts (e.g. `/sell-lowes-gift-card`).

---

## Rate logic (how payouts are computed)

The pasted rate is **NGN per 1 unit of the card's face currency** (the SLOW rate). For a card of amount `A`:

| Payout | Formula |
| --- | --- |
| **Naira (NGN)** | `A × rate × (1 − 20%)` |
| **USDT** | `A × rate × (1 − 30%) ÷ NGN_per_USDT` |
| **Cedi (GHS)** | `A × rate × (1 − 30%) ÷ NGN_per_GHS` |

All percentages and exchange rates are admin-configurable in **Admin → Rates & cards**.

The parser (`packages/shared/src/rateParser.ts`) understands the sample format:
`===【Apple/iTunes】SLOW ===`, `● US (200-500 in 100s) = 1092`, `● US code (...) = 935` (e-code), inline brands `●【Doordash】(100-500) = 712`, country→currency mapping, and SLOW/FAST de-duplication.

---

## Tech stack

| Layer | Tech |
| --- | --- |
| Web | Next.js 14, React 18, TypeScript, Tailwind CSS, PWA |
| API | Node 20, Express, TypeScript, Prisma ORM, Zod |
| DB | PostgreSQL 16 |
| Auth | JWT, bcrypt, email verification |
| Email | Nodemailer (SMTP) — Mailpit for local dev |
| Push | Web Push (VAPID) + service worker |
| Uploads | Multer (local disk; swap for S3 in prod) |

---

## Project structure

```
GiftCard4Sale/
├─ apps/
│  ├─ api/                # Express + Prisma backend
│  │  ├─ prisma/          # schema.prisma + seed.ts
│  │  └─ src/
│  │     ├─ routes/       # auth, cards, trades, me, withdrawals, referrals, notifications, landing, admin
│  │     ├─ services/     # email, push, notify, wallet, payout, rateConfig, rateImport
│  │     └─ lib/          # auth, http, upload
│  └─ web/                # Next.js frontend
│     └─ src/app/         # public pages, dashboard/*, admin/*
├─ packages/
│  └─ shared/             # rate parser + calculator + shared types
├─ scripts/               # import-fb-posts.mjs (+ sample data)
├─ docker-compose.yml     # postgres + mailpit
└─ .env.example
```

---

## Setup from scratch

### 0. Prerequisites
- **Node.js 20+** and npm
- A **PostgreSQL database** — either:
  - **Hosted (recommended, nothing on your PC):** a free managed Postgres from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app). Just paste its connection string into `DATABASE_URL` (keep `?sslmode=require`). **No Docker needed** — skip `npm run db:up`.
  - **Local via Docker:** install Docker and use `npm run db:up` (also starts Mailpit for catching dev emails).

> Using a hosted DB? You can also point `SMTP_*` at a real email provider (or a free SMTP service), since Mailpit only runs with the local Docker setup.

### 1. Clone & configure env

```bash
# from the project root
cp .env.example .env
cp .env.example apps/api/.env      # the API + Prisma CLI read this one
```

Create `apps/web/.env.local` for the web app's public vars:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

(Optional) generate web-push keys and paste them into `.env` / `apps/api/.env`:

```bash
npx web-push generate-vapid-keys
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure (Postgres + Mailpit)

```bash
npm run db:up
# Mailpit UI (see verification/notification emails): http://localhost:8025
```

### 4. Build shared, run migrations, seed

```bash
npm run build:shared
npm run db:migrate      # creates tables
npm run db:seed         # admin user + sample rates + sample landing pages
```

The seed prints the admin credentials (defaults: `admin@giftcard4sale.com` / `ChangeMe123!`).

> Shortcut: `npm run setup` runs install → build:shared → db:up → migrate → seed.

### 5. Run the apps

```bash
# in one terminal
npm run dev:api      # http://localhost:4000

# in another terminal
npm run dev:web      # http://localhost:3000
```

Or run both together: `npm run dev`.

### 6. Try it
- Visit http://localhost:3000 and a card page like http://localhost:3000/sell-lowes-gift-card
- Register a user → check Mailpit (http://localhost:8025) → verify email.
- Calculate a rate → open a trade (upload an image).
- Log in as admin → http://localhost:3000/admin → approve/pay the trade, watch the wallet credit.

---

## Importing the Facebook posts as SEO pages

Facebook profile pages require login and cannot be scraped automatically. The workflow is:

1. For each FB post (e.g. `https://web.facebook.com/share/p/1HNn7qJMHc/`), write a **unique rewrite** of the content.
2. Pick the matching slug — same shape as the example: `sell-lowes-gift-card` → `https://www.giftcard4sale.com/sell-lowes-gift-card/`.
3. Add entries to a JSON file (see `scripts/fb-posts.sample.json`).
4. Bulk import:

```bash
ADMIN_EMAIL=admin@giftcard4sale.com ADMIN_PASSWORD=ChangeMe123! \
  node scripts/import-fb-posts.mjs ./scripts/fb-posts.sample.json
```

You can also create/edit pages individually in **Admin → Landing pages**. Linking a page to a card type embeds the live rate calculator on that page.

---

## Going to production (checklist)

Set `NODE_ENV=production` (the API refuses to start with a weak `JWT_SECRET` in prod).

**Built-in, just add env values:**
- **Security**: Helmet, locked-down CORS (`CORS_ORIGINS`), and rate limiting (auth/trade/withdrawal endpoints) are already wired in.
- **Cloud uploads**: set `S3_BUCKET` (+ `S3_*`) to store card images in S3 / Cloudflare R2 / Supabase instead of local disk — no code change. Leave blank for local disk in dev.
- **Email**: set `SMTP_*` for a real provider (presets for Resend/Brevo/SES/Postmark/Gmail are in `.env.example`). Verify your domain (SPF/DKIM/DMARC).
- **Web push**: set `VAPID_*` (`npx web-push generate-vapid-keys`).
- **Automated Naira payouts**: set `PAYOUT_PROVIDER=paystack` (or `flutterwave`) + the secret key. When an admin marks an NGN withdrawal **PAID**, the transfer is sent automatically; `manual` (default) just records it.
- **SEO**: `robots.txt`, `sitemap.xml` (auto-includes card + landing pages), canonical URLs, JSON-LD, and a PWA icon are included.

**Operational steps:**
- Deploy DB on a managed Postgres (Neon/Supabase/etc.); run `npm run prisma:deploy` on deploy.
- Deploy the API (Railway/Render/Fly/VPS) and the web app (Vercel/Node). Point `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` at the live URLs.
- Put everything behind HTTPS; the API sets `trust proxy` in production.

**Still to add for a money platform (not code-blocked here):**
- **USDT/Cedi automated payouts** (extend `services/payoutProvider.ts`) — currently manual.
- A **live FX feed** to auto-update `RateConfig` (NGN/USDT, NGN/GHS).
- **KYC/AML, ToS/Privacy, fraud rules, and 2FA for admins.**
- Native apps later with Expo against the same API, or ship the PWA as-is.

---

## Security notes

- Email verification is required before opening trades or withdrawing.
- Withdrawals **hold (debit) funds immediately** and refund automatically on rejection — preventing double-spend.
- All money math uses SQL `Decimal`; wallet changes are written through a single ledger (`WalletTransaction`) inside DB transactions.
- Admin routes are protected by role checks.

---

## Useful npm scripts (root)

| Script | Description |
| --- | --- |
| `npm run setup` | install + build shared + start db + migrate + seed |
| `npm run dev` | run API + web together |
| `npm run dev:api` / `npm run dev:web` | run individually |
| `npm run db:up` | start Postgres + Mailpit |
| `npm run db:migrate` | apply Prisma migrations |
| `npm run db:seed` | seed admin, rates, landing pages |
```
