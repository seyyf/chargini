# EV Charging Marketplace — Plan 3: Hosting Implementation Plan

**Goal:** Let an authenticated host create a charger listing via a guided form
(`/host/new`): title, description, address, a Leaflet pin for lat/lng, city,
connector type, power, price (amount + unit), photo upload to Supabase Storage,
and weekly availability rules. Published listings appear on `/explore`. Also
`/host/[id]/edit` to edit an owned listing.

**Reference spec:** design doc sections 4.1, 7. Phase 2 (discovery) is merged.

## Environment facts (already set up)
- Supabase Storage bucket `charger-photos` exists and is **public** (public read
  via public URL). Uploads are done SERVER-SIDE with the service key (see below) —
  we did NOT add per-user storage RLS policies (no SQL-runner available), so the
  create/update server action authorizes the user then uploads with an admin client.
- RLS on `chargers`: `chargers owner insert` requires `auth.uid() = host_id`;
  `chargers owner update/delete` require `auth.uid() = host_id`. So the row INSERT/
  UPDATE must run through the USER's server client (cookie session), NOT the admin
  client — that way RLS enforces ownership. Only the photo file upload uses admin.
- `availability_rules` RLS: `availability owner write` (for all) requires the rule's
  charger to be owned by `auth.uid()`. Insert availability via the user client.
- Auth: `createSupabaseServerClient()` (`@/lib/supabase/server`) reads the cookie
  session; `supabase.auth.getUser()` returns the current user or null.
- Next.js 16: `params`/`searchParams` are Promises. Server Actions use `"use server"`.
  Internal nav via `Link`/`redirect` from `@/i18n/navigation`.
- Leaflet is installed (react-leaflet v5); map components must be client-only
  (`dynamic(..., { ssr:false })` from within a Client Component).
- All strings via next-intl (`messages/fr.json`).

## Data recap (`src/types/database.ts`)
`Charger` fields to collect: title, description, address, lat, lng, city,
connector_type (type2|type1|ccs|chademo|schuko), power_kw, price_amount,
price_unit (kwh|hour), photos (text[]). `host_id` = current user; `is_active` = true.
`AvailabilityRule`: day_of_week (0–6), start_time, end_time ("HH:MM"/"HH:MM:SS").

---

