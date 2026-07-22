# Booking Queries + Server Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement booking data-access queries (`src/lib/bookings/queries.ts`) and server actions (`src/app/actions/bookings.ts`) for an EV charging marketplace with Supabase RLS.

**Architecture:** Two focused files — a query library that fetches/stitches booking rows + related profiles using explicit column lists (never `select('*')`), and a server actions file that enforces auth + business rules then mutates the database via the user Supabase client (so RLS applies). All reads/writes use `createSupabaseServerClient()` so row-level security is always active.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase JS v2, Vitest, `next/cache` revalidatePath.

---

## File Map

| Path | Create/Modify | Responsibility |
|------|--------------|----------------|
| `src/lib/bookings/queries.ts` | **Create** | `BookingWithRefs` type; `getBookingDetail`, `listDriverBookings`, `listHostBookings`, `listHostChargers` exported functions; private `hydrateBookings` helper |
| `src/app/actions/bookings.ts` | **Create** | `"use server"` actions: `createBooking`, `acceptBooking`, `declineBooking`, `completeBooking`, `cancelBooking`, `setChargerActive`; private `assertBookingHost` helper |

---

## Shared Constants & Types (needed across both files)

```
BOOKING_COLUMNS = "id, charger_id, driver_id, start_time, end_time, status, total_price, created_at"
CHARGER_REF_COLUMNS = "id, title, city, connector_type, power_kw, price_amount, price_unit, host_id, photos"
PROFILE_BRIEF_COLUMNS = "id, full_name, avatar_url"
```

---

### Task 1: Write `src/lib/bookings/queries.ts`

**Files:**
- Create: `src/lib/bookings/queries.ts`

- [ ] **Step 1: Write a failing test for `getBookingDetail`**

