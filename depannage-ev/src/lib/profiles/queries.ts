import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Review } from "@/types/database";

// Columns granted to anon / authenticated (phone, bio excluded by migration 0003).
const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, avatar_url, is_verified, rating_avg, rating_count, created_at";

export type PublicProfile = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "is_verified" | "rating_avg" | "rating_count" | "created_at"
>;

export type ReviewWithReviewer = Review & {
  reviewer: Pick<Profile, "id" | "full_name" | "avatar_url">;
};

/**
 * Returns public profile columns for `id`, or null if the user does not exist
 * or any database error occurs.
 */
export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getPublicProfile] error:", error);
    return null;
  }

  return (data ?? null) as PublicProfile | null;
}

/**
 * Returns up to 50 reviews about `userId`, newest first, each with the
 * reviewer's public profile embedded.
 *
 * Uses the FK-embed approach first (PostgREST `reviews_reviewer_id_fkey`),
 * falling back to a two-query stitch if the embed fails — matching the pattern
 * in `src/lib/chargers/queries.ts`.
 */
export async function getReviewsAbout(userId: string): Promise<ReviewWithReviewer[]> {
  const supabase = await createSupabaseServerClient();

  const EMBED_COLUMNS =
    "id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at, " +
    "reviewer:profiles!reviews_reviewer_id_fkey ( id, full_name, avatar_url )";

  const { data, error } = await supabase
    .from("reviews")
    .select(EMBED_COLUMNS)
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!error) {
    return (data ?? []) as unknown as ReviewWithReviewer[];
  }

  // FK embed failed — fall back to two-query stitch.
  console.warn("[getReviewsAbout] FK embed failed, falling back to stitch:", error.message);

  const { data: reviewRows, error: reviewError } = await supabase
    .from("reviews")
    .select("id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (reviewError || !reviewRows?.length) {
    if (reviewError) console.error("[getReviewsAbout] review fetch error:", reviewError);
    return [];
  }

  const reviewerIds = [...new Set(reviewRows.map((r) => r.reviewer_id as string))];

  const { data: reviewerProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", reviewerIds);

  if (profileError) {
    console.error("[getReviewsAbout] reviewer profile fetch error:", profileError);
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