## Task 1: Admin Supabase client + listing validation (TDD for validation)

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/chargers/listingValidation.ts`
- Create: `src/lib/chargers/listingValidation.test.ts`

`admin.ts` — SERVER-ONLY service-role client (bypasses RLS; used ONLY for photo
uploads). Try `import "server-only";` at top (verify the package resolves —
`node -e "require.resolve('server-only')"`; if it does not resolve, omit the import
and add a comment `// SERVER-ONLY: never import into a Client Component`).
```ts
import { createClient } from "@supabase/supabase-js";
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

`listingValidation.ts` — pure validation of listing input, framework-free. Export:
```ts
export interface ListingInput {
  title: string; description: string; address: string;
  lat: number | null; lng: number | null; city: string;
  connectorType: string; powerKw: number | null;
  priceAmount: number | null; priceUnit: string;
  availability: Array<{ day_of_week: number; start_time: string; end_time: string }>;
}
export type ListingErrors = Partial<Record<keyof ListingInput, string>>;
export function validateListing(input: ListingInput): ListingErrors; // empty object = valid
```
Rules (return an i18n KEY string per invalid field, e.g. `"host.errors.titleRequired"`;
the component maps keys → messages): title non-empty (≤120 chars); address non-empty;
lat/lng non-null and within Tunisia-ish bounds (lat 30–38, lng 7–12) → else
`"host.errors.locationRequired"`; city non-empty; connectorType ∈ the 5 enum values;
powerKw non-null and > 0 (≤ 350); priceAmount non-null and > 0; priceUnit ∈ {kwh,hour};
availability: every rule has end_time > start_time (string compare on "HH:MM" works) →
else `"host.errors.availabilityInvalid"` (an empty availability array is allowed).
**Test** each rule (valid + each invalid case). Vitest.

**Model:** standard.

---

## Task 2: French i18n strings for hosting

**Files:** Modify `messages/fr.json` (keep existing keys, valid JSON).

Add a top-level `"host"` section covering the wizard. Include at least:
```
host: {
  newTitle: "Proposer votre borne",
  editTitle: "Modifier la borne",
  intro: "Renseignez les détails de votre borne pour la publier.",
  fields: { title, description, address, city, location, connector, power, price,
            priceUnit, perKwh, perHour, photos, availability },
  locationHint: "Cliquez sur la carte pour placer votre borne.",
  addPhotos: "Ajouter des photos",
  addAvailability: "Ajouter un créneau",
  day: "Jour", startTime: "Début", endTime: "Fin", remove: "Retirer",
  submitNew: "Publier la borne", submitEdit: "Enregistrer",
  submitting: "Publication…",
  successNew: "Votre borne est publiée !",
  loginRequired: "Connectez-vous pour proposer une borne.",
  notOwner: "Vous ne pouvez modifier que vos propres bornes.",
  errors: {
    titleRequired, addressRequired, locationRequired, cityRequired,
    connectorRequired, powerInvalid, priceInvalid, priceUnitRequired,
    availabilityInvalid, uploadFailed, generic
  }
}
```
Fill with natural French. Days reuse the existing `days.*` catalog; connector labels
reuse `connectors.*`. Validate JSON.

**Model:** cheap/fast.

---

## Task 3: Form building blocks + create/update server actions

**Files:**
- Create: `src/components/host/LocationPicker.tsx` (client, leaflet)
- Create: `src/components/host/PhotoUploader.tsx` (client)
- Create: `src/components/host/AvailabilityEditor.tsx` (client)
- Create: `src/components/host/ListingForm.tsx` (client — orchestrates the above)
- Create: `src/app/actions/chargers.ts` (server actions)

**Server actions** (`"use server"` in `src/app/actions/chargers.ts`):
- `createCharger(formData: FormData): Promise<{ error?: string; chargerId?: string }>`
  1. `const supabase = await createSupabaseServerClient(); const { data:{ user } } = await supabase.auth.getUser();` — if no user, return `{ error: "host.loginRequired" }`.
  2. Parse fields from FormData (title, description, address, lat, lng, city,
     connectorType, powerKw, priceAmount, priceUnit; availability as a JSON string
     field `availability`; photos as `formData.getAll("photos")` → File[]).
  3. Validate via `validateListing`; if errors, return `{ error: firstErrorKey }`.
  4. Insert the charger row via the USER client (RLS enforces host_id=auth.uid()):
     `.from("chargers").insert({ host_id: user.id, title, ..., photos: [], is_active: true }).select("id").single()`.
  5. If photos present: upload each File with the ADMIN client
     (`createSupabaseAdminClient()`) to `charger-photos` at path
     `${user.id}/${chargerId}/${index}-${safeName}`; collect public URLs
     (`admin.storage.from("charger-photos").getPublicUrl(path).data.publicUrl`).
     Then update the row's `photos` via the USER client. On upload error, return
     `{ error: "host.errors.uploadFailed" }` (the row already exists; acceptable).
  6. Insert availability rules (user client) mapping to `{ charger_id, day_of_week, start_time, end_time }`.
  7. Return `{ chargerId }`.
- `updateCharger(id: string, formData: FormData)`: same validation; verify ownership
  implicitly via RLS (update the row with `.eq("id", id)`; if 0 rows updated, return
  `{ error: "host.notOwner" }`). Replace availability (delete existing rules for the
  charger then insert new) and append/replace photos (for edit, keep it simple:
  newly-uploaded photos are appended; do not implement per-photo deletion UI unless
  trivial). Return `{ chargerId: id }`.

Keep the actions readable; factor a private `parseListingFormData(formData)` helper.

**LocationPicker** (`"use client"`): a Leaflet map (OSM tiles) centered on Tunisia;
clicking the map sets a single marker and calls `onChange({ lat, lng })`. Use
react-leaflet `useMapEvents({ click })`. Props: `{ value: {lat,lng}|null; onChange }`.
Must be loaded via `dynamic(..., { ssr:false })` inside ListingForm. Include
`import "leaflet/dist/leaflet.css"`. Reuse the emerald divIcon approach from
`src/components/explore/ChargerMap.tsx` (read it). OPTIONAL: after a pin drop, best-
effort reverse-geocode the city via `https://nominatim.openstreetmap.org/reverse?format=json&lat=..&lon=..`
and call an `onCity(city)` prop — wrap in try/catch, never block; skip if it fails.