Create `src/lib/bookings/queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// We mock the whole server module so no real Supabase calls happen.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBookingDetail,
  listDriverBookings,
  listHostBookings,
  listHostChargers,
} from "./queries";

// ---------------------------------------------------------------------------
// Helpers for building a chainable Supabase mock
// ---------------------------------------------------------------------------

function makeSelectChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const noop = () => chain;
  chain.select = noop;
  chain.eq = noop;
  chain.in = noop;
  chain.order = noop;
  chain.single = () => Promise.resolve(resolveWith);
  // make awaiting the chain work too
  (chain as Promise<unknown> & Record<string, unknown>).then = (fn: (v: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(fn);
  return chain;
}

function makeClient(
  responses: Array<{ data: unknown; error: unknown }>
) {
  let call = 0;
  const from = () => {
    const res = responses[call] ?? { data: null, error: { message: "unexpected call" } };
    call++;
    return makeSelectChain(res);
  };
  return { from };
}

// ---------------------------------------------------------------------------
// getBookingDetail
// ---------------------------------------------------------------------------

describe("getBookingDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when booking is not found (RLS/missing row)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { code: "PGRST116", message: "no rows" } }]) as never
    );
    const result = await getBookingDetail("missing-id");
    expect(result).toBeNull();
  });

  it("returns null when charger row is missing", async () => {
    const booking = {
      id: "b1", charger_id: "c1", driver_id: "d1",
      start_time: "2026-08-01T10:00:00Z", end_time: "2026-08-01T12:00:00Z",
      status: "pending", total_price: 20, created_at: "2026-07-01T00:00:00Z",
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([
        { data: booking, error: null },              // booking
        { data: null, error: { message: "no row" } }, // charger
      ]) as never
    );
    const result = await getBookingDetail("b1");
    expect(result).toBeNull();
  });

  it("returns a stitched BookingWithRefs on success", async () => {
    const booking = {
      id: "b1", charger_id: "c1", driver_id: "d1",
      start_time: "2026-08-01T10:00:00Z", end_time: "2026-08-01T12:00:00Z",
      status: "pending", total_price: 20, created_at: "2026-07-01T00:00:00Z",
    };
    const charger = {
      id: "c1", title: "Fast Charger", city: "Tunis",
      connector_type: "type2", power_kw: 22, price_amount: 10, price_unit: "hour",
      host_id: "h1", photos: [],
    };
    const driver = { id: "d1", full_name: "Alice Driver", avatar_url: null };
    const host   = { id: "h1", full_name: "Bob Host",   avatar_url: null };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([
        { data: booking, error: null },  // booking
        { data: charger, error: null },  // charger
        { data: driver,  error: null },  // driver profile
        { data: host,    error: null },  // host profile
      ]) as never
    );

    const result = await getBookingDetail("b1");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("b1");
    expect(result?.charger.title).toBe("Fast Charger");
    expect(result?.driver.full_name).toBe("Alice Driver");
    expect(result?.host.full_name).toBe("Bob Host");
  });
});

// ---------------------------------------------------------------------------
// listDriverBookings
// ---------------------------------------------------------------------------

describe("listDriverBookings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] on database error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "db down" } }]) as never
    );
    const result = await listDriverBookings("d1");
    expect(result).toEqual([]);
  });

  it("returns [] when no bookings exist for driver", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: [], error: null }]) as never
    );
    const result = await listDriverBookings("d1");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listHostBookings
// ---------------------------------------------------------------------------

describe("listHostBookings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] when host has no chargers (short-circuit)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: [], error: null }]) as never  // charger ids query
    );
    const result = await listHostBookings("h1");
    expect(result).toEqual([]);
  });

  it("returns [] on charger fetch error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "fail" } }]) as never
    );
    const result = await listHostBookings("h1");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listHostChargers
// ---------------------------------------------------------------------------

describe("listHostChargers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] on error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "fail" } }]) as never
    );
    const result = await listHostChargers("h1");
    expect(result).toEqual([]);
  });

  it("returns charger array on success", async () => {
    const chargers = [
      { id: "c1", host_id: "h1", title: "Charger One", city: "Tunis",
        connector_type: "type2", power_kw: 22, price_amount: 10, price_unit: "hour",
        photos: [], is_active: true, created_at: "2026-07-01T00:00:00Z",
        description: "", address: "", lat: 0, lng: 0 },
    ];
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: chargers, error: null }]) as never
    );
    const result = await listHostChargers("h1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Charger One");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (file doesn't exist yet)**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && npx vitest run src/lib/bookings/queries.test.ts 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module './queries'"

- [ ] **Step 3: Implement `src/lib/bookings/queries.ts`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Booking, Charger, Profile } from "@/types/database";

// ── Column lists ───────────────────────────────────────────────────────────────
// Never select('*'). Profiles: only columns granted to anon/authenticated.

const BOOKING_COLUMNS =
  "id, charger_id, driver_id, start_time, end_time, status, total_price, created_at";

const CHARGER_REF_COLUMNS =
  "id, title, city, connector_type, power_kw, price_amount, price_unit, host_id, photos";

const PROFILE_BRIEF_COLUMNS = "id, full_name, avatar_url";

const CHARGER_ALL_COLUMNS =
  "id, host_id, title, description, address, lat, lng, city, connector_type, power_kw, price_amount, price_unit, photos, is_active, created_at";

// ── Public type ────────────────────────────────────────────────────────────────

export type BookingWithRefs = Booking & {
  charger: Pick<Charger, "id" | "title" | "city" | "connector_type" | "power_kw" | "price_amount" | "price_unit" | "host_id" | "photos">;
  driver: Pick<Profile, "id" | "full_name" | "avatar_url">;
  host: Pick<Profile, "id" | "full_name" | "avatar_url">;
};

// ── getBookingDetail ──────────────────────────────────────────────────────────

/**
 * Returns a fully-hydrated BookingWithRefs for the given booking id, or null if:
 * - RLS hides the row from the caller (they are not driver or host).
 * - Any related row is missing.
 * - Any database error occurs.
 */
export async function getBookingDetail(id: string): Promise<BookingWithRefs | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch the booking row (RLS: driver OR charger's host can read).
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("id", id)
    .single();

  if (bookingError || !bookingData) {
    if (bookingError && bookingError.code !== "PGRST116") {
      console.error("[getBookingDetail] booking fetch error:", bookingError);
    }
    return null;
  }

  const booking = bookingData as Booking;

  // 2. Fetch the charger (explicit cols including host_id for the next query).
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select(CHARGER_REF_COLUMNS)
    .eq("id", booking.charger_id)
    .single();

  if (chargerError || !chargerData) {
    console.error("[getBookingDetail] charger fetch error:", chargerError);
    return null;
  }

  const charger = chargerData as Pick<Charger, "id" | "title" | "city" | "connector_type" | "power_kw" | "price_amount" | "price_unit" | "host_id" | "photos">;

  // 3. Fetch driver profile.
  const { data: driverData, error: driverError } = await supabase
    .from("profiles")
    .select(PROFILE_BRIEF_COLUMNS)
    .eq("id", booking.driver_id)
    .single();

  if (driverError || !driverData) {
    console.error("[getBookingDetail] driver profile fetch error:", driverError);
    return null;
  }

  // 4. Fetch host profile.
  const { data: hostData, error: hostError } = await supabase
    .from("profiles")
    .select(PROFILE_BRIEF_COLUMNS)
    .eq("id", charger.host_id)
    .single();

  if (hostError || !hostData) {
    console.error("[getBookingDetail] host profile fetch error:", hostError);
    return null;
  }

  return {
    ...booking,
    charger,
    driver: driverData as Pick<Profile, "id" | "full_name" | "avatar_url">,
    host: hostData as Pick<Profile, "id" | "full_name" | "avatar_url">,
  };
}

// ── hydrateBookings (private) ─────────────────────────────────────────────────

/**
 * Given a raw booking array, batch-fetches chargers and profiles then stitches
 * them together into BookingWithRefs[]. Shared by listDriverBookings and
 * listHostBookings to avoid duplicating the hydration logic.
 *
 * Strategy:
 *  - Collect unique charger_ids → one `.in(...)` query.
 *  - From chargers, collect unique host_ids + the driver_ids (from bookings) →
 *    one `.in(...)` query for all profiles at once.
 *  - Stitch with Maps.
 */
async function hydrateBookings(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: Booking[],
): Promise<BookingWithRefs[]> {
  if (rows.length === 0) return [];

  // 1. Fetch chargers.
  const chargerIds = [...new Set(rows.map((b) => b.charger_id))];
  const { data: chargerRows, error: chargerError } = await supabase
    .from("chargers")
    .select(CHARGER_REF_COLUMNS)
    .in("id", chargerIds);

  if (chargerError || !chargerRows) {
    console.error("[hydrateBookings] charger fetch error:", chargerError);
    return [];
  }

  type ChargerRef = Pick<Charger, "id" | "title" | "city" | "connector_type" | "power_kw" | "price_amount" | "price_unit" | "host_id" | "photos">;
  const chargerMap = new Map<string, ChargerRef>(
    (chargerRows as ChargerRef[]).map((c) => [c.id, c]),
  );

  // 2. Collect all profile ids we need: driver_ids + host_ids.
  const driverIds = [...new Set(rows.map((b) => b.driver_id))];
  const hostIds = [...new Set((chargerRows as ChargerRef[]).map((c) => c.host_id))];
  const allProfileIds = [...new Set([...driverIds, ...hostIds])];

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_BRIEF_COLUMNS)
    .in("id", allProfileIds);

  if (profileError || !profileRows) {
    console.error("[hydrateBookings] profile fetch error:", profileError);
    return [];
  }

  type ProfileBrief = Pick<Profile, "id" | "full_name" | "avatar_url">;
  const profileMap = new Map<string, ProfileBrief>(
    (profileRows as ProfileBrief[]).map((p) => [p.id, p]),
  );

  // 3. Stitch — skip bookings whose charger/driver/host is missing (shouldn't
  //    happen in practice but keeps the type safe).
  const hydrated: BookingWithRefs[] = [];
  for (const booking of rows) {
    const charger = chargerMap.get(booking.charger_id);
    const driver = profileMap.get(booking.driver_id);
    const host = charger ? profileMap.get(charger.host_id) : undefined;

    if (!charger || !driver || !host) continue;

    hydrated.push({ ...booking, charger, driver, host });
  }

  return hydrated;
}

// ── listDriverBookings ────────────────────────────────────────────────────────

/**
 * Returns all bookings where driver_id = userId, newest first, hydrated.
 */
export async function listDriverBookings(userId: string): Promise<BookingWithRefs[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("driver_id", userId)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[listDriverBookings] fetch error:", error);
    return [];
  }

  return hydrateBookings(supabase, (data ?? []) as Booking[]);
}

// ── listHostBookings ──────────────────────────────────────────────────────────

/**
 * Returns all bookings on chargers owned by userId, newest first, hydrated.
 */
export async function listHostBookings(userId: string): Promise<BookingWithRefs[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Find the host's charger ids.
  const { data: chargerIdRows, error: chargerIdError } = await supabase
    .from("chargers")
    .select("id")
    .eq("host_id", userId);

  if (chargerIdError) {
    console.error("[listHostBookings] charger id fetch error:", chargerIdError);
    return [];
  }

  const chargerIds = (chargerIdRows ?? []).map((r) => (r as { id: string }).id);
  if (chargerIds.length === 0) return []; // host has no chargers

  // 2. Fetch bookings on those chargers.
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .in("charger_id", chargerIds)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[listHostBookings] bookings fetch error:", error);
    return [];
  }

  return hydrateBookings(supabase, (data ?? []) as Booking[]);
}

// ── listHostChargers ──────────────────────────────────────────────────────────

/**
 * Returns ALL chargers (active and inactive) owned by userId, newest first.
 */
export async function listHostChargers(userId: string): Promise<Charger[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("chargers")
    .select(CHARGER_ALL_COLUMNS)
    .eq("host_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listHostChargers] fetch error:", error);
    return [];
  }

  return (data ?? []) as Charger[];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && npx vitest run src/lib/bookings/queries.test.ts 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 5: Commit queries file**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && git add src/lib/bookings/queries.ts src/lib/bookings/queries.test.ts && git commit -m "feat(booking): booking queries with hydration stitch"
```

