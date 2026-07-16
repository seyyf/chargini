# Design Spec — Peer-to-Peer EV Charging Marketplace (Tunisia)

**Date:** 2026-07-16
**Status:** Approved concept, pending spec review
**Type:** Portfolio / learning full-stack project

---

## 1. Summary

A peer-to-peer marketplace ("Airbnb for EV charging") where people who own home
EV chargers in Tunisia list them for rent, and EV drivers find a nearby charger
on a map, book a time slot, charge, and rate each other afterward. It fills the
gap left by Tunisia's sparse public-charging network.

This is a **portfolio/learning project**. The goal is a polished, fully
clickable, full-stack demo — not a live commercial service. The hard real-world
concerns (real payment settlement, legal identity verification) are deliberately
**mocked** so effort goes into a great-looking, complete marketplace loop.

## 2. Goals & non-goals

**Goals**
- Demonstrate the complete two-sided marketplace loop: **list → discover → book → review**.
- Showcase full-stack skill: modern React UI, interactive maps, i18n, auth, a
  relational database, and role-aware dashboards.
- Look and feel like a real product a Tunisian EV driver would use.
- Deploy for free and stay running with zero maintenance cost.

**Non-goals (v1)** — explicitly out of scope, may come later:
- Real payment processing / money movement (checkout is mocked).
- Real government/ID verification (the "verified" badge is an admin/seed toggle).
- Live chat / messaging between host and driver.
- Hardware / OCPP integration or real-time charger status.
- Admin panel, dispute resolution, refunds, cancellations policy engine.
- Push/email notification system (beyond Supabase's built-in auth emails).

## 3. Users & roles

- **Host** — owns a home charger and wants to earn from it. Creates listings,
  sets price and availability, accepts/declines booking requests.
- **Driver** — needs to charge. Searches the map, filters, books a slot,
  completes a mock payment, reviews after charging.
- **A single account can be both host and driver.** Role is not exclusive; the
  dashboard adapts to what the user has done (listed a charger, made a booking, or both).
- **Guest** — can browse the landing page, the map, and charger details without
  an account. Must sign in to book or to list.

## 4. Core user journeys

### 4.1 Host lists a charger
1. Sign up / log in.
2. Guided listing form (`/host/new`):
   - Title + description
   - Address, then drop/adjust a pin on a Leaflet map → captures lat/lng + city
   - Connector type (Type 2 / Type 1 / CCS / CHAdeMO / Domestic Schuko)
   - Power in kW
   - Price: amount + unit (per **kWh** or per **hour**)
   - Photos (uploaded to Supabase Storage)
   - Weekly availability (day-of-week + start/end time rules)
3. Publish → listing becomes visible on `/explore`.

### 4.2 Driver discovers and books
1. `/explore` shows a **map + synchronized list** of active chargers across Tunisia.
2. Filters: connector type, minimum power (kW), max price, city/distance,
   "available now".
3. Open a charger detail page (`/chargers/[id]`): photos, specs, price, host
   profile snippet, reviews, availability.
4. Pick a time slot from the host's availability.
5. **Mock payment** step (realistic checkout UI, computes total, no real charge).
6. Booking confirmation (`/bookings/[id]`), booking appears in both dashboards.

### 4.3 Trust loop
1. After a booking's end time passes (or host marks it completed), both parties
   can leave a **rating (1–5) + comment**.
2. Reviews appear on the charger page and on public profiles (`/profile/[id]`).
3. Profiles show: average rating, review count, "verified" badge, member since.

### 4.4 Dashboard (`/dashboard`, role-aware)
- **As host:** my listings (edit/deactivate), incoming booking requests
  (accept/decline), mock earnings summary.
- **As driver:** upcoming and past bookings, quick link to leave reviews.

## 5. Technical architecture

- **Framework:** Next.js (App Router) + TypeScript (strict) + Tailwind CSS.
- **Backend / DB:** Supabase — Postgres, Auth (email + Google OAuth), Storage
  (charger photos), Row-Level Security to enforce ownership rules.
- **Data access:** Supabase client on the server (Server Components / Route
  Handlers) for reads/writes; RLS as the security backstop.
- **Maps:** Leaflet + OpenStreetMap tiles (no API key, no billing).
- **Internationalization:** `next-intl`, structured for multiple locales.
  **v1 ships French only**, but all UI strings live in message catalogs and the
  layout is direction-aware, so **Arabic + RTL is a clean phase-2 addition** (no
  refactor, just a new catalog + enabling the switcher + RTL styling pass).
- **Payments:** mocked. A `MockCheckout` flow computes the total and records a
  booking with a `paid (mock)` status; no payment provider is integrated.
- **Deploy:** Vercel (app) + Supabase cloud (DB/auth/storage), both free tier.

## 6. Data model (Postgres via Supabase)

- **profiles** — `id` (FK to auth.users), `full_name`, `avatar_url`, `bio`,
  `phone`, `is_verified` (bool), `rating_avg` (cached), `rating_count`,
  `created_at`.
- **chargers** — `id`, `host_id` (→ profiles), `title`, `description`,
  `address`, `lat`, `lng`, `city`, `connector_type` (enum), `power_kw`,
  `price_amount`, `price_unit` (enum: `kwh` | `hour`), `photos` (text[]),
  `is_active` (bool), `created_at`.
- **availability_rules** — `id`, `charger_id` (→ chargers), `day_of_week`
  (0–6), `start_time`, `end_time`.
- **bookings** — `id`, `charger_id` (→ chargers), `driver_id` (→ profiles),
  `start_time`, `end_time`, `status` (enum: `pending` | `confirmed` |
  `completed` | `cancelled`), `total_price`, `created_at`.
- **reviews** — `id`, `booking_id` (→ bookings), `reviewer_id` (→ profiles),
  `reviewee_id` (→ profiles), `rating` (1–5), `comment`, `created_at`.

**Row-Level Security highlights**
- Anyone can read active chargers, profiles, and reviews.
- A user can insert/update/delete only their own chargers and availability.
- A driver can create a booking; host and driver can read their own bookings.
- A review can be written only by a participant of a `completed` booking.

## 7. Route map

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Landing: hero, how-it-works, CTAs, featured chargers | public |
| `/explore` | Map + list + filters | public |
| `/chargers/[id]` | Charger detail + booking widget | public (book requires auth) |
| `/host/new` | Create-listing wizard | host (auth) |
| `/host/[id]/edit` | Edit a listing | owner |
| `/dashboard` | Role-aware host/driver dashboard | auth |
| `/bookings/[id]` | Booking confirmation/detail | participant |
| `/profile/[id]` | Public profile + reviews | public |
| `/auth` | Login / signup | public |

## 8. Domain notes (Tunisia)

- **Connector types** relevant locally: Type 2 (Mennekes, most common in EU/TN),
  Type 1, CCS, CHAdeMO, and Domestic Schuko for slow AC home outlets.
- **Currency:** Tunisian Dinar (TND); prices shown as `X,XXX TND` per kWh/hour.
- **Cities** for seed data: Tunis, Ariana, Sfax, Sousse, Nabeul, Bizerte, etc.

## 9. Visual direction

- Clean, modern, trust-forward. Energy/green accent color, plenty of whitespace,
  strong photography of chargers, clear pricing, prominent ratings/badges.
- Mobile-first responsive (drivers will use this on the road).
- Detailed screen layouts to be explored during implementation planning.

## 10. Testing

- TypeScript strict mode across the codebase.
- Component tests with Vitest + React Testing Library for key UI (filters,
  booking widget, listing form validation).
- One Playwright end-to-end test covering the **golden path**:
  host lists a charger → driver books it → driver leaves a review.

## 11. Seed data

Ship a seed script that creates a handful of demo hosts, ~15–20 chargers spread
across real Tunisian cities (with plausible lat/lng, connectors, prices, photos),
some availability rules, a few completed bookings, and reviews — so the deployed
demo looks alive on first visit.

## 12. Build phasing (for the implementation plan)

1. **Foundation** — Next.js + TS + Tailwind + `next-intl` (FR) + Supabase
   project, schema + RLS + seed script, auth.
2. **Discovery** — `/explore` map + list + filters, `/chargers/[id]` detail.
3. **Hosting** — `/host/new` listing wizard with photo upload + availability.
4. **Booking** — slot selection + mock checkout + confirmation + dashboards.
5. **Trust** — reviews, ratings rollup, public profiles, verified badge.
6. **Polish + tests** — landing page, responsive pass, seed content, E2E test,
   deploy to Vercel.
7. **Phase 2 (later)** — Arabic locale + RTL styling pass.
