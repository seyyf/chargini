// Pure review validation + rating rollup — no React, no Supabase.

export function validateReview(input: {
  rating: number;
  comment: string;
}): { rating?: string; comment?: string } {
  const errors: { rating?: string; comment?: string } = {};

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = "review.errors.ratingRequired";
  }

  if (input.comment.trim().length > 1000) {
    errors.comment = "review.errors.commentTooLong";
  }

  return errors;
}

export function computeRatingRollup(ratings: number[]): {
  avg: number;
  count: number;
} {
  const count = ratings.length;
  if (count === 0) return { avg: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const avg = Math.round((sum / count) * 100) / 100;
  return { avg, count };
}
