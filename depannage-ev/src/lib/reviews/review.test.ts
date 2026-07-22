import { describe, it, expect } from "vitest";
import { validateReview, computeRatingRollup } from "./review";

// ---------------------------------------------------------------------------
// validateReview
// ---------------------------------------------------------------------------

describe("validateReview", () => {
  // --- rating validation ---

  it("rejects rating 0 (below minimum)", () => {
    const errors = validateReview({ rating: 0, comment: "" });
    expect(errors.rating).toBe("review.errors.ratingRequired");
  });

  it("rejects rating 6 (above maximum)", () => {
    const errors = validateReview({ rating: 6, comment: "" });
    expect(errors.rating).toBe("review.errors.ratingRequired");
  });

  it("rejects rating 1.5 (non-integer)", () => {
    const errors = validateReview({ rating: 1.5, comment: "" });
    expect(errors.rating).toBe("review.errors.ratingRequired");
  });

  it("accepts rating 1 (minimum valid integer)", () => {
    const errors = validateReview({ rating: 1, comment: "" });
    expect(errors.rating).toBeUndefined();
  });

  it("accepts rating 5 (maximum valid integer)", () => {
    const errors = validateReview({ rating: 5, comment: "" });
    expect(errors.rating).toBeUndefined();
  });

  // --- comment validation ---

  it("accepts a comment of exactly 1000 characters", () => {
    const comment = "a".repeat(1000);
    const errors = validateReview({ rating: 3, comment });
    expect(errors.comment).toBeUndefined();
  });

  it("rejects a comment of 1001 characters", () => {
    const comment = "a".repeat(1001);
    const errors = validateReview({ rating: 3, comment });
    expect(errors.comment).toBe("review.errors.commentTooLong");
  });

  it("accepts an empty comment", () => {
    const errors = validateReview({ rating: 3, comment: "" });
    expect(errors.comment).toBeUndefined();
  });

  // --- valid input ---

  it("returns {} for a fully valid input", () => {
    const errors = validateReview({ rating: 4, comment: "Great service!" });
    expect(errors).toEqual({});
  });

  // --- combined invalid ---

  it("sets both error keys when rating is invalid and comment is too long", () => {
    const comment = "x".repeat(1001);
    const errors = validateReview({ rating: 0, comment });
    expect(errors.rating).toBe("review.errors.ratingRequired");
    expect(errors.comment).toBe("review.errors.commentTooLong");
  });
});

// ---------------------------------------------------------------------------
// computeRatingRollup
// ---------------------------------------------------------------------------

describe("computeRatingRollup", () => {
  it("returns avg 4 and count 3 for [5, 4, 3]", () => {
    expect(computeRatingRollup([5, 4, 3])).toEqual({ avg: 4, count: 3 });
  });

  it("returns avg 4.5 and count 2 for [5, 4]", () => {
    expect(computeRatingRollup([5, 4])).toEqual({ avg: 4.5, count: 2 });
  });

  it("returns { avg: 0, count: 0 } for an empty array", () => {
    expect(computeRatingRollup([])).toEqual({ avg: 0, count: 0 });
  });

  it("rounds avg to 2 decimals: [5, 4, 4] → 4.33", () => {
    expect(computeRatingRollup([5, 4, 4])).toEqual({ avg: 4.33, count: 3 });
  });
});
