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
    .order("start_time", { ascending: false })
    .limit(50);

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
    .order("start_time", { ascending: false })
    .limit(50);

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
    .limit(50)
    .eq("host_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listHostChargers] fetch error:", error);
    return [];
  }

  return (data ?? []) as Charger[];
}
