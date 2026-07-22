"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateReview, computeRatingRollup } from "@/lib/reviews/review";

export async function createReview(
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  // 1. Auth guard
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "review.errors.notAllowed" };

  // 2. Parse inputs
  const bookingId = (formData.get("bookingId") as string | null) ?? "";
  const rating = parseInt((formData.get("rating") as string | null) ?? "", 10);
  const comment = (formData.get("comment") as string | null) ?? "";

  // 3. Validate
  const errors = validateReview({ rating, comment });
  if (errors.rating || errors.comment) {
    return { error: errors.rating ?? errors.comment };
  }

  // 4. Load booking (user client — RLS ensures only participants can read)
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("id, driver_id, charger_id, status")
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingData) return { error: "review.errors.notAllowed" };

  const booking = bookingData as {
    id: string;
    driver_id: string;
    charger_id: string;
    status: string;
  };

  if (booking.status !== "completed") return { error: "review.errors.notAllowed" };

  // 5. Load charger (user client)
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select("host_id")
    .eq("id", booking.charger_id)
    .single();

  if (chargerError || !chargerData) return { error: "review.errors.notAllowed" };

  const { host_id } = chargerData as { host_id: string };

  // 6. Determine reviewee — caller must be driver or host of this booking
  let reviewee: string;
  if (user.id === booking.driver_id) {
    reviewee = host_id;
  } else if (user.id === host_id) {
    reviewee = booking.driver_id;
  } else {
    return { error: "review.errors.notAllowed" };
  }

  // 7. Insert review (user client — RLS enforces: reviewer_id=auth.uid(), booking completed, participant)
  const { error: insertError } = await supabase
    .from("reviews")
    .insert({
      booking_id: bookingId,
      reviewer_id: user.id,
      reviewee_id: reviewee,
      rating,
      comment,
    });

  if (insertError) {
    console.error("[createReview] insert error:", insertError);
    if (insertError.code === "23505") return { error: "review.alreadyReviewed" };
    return { error: "review.errors.generic" };
  }

  // 8. Rollup with admin client — migration 0003 revoked UPDATE on profiles trust
  //    fields (rating_avg, rating_count) from authenticated; only service role may write them.
  const admin = createSupabaseAdminClient();

  const { data: ratingRows, error: ratingFetchError } = await admin
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", reviewee);

  if (ratingFetchError) {
    console.error("[createReview] rollup fetch error:", ratingFetchError);
    // Non-fatal: review is already saved — proceed to revalidate and return ok.
  } else {
    const { avg, count } = computeRatingRollup(
      (ratingRows ?? []).map((r: { rating: number }) => r.rating),
    );
    const { error: rollupError } = await admin
      .from("profiles")
      .update({ rating_avg: avg, rating_count: count })
      .eq("id", reviewee);

    if (rollupError) {
      console.error("[createReview] rollup update error:", rollupError);
      // Non-fatal: review is already saved.
    }
  }

  // 9. Revalidate caches and return success
  revalidatePath("/profile/" + reviewee);
  revalidatePath("/bookings/" + bookingId);

  return { ok: true };
}
