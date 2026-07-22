# EV Charging Marketplace — Plan 2: Discovery Implementation Plan

**Goal:** Build the driver-facing discovery experience: `/explore` (map + synchronized
list + filters) and `/chargers/[id]` (charger detail with specs, price, host snippet,
reviews, availability). Booking itself is Phase 4 — the detail page shows a "book" CTA
that routes unauthenticated users to `/auth` and authenticated users to a placeholder.

**Reference spec:** `docs/superpowers/specs/2026-07-16-ev-charging-marketplace-design.md`
(sections 4.2, 7). Phase 1 foundation is complete and on `main`.

## Critical environment constraints (ALL tasks must honor)

- **Next.js 16** — breaking changes vs training data. `params` and `searchParams` are
  **Promises** (`params: Promise<{ locale: string; id: string }>`), await them. Read the
  relevant guide under `node_modules/next/dist/docs/01-app/` before writing page/route code.
- **RLS column grants:** `select('*')` / bare `.select()` on `profiles` FAILS with
  "permission denied" for anon/authenticated (migration `0003_rls_hardening.sql` added
  column-level grants). **Always name explicit columns** when selecting from `profiles`.
  `phone`, `is_verified`, `rating_avg`, `rating_count` are readable columns; safe to select.
- **i18n:** every user-visible string comes from `messages/fr.json` via `next-intl`
  (`useTranslations` in client/server components, `getTranslations` in async server comps).
  No hardcoded French in JSX.
- **Routing:** all pages live under `src/app/[locale]/`. Use `Link` from `@/i18n/navigation`
  (NOT `next/link`) for internal navigation so the locale prefix is preserved.
- **Supabase:** server reads use `createSupabaseServerClient()` from `@/lib/supabase/server`.
  Row types are in `@/types/database.ts`.
- **Styling:** Tailwind v4, emerald accent (`emerald-600`), slate neutrals — match the
  existing home page / header aesthetic. Mobile-first responsive.
- Run `npm test` and `npm run build` (from `depannage-ev/`) before declaring a task done.

---

## Task 1: Charger display + filter domain logic (TDD, pure)

**Files:**
- Create: `src/lib/chargers/format.ts`
- Create: `src/lib/chargers/format.test.ts`
- Create: `src/lib/chargers/filter.ts`
- Create: `src/lib/chargers/filter.test.ts`

Pure, framework-free logic — build test-first. No Supabase, no React.

**`format.ts`** exports:
- `CONNECTOR_LABELS: Record<ConnectorType, string>` — human labels:
  `type2: "Type 2"`, `type1: "Type 1"`, `ccs: "CCS"`, `chademo: "CHAdeMO"`,
  `schuko: "Prise domestique"`.
- `formatPrice(amount: number, unit: PriceUnit): string` — returns e.g.
  `"0,450 TND / kWh"` or `"5,000 TND / h"`. Use French decimal comma. kWh → `/ kWh`,
  hour → `/ h`. Amount formatted with 3 decimals (matches DB `numeric(x,3)`), trailing-
  zero trimming NOT required — keep 3 decimals for kwh, and for hour show up to 3 decimals
  but you may trim to a clean form; keep it simple and deterministic. (Recommended:
  `new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })`.)
- `formatPower(kw: number): string` — e.g. `"7 kW"` / `"3.7 kW"` (French comma:
  `"3,7 kW"`). Use `Intl.NumberFormat("fr-FR")` for the number.

**`filter.ts`** exports a pure filter:
```ts
export interface ChargerFilters {
  connectorTypes: ConnectorType[]; // empty = any
  minPowerKw: number | null;
  maxPrice: number | null;         // compares against price_amount
  city: string | null;             // exact match, null/"" = any
}
export function filterChargers<T extends Pick<Charger,
  "connector_type" | "power_kw" | "price_amount" | "city">>(
  chargers: T[], filters: ChargerFilters): T[]
```
Semantics: a charger passes if it matches ALL active filters. `connectorTypes` empty →
no connector constraint; otherwise `connector_type` must be in the array. `minPowerKw` →
`power_kw >= minPowerKw`. `maxPrice` → `price_amount <= maxPrice`. `city` set → exact
`city` equality. Also export `EMPTY_FILTERS: ChargerFilters` (all-inactive default) and
`cityOptions(chargers): string[]` returning the sorted unique city list.

