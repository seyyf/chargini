import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Review } from "@/types/database";

const REVIEW_COLUMNS =
  "id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at";

/**
 * Returns the review written by `reviewerId` for booking `bookingId`,
 * or null if it does not exist or any error occurs.
 */
export async function getReviewByBookingAndReviewer(
  bookingId: string,
  reviewerId: string,
): Promise<Review | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("booking_id", bookingId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();

  if (error) {
    console.error("[getReviewByBookingAndReviewer] error:", error);
    return null;
  }

  return (data ?? null) as Review | null;
}