**PhotoUploader** (`"use client"`): `<input type="file" accept="image/*" multiple>`;
show local previews (`URL.createObjectURL`); props `{ files: File[]; onChange(files) }`.
Allow removing a selected file before submit. Cap at 5 files.

**AvailabilityEditor** (`"use client"`): manage `Array<{day_of_week,start_time,end_time}>`.
Add-row button; each row = a day `<select>` (labels from `days.*`), start `<input type="time">`,
end `<input type="time">`, remove button. Props `{ value; onChange }`.

**ListingForm** (`"use client"`): props `{ mode: "new" | "edit"; chargerId?: string;
initial?: Partial<ListingInput & { photos: string[] }> }`. Holds all field state
(prefill from `initial` in edit mode), renders inputs + the three sub-components,
runs client-side `validateListing` on submit to show inline errors (map error KEYS
via `useTranslations`), builds FormData, calls `createCharger`/`updateCharger` inside
a `useTransition`, shows a submitting state, and on success `router.push("/chargers/"+chargerId)`
(use `useRouter` from `@/i18n/navigation`). Connector select uses the 5 enum values
with `connectors.*` labels; price unit select uses kwh/hour with `host.fields.perKwh/perHour`.

**Model:** standard (the biggest task — multi-component + server action + storage).

---

## Task 4: /host/new and /host/[id]/edit pages

**Files:**
- Create: `src/app/[locale]/host/new/page.tsx`
- Create: `src/app/[locale]/host/[id]/edit/page.tsx`

`/host/new` (async server component): await params; get user via
`createSupabaseServerClient().auth.getUser()`. If no user → `redirect({ href: "/auth", locale })`
(from `@/i18n/navigation`). Else render a titled section (`host.newTitle`, `host.intro`)
containing `<ListingForm mode="new" />`.

`/host/[id]/edit` (async server component): await params `{ id }`; require auth
(redirect to /auth if none). Fetch the charger via `getChargerDetail(id)` (or a lighter
owner-scoped query). If missing → `notFound()`. If `charger.host_id !== user.id` →
render an inline "not owner" message (`host.notOwner`) or `notFound()`. Else render
`<ListingForm mode="edit" chargerId={id} initial={{...charger fields, availability, photos}} />`.
Map the DB charger + availability into the `ListingForm` `initial` shape (connectorType =
connector_type, powerKw = power_kw, priceAmount = price_amount, priceUnit = price_unit,
lat/lng, city, title, description, address, availability rules, photos).

Both pages: keep the layout consistent with existing pages (`max-w-...`, padding).

**Model:** standard.

---

## Task 5: Browser verification + polish

Drive with agent-browser (dev server on :3000). Log in as `host0@example.com` /
`Password123!` (seed account), go to `/fr/host/new`, fill the form (drop a pin,
set connector/power/price, add an availability row, optionally a photo), publish,
and confirm redirect to the new charger's detail page and that it appears on
`/fr/explore`. Then open `/fr/host/[id]/edit` for that charger, change the title, save,
confirm the change. Screenshot key steps to `.screenshots/`. Verify unauthenticated
`/fr/host/new` redirects to `/fr/auth`. Fix issues. `npm test` + `npm run build` pass.

**Model:** standard.

---

## Done criteria for Phase 3
- Authenticated host can publish a listing (with pin location, photos, availability)
  that shows on `/explore` and its detail page.
- Owner can edit their listing at `/host/[id]/edit`; non-owners/guests cannot.
- Guests hitting `/host/new` are redirected to `/auth`.
- Photo uploads land in the `charger-photos` bucket and render via public URL.
- `npm test` + `npm run build` pass; strings i18n'd; no `select('*')` on profiles.

**Next plan:** Plan 4 — Booking (slot selection + mock checkout + dashboards).
</content>