**Tests must cover:** each filter independently, combined filters, empty-filters passes
everything, connector multi-select, price boundary (`<=`), power boundary (`>=`),
`formatPrice` for both units, `cityOptions` dedup+sort.

Import `ConnectorType`, `PriceUnit`, `Charger` from `@/types/database`.

**Model:** cheap/fast — isolated pure functions with a complete spec.

---

## Task 2: French i18n strings for discovery

**Files:**
- Modify: `messages/fr.json`

Add these top-level sections (keep existing keys intact, valid JSON). Wording is a
suggestion — keep it natural French, consistent with existing tone:

```json
"explore": {
  "title": "Bornes disponibles",
  "resultsCount": "{count, plural, =0 {Aucune borne} one {# borne} other {# bornes}}",
  "filters": {
    "heading": "Filtres",
    "connector": "Type de prise",
    "minPower": "Puissance min. (kW)",
    "maxPrice": "Prix max. (TND)",
    "city": "Ville",
    "allCities": "Toutes les villes",
    "reset": "Réinitialiser",
    "anyConnector": "Toutes les prises"
  },
  "empty": "Aucune borne ne correspond à vos critères.",
  "viewDetails": "Voir la borne"
},
"charger": {
  "perKwh": "par kWh",
  "perHour": "par heure",
  "specs": "Caractéristiques",
  "connector": "Type de prise",
  "power": "Puissance",
  "price": "Prix",
  "location": "Emplacement",
  "host": "Hôte",
  "verified": "Vérifié",
  "memberSince": "Membre depuis {date}",
  "reviews": "Avis",
  "noReviews": "Pas encore d'avis.",
  "ratingSummary": "{avg} ({count})",
  "availability": "Disponibilités",
  "noAvailability": "Aucune disponibilité renseignée.",
  "book": "Réserver",
  "bookRequiresAuth": "Connectez-vous pour réserver",
  "bookingComingSoon": "La réservation arrive bientôt.",
  "backToExplore": "Retour aux bornes",
  "notFound": "Cette borne n'existe pas ou n'est plus disponible."
},
"days": {
  "0": "Dimanche", "1": "Lundi", "2": "Mardi", "3": "Mercredi",
  "4": "Jeudi", "5": "Vendredi", "6": "Samedi"
},
"connectors": {
  "type2": "Type 2", "type1": "Type 1", "ccs": "CCS",
  "chademo": "CHAdeMO", "schuko": "Prise domestique"
}
```

**Verify** the file is valid JSON (`node -e "require('./messages/fr.json')"`).

**Model:** cheap/fast — data-entry task.

---

## Task 3: Charger data-access layer

**Files:**
- Create: `src/lib/chargers/queries.ts`

Server-side query helpers using `createSupabaseServerClient()`. **Name explicit columns
everywhere** (never `select('*')`), especially for `profiles`.

Export:
- `getActiveChargers(): Promise<Charger[]>` — all `is_active = true` chargers, ordered
  `created_at desc`. Select every `Charger` column explicitly. Return `[]` on error
  (log the error via `console.error`).
- `ChargerDetail` type = `Charger` plus:
  - `host: Pick<Profile, "id" | "full_name" | "avatar_url" | "is_verified" | "rating_avg" | "rating_count" | "created_at">`
  - `availability: AvailabilityRule[]` (ordered by `day_of_week`, then `start_time`)
  - `reviews: Array<Review & { reviewer: Pick<Profile, "id" | "full_name" | "avatar_url"> }>`
    (reviews where `reviewee_id = host_id`, newest first, limit 20)
- `getChargerDetail(id: string): Promise<ChargerDetail | null>` — fetch the charger by id
  (any active or inactive — RLS already restricts inactive to owner; for the public page
  treat a not-found / inactive-for-anon as `null`). Then fetch host profile (named cols),
  availability rules, and reviews about the host. Return `null` if the charger row is
  missing. Compose with separate queries or a Supabase nested select — your choice, but
  if you use nested `select` on the embedded profile, still name the profile columns
  (e.g. `host:profiles!chargers_host_id_fkey ( id, full_name, ... )`).

Keep functions small and independently readable. Import row types from `@/types/database`.

