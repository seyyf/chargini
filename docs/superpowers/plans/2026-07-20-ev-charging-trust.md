# EV Charging Marketplace — Plan 5: Trust Implementation Plan

**Goal:** Close the trust loop. On a **completed** booking, each participant can leave a
**rating (1–5) + comment** about the other. Reviews roll up into `profiles.rating_avg` /
`rating_count`, appear on the charger detail page (already wired) and on new public
profile pages `/profile/[id]` (name, avatar, verified badge, member since, rating,
reviews).

**Reference spec:** sections 4.3, 6, 7. Phase 4 (booking) is merged.

## Environment facts
- `reviews` table: id, booking_id, reviewer_id, reviewee_id, rating (1–5), comment,
  created_at. UNIQUE(booking_id, reviewer_id) — one review per booking per reviewer.
- RLS `reviews participant insert`: allowed iff `auth.uid() = reviewer_id` AND the booking
  is `completed` AND the reviewer is a participant (driver or the charger's host). So
  inserting a review through the USER client is correct and safe.
- **Rating rollup must use the ADMIN client:** migration 0003 REVOKED update on
  `profiles` trust fields from `authenticated` (only `full_name, avatar_url, bio, phone`
  are user-updatable). `rating_avg` / `rating_count` are server-only → update them via
  `createSupabaseAdminClient()` (`@/lib/supabase/admin`). Recompute from all reviews for
  the reviewee (no DB trigger available — no SQL runner).
- Reviews are world-readable (RLS `reviews readable` using(true)); profiles readable.
- Existing `ReviewList` (`src/components/charger/ReviewList.tsx`) and `HostCard`
  (`src/components/charger/HostCard.tsx`) already render reviews / rating + verified badge.
- `getChargerDetail` already returns reviews about the host. Booking page + BookingActions
  have a `{/* Phase 5: leaveReview */}` seam.
- Next 16: params Promises; server actions `"use server"`; nav via `@/i18n/navigation`.
  Profiles: select only granted columns (id, full_name, avatar_url, is_verified,
  rating_avg, rating_count, created_at) — never `select('*')`.

---

## Task 1: Review validation + rating rollup logic (TDD, pure)

**Files:** `src/lib/reviews/review.ts` (+ `.test.ts`).

Framework-free. Export:
- `validateReview(input: { rating: number; comment: string }): { rating?: string; comment?: string }` —
  returns i18n error keys. `rating` must be an integer 1–5 else `"review.errors.ratingRequired"`;
  `comment` trimmed length ≤ 1000 (empty comment allowed) else `"review.errors.commentTooLong"`.
- `computeRatingRollup(ratings: number[]): { avg: number; count: number }` — count = length;
  avg = rounded to 2 decimals (match `numeric(3,2)`), 0 when empty.

Tests: rating 0/6/1.5 invalid, 1 and 5 valid; comment 1000 ok, 1001 invalid; rollup of
[5,4,3] → {avg:4, count:3}, [5,4] → {avg:4.5, count:2}, [] → {avg:0, count:0}, rounding
e.g. [5,4,4] → 4.33.

**Model:** standard.

---

## Task 2: French i18n for reviews + profile

**Files:** Modify `messages/fr.json` (keep existing keys, valid JSON). Add:
```json
"review": {
  "leaveTitle": "Laisser un avis",
  "yourRating": "Votre note", "yourComment": "Votre commentaire",
  "submit": "Publier l'avis", "submitting": "Publication…",
  "alreadyReviewed": "Vous avez déjà laissé un avis pour cette réservation.",
  "onlyCompleted": "Vous pourrez laisser un avis une fois la réservation terminée.",
  "success": "Merci pour votre avis !",
  "errors": {
    "ratingRequired": "Choisissez une note entre 1 et 5.",
    "commentTooLong": "Le commentaire est trop long (1000 caractères max).",
    "notAllowed": "Vous ne pouvez pas laisser cet avis.",
    "generic": "Une erreur est survenue. Veuillez réessayer."
  }
},
"profile": {
  "title": "Profil", "memberSince": "Membre depuis {date}", "verified": "Vérifié",
  "reviews": "Avis reçus", "noReviews": "Aucun avis pour le moment.",
  "ratingSummary": "{avg} · {count} avis", "notFound": "Ce profil n'existe pas."
}
```
Validate JSON. **Model:** cheap/fast.

---

## Task 3: Review queries + createReview action (with admin rollup) + profile query

**Files:** `src/lib/reviews/queries.ts`, `src/app/actions/reviews.ts` (`"use server"`),
and extend `src/lib/profiles/queries.ts` (create it).

`src/lib/reviews/queries.ts`:
- `getReviewByBookingAndReviewer(bookingId, reviewerId): Promise<Review | null>` — used to
  tell whether the current user already reviewed a booking (user client; select explicit
  columns). Returns null if none.

`src/lib/profiles/queries.ts`:
- `PublicProfile` = Pick<Profile,"id"|"full_name"|"avatar_url"|"is_verified"|"rating_avg"|"rating_count"|"created_at">.
- `getPublicProfile(id): Promise<PublicProfile | null>` — one profile by id, granted columns only.
- `getReviewsAbout(userId): Promise<Array<Review & { reviewer: Pick<Profile,"id"|"full_name"|"avatar_url"> }>>` —
  reviews where reviewee_id=userId, newest first, limit 50, with reviewer profile embedded
  (reuse the FK-embed-or-stitch pattern from `src/lib/chargers/queries.ts`).

`src/app/actions/reviews.ts` — `createReview(formData)` returns `{ error?: string; ok?: boolean }`:
1. require user (else `{error:"review.errors.notAllowed"}`).
2. parse bookingId, rating (int), comment.
3. validate via `validateReview`; if errors return the first key.
4. Load the booking via USER client: select `id, driver_id, charger_id, status`. If missing → notAllowed. If `status !== 'completed'` → `{error:"review.errors.notAllowed"}`.
5. Determine reviewer/reviewee: load the charger's host_id (user client). If `user.id === booking.driver_id` → reviewee = host_id. Else if `user.id === host_id` → reviewee = driver_id. Else → `{error:"review.errors.notAllowed"}`.
6. Insert review via USER client `{ booking_id, reviewer_id:user.id, reviewee_id, rating, comment }`. If it violates the unique constraint (already reviewed) → `{error:"review.alreadyReviewed"}` (check `error.code === '23505'`). Other errors → generic. (RLS also enforces completed+participant as a backstop.)
7. **Rollup with ADMIN client:** fetch all `rating` values where `reviewee_id = reviewee`
   (admin client), `computeRatingRollup`, then `admin.from("profiles").update({ rating_avg: avg, rating_count: count }).eq("id", reviewee)`.
8. `revalidatePath` for the reviewee's profile and the booking page. Return `{ ok: true }`.

**Model:** standard (security-sensitive — reviewee derivation + admin rollup).

---

## Task 4: Review flow on the booking page

**Files:** `src/components/booking/ReviewForm.tsx` (client), modify
`src/app/[locale]/bookings/[id]/page.tsx`.

On the booking page, when `booking.status === 'completed'`:
- Determine `role` (already computed). The current user reviews the OTHER party.
- Server-side, check whether the user already reviewed: call
  `getReviewByBookingAndReviewer(booking.id, user.id)`.
- If already reviewed → show a muted `review.alreadyReviewed` note (and optionally the
  rating they gave).
- Else render `<ReviewForm bookingId={booking.id} />`.
`ReviewForm` (`"use client"`): a star selector (1–5, clickable ★), a `<textarea>` for the
comment (`review.yourComment`), a submit button (`review.submit`). On submit, build FormData
(bookingId, rating, comment) and call `createReview` in `useTransition`; on `{ok}` →
`router.refresh()` (so the "already reviewed" state shows) ; on `{error}` show translated
error. Labels from `review.*`. Validate client-side with `validateReview` before calling.

Also: for non-completed bookings, you may show `review.onlyCompleted` as a hint (optional).
Keep the existing status/action UI intact.

**Model:** standard.

---

## Task 5: Public profile page /profile/[id]

**Files:** `src/app/[locale]/profile/[id]/page.tsx` (async server component).
Optionally a small `src/components/profile/ProfileHeader.tsx`.

- Await params `{ locale, id }`. `getPublicProfile(id)` → if null → `notFound()`.
- `getReviewsAbout(id)`.
- Render `<section className="mx-auto max-w-2xl px-6 py-8">`:
  - Header: avatar (or initial), full name, verified pill (`profile.verified`) when
    `is_verified`, rating summary (`profile.ratingSummary` with `rating_avg.toFixed(1)` and
    `rating_count`) with a ★, member since (`profile.memberSince`, French month+year via
    `Intl.DateTimeFormat("fr-FR",{year:"numeric",month:"long"})`).
  - Reviews: heading `profile.reviews`; reuse the existing `ReviewList` component
    (`src/components/charger/ReviewList.tsx`) — confirm its props shape and pass the
    reviews (it expects `Array<Review & { reviewer: Pick<Profile,"id"|"full_name"|"avatar_url"> }>`,
    which matches `getReviewsAbout`). Empty → the component already handles `noReviews`.
- Make the existing `HostCard` link to `/profile/[id]` real (it already links there per a
  Phase 2 `// Phase 5` note — verify it points at `/profile/${host.id}`; no change needed
  if so).

**Model:** standard.

---

## Task 6: Browser verification + polish

Drive with agent-browser (dev :3000). Use the seed's completed bookings (driver@example.com
has 2 completed bookings with reviews already) OR create a fresh loop: as a host, mark a
confirmed booking completed, then as the driver open `/bookings/[id]` → leave a review
(pick stars + comment) → submit → see "already reviewed"; confirm the review appears on the
charger page and the host's `/profile/[hostId]`, and the host's rating updated. Also open a
seed host profile `/fr/profile/[id]` directly and screenshot. Verify a bad id → not-found.
Fix issues. `npm test` + `npm run build` pass. Screenshots → `.screenshots/`.

**Model:** standard.

---

## Done criteria for Phase 5
- Participants of a completed booking can leave one review each; duplicate blocked.
- Reviews roll up into `profiles.rating_avg`/`rating_count` (admin-client update).
- Reviews show on the charger page and on `/profile/[id]`; profiles show verified badge,
  rating, member since.
- `npm test` + `npm run build` pass; strings i18n'd; no `select('*')` on profiles.

**Next plan:** Plan 6 — Polish (landing page, responsive pass, seed content, E2E, deploy prep).
</content>