---

### Task 2: Write `src/app/actions/bookings.ts`

**Files:**
- Create: `src/app/actions/bookings.ts`

- [ ] **Step 1: Write a failing test for `createBooking` validation**

Create `src/app/actions/bookings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache before importing actions
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createBooking,
  acceptBooking,
  declineBooking,
  cancelBooking,
} from "./bookings";

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------

function makeChain(responses: Array<{ data: unknown; error: unknown }>) {
  let call = 0;
  const from = () => {
    const res = responses[call] ?? { data: null, error: { message: "unexpected" } };
    call++;
    // Minimal chain — each method returns itself except terminal ones
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.in = self;
    chain.update = self;
    chain.insert = self;
    chain.single = () => Promise.resolve(res);
    // make chain awaitable
    (chain as Promise<unknown> & Record<string, unknown>).then = (fn: (v: unknown) => unknown) =>
      Promise.resolve(res).then(fn);
    return chain;
  };
  const auth = {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  };
  return { from, auth };
}

function makeClientWithUser(userId: string, responses: Array<{ data: unknown; error: unknown }>) {
  const base = makeChain(responses);
  base.auth = {
    getUser: () => Promise.resolve({ data: { user: { id: userId } }, error: null }),
  };
  return base;
}

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

describe("createBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns booking.loginToBook when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T10:00:00.000Z");
    fd.set("endISO", "2026-08-01T12:00:00.000Z");
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.loginToBook");
  });

  it("returns booking.ownCharger when driver is the charger host", async () => {
    const charger = {
      id: "c1", host_id: "user1", price_unit: "hour", price_amount: 10,
      power_kw: 22, is_active: true,
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClientWithUser("user1", [
        { data: charger, error: null }, // charger fetch
      ]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T10:00:00.000Z");
    fd.set("endISO", "2026-08-01T12:00:00.000Z");
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.ownCharger");
  });

  it("returns booking.chooseSlot when end <= start", async () => {
    const charger = {
      id: "c1", host_id: "host1", price_unit: "hour", price_amount: 10,
      power_kw: 22, is_active: true,
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClientWithUser("driver1", [
        { data: charger, error: null },
      ]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T12:00:00.000Z");
    fd.set("endISO", "2026-08-01T10:00:00.000Z"); // end before start
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.chooseSlot");
  });

  it("returns booking.chooseSlot when charger not found", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClientWithUser("driver1", [
        { data: null, error: { message: "not found" } },
      ]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T10:00:00.000Z");
    fd.set("endISO", "2026-08-01T12:00:00.000Z");
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.chooseSlot");
  });
});

// ---------------------------------------------------------------------------
// acceptBooking / declineBooking / cancelBooking — unauthenticated guard
// ---------------------------------------------------------------------------

describe("acceptBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bookingPage.notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const result = await acceptBooking("b1");
    expect(result.error).toBe("bookingPage.notAllowed");
  });
});

describe("declineBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bookingPage.notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const result = await declineBooking("b1");
    expect(result.error).toBe("bookingPage.notAllowed");
  });
});

describe("cancelBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bookingPage.notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const result = await cancelBooking("b1");
    expect(result.error).toBe("bookingPage.notAllowed");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && npx vitest run src/app/actions/bookings.test.ts 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module './bookings'"

- [ ] **Step 3: Implement `src/app/actions/bookings.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateBookingTotal } from "@/lib/pricing";

