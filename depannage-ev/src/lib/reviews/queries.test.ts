import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReviewByBookingAndReviewer } from "./queries";

function makeMaybeSingle(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from        = self;
  chain.select      = self;
  chain.eq          = self;
  chain.maybeSingle = () => Promise.resolve(result);
  return chain;
}

describe("getReviewByBookingAndReviewer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the review row when found", async () => {
    const row = {
      id: "r1", booking_id: "b1", reviewer_id: "u1", reviewee_id: "u2",
      rating: 5, comment: "Great!", created_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeMaybeSingle({ data: row, error: null }) as never,
    );
    const result = await getReviewByBookingAndReviewer("b1", "u1");
    expect(result).toEqual(row);
  });

  it("returns null when no review found", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeMaybeSingle({ data: null, error: null }) as never,
    );
    const result = await getReviewByBookingAndReviewer("b1", "u1");
    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeMaybeSingle({ data: null, error: { message: "db error" } }) as never,
    );
    const result = await getReviewByBookingAndReviewer("b1", "u1");
    expect(result).toBeNull();
  });
});