**Context:** RLS policy `chargers readable` = `is_active OR auth.uid() = host_id`; the
public explore/detail pages run as anon or the visitor, so only active chargers (or the
viewer's own) are visible — that's the intended behavior. Reviews + profiles + availability
are world-readable per RLS.

**Model:** standard — Supabase query composition + RLS awareness.

---

## Task 4: Explore page — filters + synchronized list (no map yet)

**Files:**
- Create: `src/app/[locale]/explore/page.tsx` (server component)
- Create: `src/components/explore/ExploreClient.tsx` (client)
- Create: `src/components/explore/Filters.tsx` (client)
- Create: `src/components/explore/ChargerCard.tsx`
- Create: `src/components/explore/ChargerList.tsx`
- Test: `src/components/explore/Filters.test.tsx`

`page.tsx` (async server component): awaits `params`, calls `getActiveChargers()`, renders
`<ExploreClient chargers={chargers} />`. Give it a sensible `<h1>` from `explore.title`.

`ExploreClient` (`"use client"`): holds `ChargerFilters` state (init `EMPTY_FILTERS`),
derives the filtered list with `filterChargers`, and lays out:
- a `<Filters>` panel (sidebar on desktop `md:`, stacked on mobile),
- a results header showing `explore.resultsCount` with the filtered count,
- a `<ChargerList>` of `<ChargerCard>`s.
Leave a clearly-marked placeholder slot / prop seam where the map will mount in Task 5
(e.g. render `{children}` or a `<div>` map column) — Task 5 will fill it. Do NOT install
or import leaflet in this task.

`Filters`: controlled inputs bound to the filter state via an `onChange(filters)` callback
(connector multi-select as checkboxes or a multi-select; min power number input; max price
number input; city `<select>` built from `cityOptions`). Include a Reset button →
`EMPTY_FILTERS`. All labels from `explore.filters.*`. Connector labels from the
`connectors.*` catalog or `CONNECTOR_LABELS`.

`ChargerCard`: shows title, city, connector label, power (`formatPower`), price
(`formatPrice`), and a `Link` (from `@/i18n/navigation`) to `/chargers/{id}` labeled
`explore.viewDetails`. Clean card styling (border, rounded, hover). If `photos[0]` exists
show it, else a neutral placeholder block.

`ChargerList`: maps chargers → cards in a responsive grid; when empty shows `explore.empty`.

**Test** (`Filters.test.tsx`, Vitest + RTL): render `<Filters>` inside
`NextIntlClientProvider` (locale `fr`, pass a minimal messages object covering the
`explore.filters` keys used), assert the connector/city/power/price controls render, and
that changing the min-power input fires `onChange` with the updated filters. Follow the
existing `LanguageSwitcher.test.tsx` pattern.

**Context:** filtering is client-side over the full active set (~18 rows) — snappy and
simple, no server round-trips. `filterChargers`, `EMPTY_FILTERS`, `cityOptions`,
`ChargerFilters` come from Task 1 (`@/lib/chargers/filter`); formatters from
`@/lib/chargers/format`.

**Model:** standard — multi-component client/server integration.

---

## Task 5: Leaflet map, synchronized with the list

**Files:**
- Modify: `package.json` (add `leaflet`, `react-leaflet`; dev `@types/leaflet`)
- Create: `src/components/explore/ChargerMap.tsx` (client, leaflet)
- Modify: `src/components/explore/ExploreClient.tsx` (mount the map, sync selection)

Install: `npm install leaflet react-leaflet` and `npm install -D @types/leaflet`.

`ChargerMap` (`"use client"`): renders a Leaflet map (OpenStreetMap tiles, no API key)
centered on Tunisia (approx `lat 34.0, lng 9.5`, zoom 6) with a marker per charger. Props:
`chargers`, `selectedId`, `onSelect(id)`. Clicking a marker → `onSelect`; a popup shows
the charger title + price + a details `Link`. Fix the known Leaflet default-marker-icon
issue under bundlers (set `L.Icon.Default` image paths, or use a custom `divIcon`).
Import Leaflet CSS (`import "leaflet/dist/leaflet.css"`).

`ExploreClient`: import the map via `next/dynamic` with `{ ssr: false }` (this is allowed
because ExploreClient is a Client Component — confirmed in
`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`). Render map + list side by
side on desktop (`md:` two columns), stacked on mobile. Wire shared `selectedId` state so
hovering/clicking a card can highlight its marker and vice-versa (at minimum: clicking a
marker scrolls/highlights the matching card OR selecting a card centers the map — implement
one coherent synchronization; keep it simple and working). The map shows the **filtered**
chargers, staying in sync with the filters from Task 4.

**Context:** react-leaflet needs `window` → must be client-only (`ssr: false`), hence the
dynamic import. Verify the map renders in the browser (Task 7 covers this).

**Model:** standard — leaflet/Next SSR integration is the fiddly part.

---

## Task 6: Charger detail page

**Files:**
- Create: `src/app/[locale]/chargers/[id]/page.tsx` (async server component)
- Create: `src/components/charger/HostCard.tsx`
- Create: `src/components/charger/ReviewList.tsx`
- Create: `src/components/charger/AvailabilityTable.tsx`
- Create: `src/components/charger/BookingCta.tsx` (client)

`page.tsx`: await `params` (`{ locale, id }`), call `getChargerDetail(id)`. If `null`,
render `notFound()` (Next 16 `notFound()` from `next/navigation`) — the existing
`[locale]/not-found.tsx` will display. Otherwise render a detail layout:
- Photo gallery (or placeholder if `photos` empty) + title + city/address.
- Specs block (`charger.specs`): connector label, power (`formatPower`), price
  (`formatPrice`) — use the `charger.*` labels.
- `<HostCard host={...} />`: avatar (or initial), full name, verified badge
  (`charger.verified`) when `is_verified`, rating summary (`charger.ratingSummary` with
  `rating_avg`/`rating_count`), member-since (`charger.memberSince`, format `created_at`
  year+month in French via `Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "long" })`).
  Link to `/profile/{host.id}` (route arrives Phase 5 — link is fine, it 404s for now;
  add a `// Phase 5` note).
- `<AvailabilityTable availability={...} />`: weekly rules grouped by day using the
  `days.*` catalog; show `charger.noAvailability` when empty.
- `<ReviewList reviews={...} />`: each review shows reviewer name, rating (★), comment,
  date; `charger.noReviews` when empty.
- `<BookingCta chargerId price=... />` (`"use client"`): a prominent "Réserver" button.
  Since booking is Phase 4, on click show `charger.bookingComingSoon` (e.g. disabled state
  or a toast/inline message). Keep it a clear seam for Phase 4 to replace. If you can read
  auth state easily server-side, you may pass an `isAuthed` prop and show
  `charger.bookRequiresAuth` for guests — optional, keep simple.
- A `backToExplore` `Link` to `/explore`.

Use `getTranslations` in the async server component; `useTranslations` in client children.
Format dates/numbers with the French helpers. Keep each component single-responsibility.

**Model:** standard — multi-component server page with data plumbing.

---

## Task 7: Browser verification + polish pass

**Files:** (bug-fix only, as needed)

Run the app (`npm run dev`, or `npm run build && npx next start` if middleware doesn't run
in dev here — see README "Environment quirk") and drive it with the agent-browser tool:
1. `/fr/explore` loads, shows the map with markers + the list of seeded chargers.
2. Filters narrow both list and map (try connector, min power, max price, city, reset).
3. Clicking a card → `/fr/chargers/[id]` detail renders with specs, host, availability,
   reviews, booking CTA.
4. Booking CTA shows the "coming soon" affordance.
5. Unknown charger id → not-found page.
6. No console errors; responsive at mobile width.

Fix any issues found. Then run `npm test` and `npm run build` — both must pass.

**Model:** standard — exploratory QA + targeted fixes.

---

## Done criteria for Phase 2

- `/fr/explore` shows a synchronized Leaflet map + filterable list of active chargers.
- Filters (connector, min power, max price, city, reset) work over map + list.
- `/fr/chargers/[id]` shows full charger detail: specs, host snippet w/ verified badge +
  rating, weekly availability, reviews, and a booking CTA seam for Phase 4.
- Unknown/inactive charger → not-found.
- `npm test` and `npm run build` pass; no `select('*')` on profiles; all strings i18n'd.

**Next plan:** Plan 3 — Hosting (`/host/new` listing wizard with photo upload + availability).
</content>
</invoke>