// ── Types ──────────────────────────────────────────────────────────────────────

type ActionResult = { error?: string; bookingId?: string };
type SetActiveResult = { error?: string };

// ── assertBookingHost (private) ────────────────────────────────────────────────

/**
 * Returns true iff userId is the host of the charger referenced by the booking.
 * Uses the user Supabase client so RLS participant-read applies to the booking
 * row itself.
 */
async function assertBookingHost(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bookingId: string,
  userId: string,
): Promise<boolean> {
  // Fetch the charger_id from the booking (RLS: participant can read).
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("charger_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingData) return false;

  const { charger_id } = bookingData as { charger_id: string };

  // Fetch the host_id from the charger.
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select("host_id")
    .eq("id", charger_id)
    .single();

  if (chargerError || !chargerData) return false;

  return (chargerData as { host_id: string }).host_id === userId;
}

// ── createBooking ──────────────────────────────────────────────────────────────

export async function createBooking(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "booking.loginToBook" };

  const chargerId = (formData.get("chargerId") as string | null) ?? "";
  const startISO = (formData.get("startISO") as string | null) ?? "";
  const endISO = (formData.get("endISO") as string | null) ?? "";

  // Fetch charger with fields needed for validation + pricing.
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select("id, host_id, price_unit, price_amount, power_kw, is_active")
    .eq("id", chargerId)
    .single();

  if (chargerError || !chargerData) return { error: "booking.chooseSlot" };

  const charger = chargerData as {
    id: string;
    host_id: string;
    price_unit: string;
    price_amount: number;
    power_kw: number;
    is_active: boolean;
  };

  if (!charger.is_active) return { error: "booking.chooseSlot" };
  if (charger.host_id === user.id) return { error: "booking.ownCharger" };

  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { error: "booking.chooseSlot" };
  }

  let total: number;
  try {
    total = calculateBookingTotal({
      priceUnit: charger.price_unit as "hour" | "kwh",
      priceAmount: charger.price_amount,
      powerKw: charger.power_kw,
      startTime: start,
      endTime: end,
    });
  } catch {
    return { error: "booking.chooseSlot" };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      charger_id: chargerId,
      driver_id: user.id,
      start_time: startISO,
      end_time: endISO,
      status: "pending",
      total_price: total,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[createBooking] insert error:", insertError);
    return { error: "booking.chooseSlot" };
  }

  return { bookingId: (inserted as { id: string }).id };
}

