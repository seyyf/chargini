# Chargini — P2P EV Charging Marketplace (Tunisia)

Peer-to-peer marketplace where people with home EV chargers rent them to drivers —
filling the gap left by Tunisia's sparse public-charging network.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind · Supabase (Postgres/Auth/Storage)
· next-intl. French UI today; Arabic + RTL is a planned phase 2.

## Setup

1. `npm install`
2. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   SUPABASE_SECRET_KEY=sb_secret_xxx
   ```
   These are Supabase's **new** API key names. The URL and publishable key need the
   `NEXT_PUBLIC_` prefix because the browser client reads them; the secret key must
   NOT be prefixed — it is server-only (seed script) and must never reach the browser.
3. In the Supabase SQL Editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_rls.sql` (order matters — tables first, then policies).
4. `npm run seed` — loads 6 demo hosts and 18 chargers across Tunis, Ariana, Sfax,
   Sousse, Nabeul and Bizerte, plus availability, bookings and reviews.
5. `npm run dev` → http://localhost:3000/fr

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit + component tests (Vitest) |
| `npm run build` | Production build (also type-checks) |
| `npm run seed` | Load demo data (idempotent — safe to re-run) |

## Demo accounts

Created by the seed script, all with password `Password123!`:
`host0@example.com` … `host5@example.com` (hosts), `driver@example.com` (driver).

## Architecture notes

- **Routing:** every page lives under `/[locale]`; middleware redirects `/` → `/fr`.
- **Auth:** Supabase email/password + Google OAuth. Middleware refreshes the session
  and mirrors cookies onto both request and response so Server Components see the
  fresh token in the same render.
- **Security:** Row-Level Security is enabled on all five tables. Verified enforcing:
  anonymous users can read active chargers but cannot read bookings or insert chargers.
  The OAuth callback validates its `next` parameter via `safeNextPath()` to prevent
  open redirects (see `src/lib/safeRedirect.ts` and its tests).
- **Pricing:** `src/lib/pricing.ts` computes booking totals for per-kWh and per-hour
  chargers.

## Known gaps (intentional — later phases)

- `/explore`, `/host/new`, and `/dashboard` are linked in the header but **not built yet**;
  they 404. They arrive in phases 2–4.
- Google OAuth works only once a Google provider is configured in Supabase; until then
  the button surfaces an error.
- Arabic locale + RTL styling is phase 2. The i18n structure is already in place — adding
  it means adding `"ar"` to `src/i18n/routing.ts` plus a `messages/ar.json` catalog.

## Environment quirk

`next dev` (Turbopack) does not execute middleware in some sandboxed environments, so the
`/` → `/fr` redirect may not fire in dev there. It works correctly under
`npm run build && npx next start`. Navigate directly to `/fr` in dev if affected.

## Status

**Phase 1 (Foundation) complete:** i18n, database schema + RLS, seed data, auth, app shell.
Roadmap and specs live in `../docs/superpowers/`.
