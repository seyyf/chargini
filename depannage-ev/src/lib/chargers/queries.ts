import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Charger, Profile, AvailabilityRule, Review } from "@/types/database";

// Explicit column list for `chargers` — never use select('*') (column-level grants on profiles).
const CHARGER_COLUMNS =
  "id, host_id, title, description, address, lat, lng, city, connector_type, power_kw, price_amount, price_unit, photos, is_active, created_at";

// Public profile columns granted to anon/authenticated (phone and bio are excluded by RLS hardening).
const HOST_PROFILE_COLUMNS =
  "id, full_name, avatar_url, is_verified, rating_avg, rating_count, created_at";

export type ChargerDetail = Charger & {
  host: Pick<Profile, "id" | "full_name" | "avatar_url" | "is_verified" | "rating_avg" | "rating_count" | "created_at">;
  availability: AvailabilityRule[];
  reviews: Array<Review & { reviewer: Pick<Profile, "id" | "full_name" | "avatar_url"> }>;
};

/** A charger plus its host's aggregate rating (reviews are about the host). */
export type ChargerListItem = Charger & {
  ratingAvg: number;
  ratingCount: number;
};

/**
 * Returns all active chargers (newest first) with each host's rating stitched
 * in, so listing cards can show stars. On any DB error logs it and returns an
 * empty array so callers can render gracefully.
 */
export async function getActiveChargers(): Promise<ChargerListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("chargers")
    .select(CHARGER_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    // Safety cap: the list renders in pages of 12 and the map plots these pins.
    // Beyond this scale, move filtering + pagination server-side (URL params).
    .limit(500);

  if (error) {
    console.error("[getActiveChargers] Supabase error:", error);
    return [];
  }

  const chargers = (data ?? []) as Charger[];
  if (chargers.length === 0) return [];

  // Fetch each host's rating in one query and stitch it in.
  const hostIds = [...new Set(chargers.map((c) => c.host_id))];
  const { data: hosts } = await supabase
    .from("profiles")
    .select("id, rating_avg, rating_count")
    .in("id", hostIds);

  const ratings = new Map(
    (hosts ?? []).map((h) => [
      h.id as string,
      { avg: Number(h.rating_avg) || 0, count: Number(h.rating_count) || 0 },
    ]),
  );

  return chargers.map((c) => {
    const r = ratings.get(c.host_id);
    return { ...c, ratingAvg: r?.avg ?? 0, ratingCount: r?.count ?? 0 };
  });
}

/**
 * Returns a fully-hydrated ChargerDetail for the given charger id, or null if:
 * - The charger does not exist (or RLS hides it from the caller).
 * - The host profile is missing.
 * - Any unexpected database error occurs.
 */
export async function getChargerDetail(id: string): Promise<ChargerDetail | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch the charger row.
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select(CHARGER_COLUMNS)
    .eq("id", id)
    .single();

  if (chargerError || !chargerData) {
    if (chargerError?.code !== "PGRST116") {
      // PGRST116 = "no rows returned" — expected for hidden/missing chargers.
      console.error("[getChargerDetail] charger fetch error:", chargerError);
    }
    return null;
  }

  const charger = chargerData as Charger;

  // 2. Fetch the host profile (only explicitly-granted columns).
  const { data: hostData, error: hostError } = await supabase
    .from("profiles")
    .select(HOST_PROFILE_COLUMNS)
    .eq("id", charger.host_id)
    .single();

  if (hostError || !hostData) {
    console.error("[getChargerDetail] host profile fetch error:", hostError);
    return null;
  }

  const host = hostData as Pick<
    Profile,
    "id" | "full_name" | "avatar_url" | "is_verified" | "rating_avg" | "rating_count" | "created_at"
  >;

  // 3. Fetch availability rules for this charger.
  const { data: availabilityData, error: availabilityError } = await supabase
    .from("availability_rules")
    .select("id, charger_id, day_of_week, start_time, end_time")
    .eq("charger_id", id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (availabilityError) {
    console.error("[getChargerDetail] availability fetch error:", availabilityError);
    // Non-fatal: return with empty availability rather than null.
  }

  const availability = (availabilityData ?? []) as AvailabilityRule[];

  // 4. Fetch reviews about the host (newest first, capped at 20).
  //    Try the FK-embed approach first; fall back to a stitch if it errors.
  const reviews = await fetchReviewsWithReviewers(supabase, charger.host_id);

  return {
    ...charger,
    host,
    availability,
    reviews,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ReviewWithReviewer = Review & {
  reviewer: Pick<Profile, "id" | "full_name" | "avatar_url">;
};

/**
 * Fetches reviews for `revieweeId` and embeds each reviewer's public profile.
 *
 * Primary strategy: PostgREST FK embed using the `reviews_reviewer_id_fkey`
 * constraint.  If that embed fails (e.g. the constraint name differs in the
 * live DB) we fall back to fetching reviewer profiles in a second query and
 * stitching them in manually.
 */
async function fetchReviewsWithReviewers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  revieweeId: string,
): Promise<ReviewWithReviewer[]> {
  const REVIEW_COLUMNS =
    "id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey ( id, full_name, avatar_url )";

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!error) {
    // FK embed succeeded — cast and return.
    return (data ?? []) as unknown as ReviewWithReviewer[];
  }

  // FK embed failed: fall back to two-query stitch.
  console.warn(
    "[fetchReviewsWithReviewers] FK embed failed, falling back to stitch:",
    error.message,
  );

  const { data: reviewRows, error: reviewError } = await supabase
    .from("reviews")
    .select("id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at")
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (reviewError || !reviewRows?.length) {
    if (reviewError) {
      console.error("[fetchReviewsWithReviewers] review fetch error:", reviewError);
    }
    return [];
  }

  const reviewerIds = [...new Set(reviewRows.map((r) => r.reviewer_id as string))];

  const { data: reviewerProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", reviewerIds);

  if (profileError) {
    console.error("[fetchReviewsWithReviewers] reviewer profile fetch error:", profileError);
    // Return reviews without reviewer profile data rather than nothing.
    return reviewRows.map((r) => ({
      ...(r as Review),
      reviewer: { id: r.reviewer_id as string, full_name: "", avatar_url: null },
    }));
  }

  const profileMap = new Map(
    (reviewerProfiles ?? []).map((p) => [
      p.id as string,
      p as Pick<Profile, "id" | "full_name" | "avatar_url">,
    ]),
  );

  return reviewRows.map((r) => ({
    ...(r as Review),
    reviewer: profileMap.get(r.reviewer_id as string) ?? {
      id: r.reviewer_id as string,
      full_name: "",
      avatar_url: null,
    },
  }));
}