// ── acceptBooking ──────────────────────────────────────────────────────────────

export async function acceptBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  const isHost = await assertBookingHost(supabase, id, user.id);
  if (!isHost) return { error: "bookingPage.notAllowed" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("[acceptBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── declineBooking ─────────────────────────────────────────────────────────────

export async function declineBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  const isHost = await assertBookingHost(supabase, id, user.id);
  if (!isHost) return { error: "bookingPage.notAllowed" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("[declineBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── completeBooking ────────────────────────────────────────────────────────────

export async function completeBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  const isHost = await assertBookingHost(supabase, id, user.id);
  if (!isHost) return { error: "bookingPage.notAllowed" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", id)
    .eq("status", "confirmed");

  if (error) {
    console.error("[completeBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── cancelBooking ──────────────────────────────────────────────────────────────

export async function cancelBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  // DRIVER only: verify caller is the driver of this booking.
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("driver_id")
    .eq("id", id)
    .single();

  if (bookingError || !bookingData) return { error: "bookingPage.notAllowed" };

  if ((bookingData as { driver_id: string }).driver_id !== user.id) {
    return { error: "bookingPage.notAllowed" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("[cancelBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── setChargerActive ───────────────────────────────────────────────────────────

export async function setChargerActive(
  chargerId: string,
  active: boolean,
): Promise<SetActiveResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "host.loginRequired" };

  const { error } = await supabase
    .from("chargers")
    .update({ is_active: active })
    .eq("id", chargerId);
  // RLS enforces host_id = auth.uid() so non-owners silently get 0 rows updated.

  if (error) {
    console.error("[setChargerActive] update error:", error);
    return { error: "host.errors.generic" };
  }

  revalidatePath("/dashboard");
  return {};
}
```

- [ ] **Step 4: Run actions tests to confirm they pass**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && npx vitest run src/app/actions/bookings.test.ts 2>&1 | tail -30
```

Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && npx vitest run 2>&1 | tail -20
```

Expected: All tests PASS (including existing `availability.test.ts`, `pricing.test.ts`, `safeRedirect.test.ts`).

- [ ] **Step 6: Run build to verify type-check**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && npm run build 2>&1 | tail -30
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit actions file**

```bash
cd C:\Users\Seyf.mejri\Desktop\DepannageEV\depannage-ev && git add src/lib/bookings/queries.ts src/app/actions/bookings.ts && git commit -m "feat(booking): booking queries + create/accept/decline/complete/cancel actions"
```

---

## Self-Review Checklist

- [x] `getBookingDetail` — separate queries for booking, charger, driver, host; returns null on any error.
- [x] `listDriverBookings` — filter by driver_id, order start_time desc, batch hydration.
- [x] `listHostBookings` — first gets charger ids, short-circuits on empty, batch hydration.
- [x] `listHostChargers` — all chargers (incl inactive) for host, newest first.
- [x] `hydrateBookings` — one charger `.in()` query + one profile `.in()` query, stitch with Maps.
- [x] No `select('*')` anywhere — all column lists are explicit named strings.
- [x] Profile columns: only `id, full_name, avatar_url` (no phone/bio).
- [x] `createBooking` — all 7 validation steps from spec (login, charger exists+active, not own charger, date validation, total calculation, insert).
- [x] `assertBookingHost` — reads booking charger_id then charger host_id; returns bool.
- [x] `acceptBooking` — host only, pending→confirmed, revalidatePath.
- [x] `declineBooking` — host only, pending→cancelled, revalidatePath.
- [x] `completeBooking` — host only, confirmed→completed, revalidatePath.
- [x] `cancelBooking` — driver only (checks driver_id), pending→cancelled, revalidatePath.
- [x] `setChargerActive` — RLS does the ownership check, revalidatePath.
- [x] All actions use USER client (not admin), `"use server"` directive present.
- [x] Error strings match spec i18n keys exactly.
- [x] Tests use Vitest, mock `createSupabaseServerClient`, no real DB calls.
