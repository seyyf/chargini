# EV Charging Marketplace — Plan 4: Booking Implementation Plan

**Goal:** Driver picks a slot on a charger, goes through a **mock checkout**, and a
booking is created as `pending`. Both parties see it: the host **accepts**
(→`confirmed`) or **declines** (→`cancelled`) from a role-aware `/dashboard`; the
driver sees status on `/bookings/[id]`. A confirmed booking whose end time has passed
can be **completed** (enables reviews in Phase 5). No real payment.

**Reference spec:** sections 4.2, 4.4, 6, 7. Phase 3 (hosting) is merged.

## Environment facts
- `bookings` table: id, charger_id, driver_id, start_time (timestamptz), end_time,
  status (`pending|confirmed|completed|cancelled`), total_price, created_at.
- RLS: `bookings driver insert` (auth.uid()=driver_id); `bookings participant read`
  (driver OR the charger's host); `bookings participant update` (driver OR host).
  So host accept/decline/complete = UPDATE (allowed); driver cancel = UPDATE (allowed).
- `calculateBookingTotal({priceUnit, priceAmount, startTime, endTime, powerKw?})` in
  `@/lib/pricing.ts` — per-hour uses duration; per-kwh needs `powerKw`. Reuse it.
- `getChargerDetail(id)` returns charger + host + availability + reviews.
- Auth user server-side: `createSupabaseServerClient().auth.getUser()`.
- Next 16: params/searchParams are Promises; server actions `"use server"`; internal
  nav via `@/i18n/navigation`. All strings via next-intl.
- `formatPrice`, `CONNECTOR_LABELS`, `formatPower` in `@/lib/chargers/format`.

---

## Task 1: Booking availability + slot logic (TDD, pure)

**Files:** `src/lib/bookings/availability.ts` (+ `.test.ts`).

Framework-free. Import `AvailabilityRule` from `@/types/database`. Export:
- `dayOfWeekOf(dateISO: string): number` — weekday 0(Sun)–6(Sat) for a `"YYYY-MM-DD"`
  string. Compute from the date parts WITHOUT timezone drift: build with
  `new Date(y, m-1, d)` and read `getDay()`; or use Zeller. Test known dates
  (e.g. 2026-07-20 is a Monday → 1).
- `windowsForWeekday(rules, weekday): Array<{ start_time: string; end_time: string }>` —
  rules whose `day_of_week === weekday`, times normalized to `"HH:MM"` (slice 5).
- `isWithinAvailability(rules, dateISO, startHHMM, endHHMM): boolean` — true iff
  `endHHMM > startHHMM` AND there exists a window for that date's weekday with
  `startHHMM >= window.start && endHHMM <= window.end` (string compare on "HH:MM" works).
- `hasAnyAvailability(rules): boolean`.

Tests: dayOfWeekOf for several dates incl. year boundaries; windowsForWeekday filter +
normalization; isWithinAvailability inside/outside/edge windows and end<=start rejcontaining.

**Model:** standard.

---

## Task 2: French i18n for booking, checkout, dashboard

**Files:** Modify `messages/fr.json` (keep existing keys, valid JSON).

Add top-level sections:
```
"booking": {
  "widgetTitle": "Réserver un créneau",
  "date": "Date", "start": "Heure de début", "end": "Heure de fin",
  "total": "Total", "estimated": "Estimation",
  "notAvailable": "Ce créneau n'est pas dans les disponibilités de la borne.",
  "chooseSlot": "Choisissez un créneau valide.",
  "loginToBook": "Connectez-vous pour réserver", "ownCharger": "Vous ne pouvez pas réserver votre propre borne.",
  "reserve": "Réserver", "noAvailability": "Cette borne n'a pas encore de disponibilités.",
  "checkoutTitle": "Paiement (simulation)",
  "cardName": "Nom sur la carte", "cardNumber": "Numéro de carte", "expiry": "Expiration", "cvc": "CVC",
  "payNow": "Payer {amount}", "mockNotice": "Paiement fictif — aucune carte n'est débitée.",
  "processing": "Traitement…", "cancel": "Annuler",
  "createdTitle": "Demande de réservation envoyée",
  "status": { "pending": "En attente", "confirmed": "Confirmée", "completed": "Terminée", "cancelled": "Annulée" }
},
"bookingPage": {
  "title": "Réservation", "charger": "Borne", "driver": "Conducteur", "host": "Hôte",
  "when": "Créneau", "total": "Total", "statusLabel": "Statut",
  "accept": "Accepter", "decline": "Refuser", "complete": "Marquer terminée", "cancel": "Annuler la réservation",
  "accepted": "Réservation confirmée.", "declined": "Réservation refusée.",
  "backToDashboard": "Retour au tableau de bord", "leaveReview": "Laisser un avis"
},
"dashboard": {
  "title": "Tableau de bord",
  "hostSection": "Mes bornes", "incoming": "Demandes de réservation", "earnings": "Revenus (simulés)",
  "driverSection": "Mes réservations", "upcoming": "À venir", "past": "Passées",
  "noListings": "Vous n'avez pas encore de borne.", "addListing": "Proposer une borne",
  "noIncoming": "Aucune demande pour le moment.", "noBookings": "Vous n'avez pas encore de réservation.",
  "edit": "Modifier", "deactivate": "Désactiver", "activate": "Réactiver", "view": "Voir",
  "active": "Active", "inactive": "Inactive"
}
```
Fill natural French. Validate JSON.

**Model:** cheap/fast.

---

## Task 3: Booking queries + server actions

**Files:** `src/lib/bookings/queries.ts`, `src/app/actions/bookings.ts` (`"use server"`).

**queries.ts** (server, named columns; profiles columns explicit — never `select('*')`):
- `BookingWithRefs` type = Booking + `charger: Pick<Charger,"id"|"title"|"city"|"connector_type"|"power_kw"|"price_amount"|"price_unit"|"host_id"|"photos">` + `driver: Pick<Profile,"id"|"full_name"|"avatar_url">` + `host: Pick<Profile,"id"|"full_name"|"avatar_url">`.
- `getBookingDetail(id): Promise<BookingWithRefs | null>` — booking by id (RLS restricts to participants), with joined charger + driver profile + host profile (host via charger.host_id). Use nested selects naming columns, or separate queries + stitch.
- `listDriverBookings(userId): Promise<BookingWithRefs[]>` — bookings where `driver_id=userId`, newest first.
- `listHostBookings(userId): Promise<BookingWithRefs[]>` — bookings on chargers owned by `userId` (join chargers on host_id). newest first.
- `listHostChargers(userId): Promise<Charger[]>` — chargers where `host_id=userId` (all, incl inactive), newest first (explicit Charger columns).

**bookings.ts** server actions, each returns `{ error?: string; bookingId?: string }` (error = i18n key):
- `createBooking(formData)`:
  1. require user (else `{error:"booking.loginToBook"}`).
  2. parse: chargerId, startISO, endISO (full ISO timestamps from the widget).
  3. Load the charger (user client) selecting host_id, price_unit, price_amount, power_kw,
     is_active; if missing/inactive → `{error:"booking.chooseSlot"}`.
  4. If `charger.host_id === user.id` → `{error:"booking.ownCharger"}`.
  5. Recompute total server-side via `calculateBookingTotal` (do NOT trust a client total).
     Guard: if start/end invalid or end<=start → `{error:"booking.chooseSlot"}`.
     (Availability re-check is nice-to-have; at minimum validate positive duration.)
  6. Insert booking (user client) `{ charger_id, driver_id:user.id, start_time:startISO, end_time:endISO, status:'pending', total_price }` select id. Return `{bookingId}`.
- `acceptBooking(id)` / `declineBooking(id)`: require user; update the booking status to
  `confirmed`/`cancelled` **only if** the caller is the charger's host — enforce by
  scoping the update so RLS + a host check apply. Simplest robust approach: fetch the
  booking's charger host_id (participant read), verify `=== user.id`, else `{error:"bookingPage.notAllowed"}` (add key or reuse host.notOwner); then update `.eq("id",id)`. Only allow from `pending`.
- `completeBooking(id)`: host only; `confirmed` → `completed`.
- `cancelBooking(id)`: driver only; `pending`→`cancelled` (driver withdraws).
- `setChargerActive(chargerId, active: boolean)`: owner only (RLS update); flips `is_active`.
Use `revalidatePath` on `/dashboard` and the booking page where helpful.

**Model:** standard (largest task).

---

## Task 4: Booking widget on charger detail (replace BookingCta)

**Files:** `src/components/booking/BookingWidget.tsx` (client), modify
`src/app/[locale]/chargers/[id]/page.tsx`.

Detail page: fetch the auth user; compute `viewerState`:
- guest → widget shows a "login to book" CTA linking to `/auth`.
- viewer is the host of this charger → show `booking.ownCharger` (no form).
- otherwise (a potential driver) → show the booking form.
Pass to `<BookingWidget charger={{id,title,price_amount,price_unit,power_kw}} availability={charger.availability} viewer={"guest"|"host"|"driver"} />`. Replace `<BookingCta />`.

`BookingWidget` (`"use client"`):
- If `viewer==="guest"`: a `Link` to `/auth` labeled `booking.loginToBook`.
- If `viewer==="host"`: a muted note `booking.ownCharger`.
- If no availability rules: note `booking.noAvailability`.
- Else the form: `<input type="date">` (min = today), start `<input type="time">`,
  end `<input type="time">`. On change, validate via `isWithinAvailability` (import from
  `@/lib/bookings/availability`) and show `booking.notAvailable` if invalid. When valid,
  compute + show the total using `calculateBookingTotal` (build Date from
  `new Date(`${date}T${start}`)` etc.). "Réserver" button (disabled until valid) opens a
  **mock checkout modal**: shows charger title, slot, total, fake card inputs
  (name/number/expiry/cvc — not validated/stored), a `booking.mockNotice`, and a
  `booking.payNow` button. On pay: build FormData (chargerId, startISO=full ISO, endISO),
  call `createBooking` in `useTransition`; on `{bookingId}` → `router.push("/bookings/"+bookingId)`;
  on `{error}` show the translated error. Include a Cancel to close the modal.
- Keep the widget a clean card matching the current sidebar styling.

Use `today` from `new Date()` inside the client component (fine at runtime). Get the
locale-aware router from `@/i18n/navigation`.

**Model:** standard.

---

## Task 5: /bookings/[id] page

**Files:** `src/app/[locale]/bookings/[id]/page.tsx`, plus a client
`src/components/booking/BookingActions.tsx` for the status-changing buttons.

Page (async server): await params; require auth (redirect `/auth` if guest); call
`getBookingDetail(id)`; if null → `notFound()` (RLS already blocks non-participants, so
null covers "not allowed"). Determine `role`: `booking.driver.id===user.id ? "driver"
: "host"`. Render: charger (link to its detail), when (start–end formatted via
`Intl.DateTimeFormat("fr-FR", {dateStyle:"long", timeStyle:"short"})`), total
(`formatPrice`-style TND or a plain TND format of total_price), a colored status badge
(`booking.status.*`), the other party's name, and `<BookingActions>` with the actions
allowed for this role+status:
- host + pending → Accept / Decline.
- host + confirmed → Mark completed.
- driver + pending → Cancel.
- completed → (Phase 5 will add "leave review"; for now show nothing or a placeholder).
`BookingActions` (`"use client"`) calls the server actions in a `useTransition` and
`router.refresh()` on success. Labels from `bookingPage.*`.

**Model:** standard.

---

## Task 6: /dashboard (role-aware)

**Files:** `src/app/[locale]/dashboard/page.tsx` + small presentational components
(`src/components/dashboard/ListingRow.tsx`, `BookingRow.tsx`).

Async server page: require auth. Fetch `listHostChargers(user.id)`,
`listHostBookings(user.id)`, `listDriverBookings(user.id)`.
- **Host section** (show if the user has any chargers OR any incoming bookings):
  heading `dashboard.hostSection`; list each charger (title, city, active/inactive badge)
  with Edit (`/host/[id]/edit`), View (`/chargers/[id]`), and an Activate/Deactivate
  button (client, calls `setChargerActive`); an "add listing" link to `/host/new`.
  A `dashboard.incoming` subsection listing host bookings (esp. pending) each linking to
  `/bookings/[id]` with driver name, slot, status, and inline Accept/Decline for pending.
  An `dashboard.earnings` figure = sum of `total_price` for `confirmed`+`completed` host
  bookings, shown as TND (mock).
- **Driver section** (always shown): heading `dashboard.driverSection`; `listDriverBookings`
  split into upcoming (end_time in future & not cancelled) and past; each row links to
  `/bookings/[id]` with charger title, slot, status badge.
- Empty states from `dashboard.no*` keys. Reuse a shared status-badge helper (you may
  put a small `statusBadgeClasses(status)` in the dashboard components or a tiny util).

Also update the auth page redirect if needed so post-login lands on `/dashboard`
(it already pushes there). Keep `/dashboard` linked from the header (already is).

**Model:** standard.

---

## Task 7: Browser verification + polish

Drive with agent-browser (dev :3000). Flow:
1. As `driver@example.com`/`Password123!`: open a charger detail (one owned by a host,
   not the driver), pick a valid slot (weekday within availability, e.g. a weekday
   08:00–20:00 window), confirm the total shows, complete mock checkout → lands on
   `/bookings/[id]` as `pending`. Screenshot.
2. Driver `/dashboard` shows the booking under "À venir". Screenshot.
3. Log out, log in as the charger's host (`host0@example.com` … whichever owns it — pick
   a charger owned by host0), open `/dashboard` → incoming request pending → Accept →
   status becomes `confirmed`. Screenshot.
4. Booking page reflects `confirmed`. Verify driver cannot accept (controls role-gated).
5. Guest visiting a charger sees "login to book"; a host viewing their own charger sees
   the own-charger note.
Fix issues. `npm test` + `npm run build` pass. Clean up any obvious QA test bookings if
they clutter the demo (optional). Screenshots → `.screenshots/`.

**Model:** standard.

---

## Done criteria for Phase 4
- Driver can book a valid slot via mock checkout; booking created `pending`.
- Host accepts/declines from dashboard or booking page; driver sees status update.
- `/dashboard` is role-aware (host listings + incoming + earnings; driver bookings).
- Server recomputes total & enforces role transitions; can't book own charger; guests
  are prompted to log in.
- `npm test` + `npm run build` pass; strings i18n'd; no `select('*')` on profiles.

**Next plan:** Plan 5 — Trust (reviews, ratings rollup, public profiles, verified badge).
</content>
