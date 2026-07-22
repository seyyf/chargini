import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicProfile, getReviewsAbout } from "./queries";

// ---- Chain builder ----------------------------------------------------------
//
// Returns an object shaped like a Supabase client. Each call to `.from()`
// consumes the next response from `responses`. The query chain returned by
// `.from()` is awaitable (has `.then`) so that `await supabase.from(...).select()...`
// works. The client object itself does NOT have `.then` so that
// `mockResolvedValue` does not unwrap it.

function makeClient(responses: Array<{ data: unknown; error: unknown }>) {
  let call = 0;

  const from = (_table: string) => {
    const res = responses[call] ?? { data: null, error: { message: "unexpected" } };
    call++;

    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select      = self;
    chain.eq          = self;
    chain.in          = self;
    chain.order       = self;
    chain.limit       = self;
    chain.maybeSingle = () => Promise.resolve(res);
    // Make the chain awaitable (for `await supabase.from(...).select(...)`)
    chain.then = (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(res).then(onFulfilled, onRejected);

    return chain;
  };

  // The client itself must NOT have `.then` — otherwise mockResolvedValue
  // will treat it as a thenable and unwrap it instead of returning the client.
  return { from };
}

// ---- getPublicProfile -------------------------------------------------------

describe("getPublicProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the profile row when found", async () => {
    const row = {
      id: "u1", full_name: "Alice", avatar_url: null,
      is_verified: true, rating_avg: 4.5, rating_count: 2,
      created_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: row, error: null }]) as never,
    );
    const result = await getPublicProfile("u1");
    expect(result).toEqual(row);
  });

  it("returns null when profile not found", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: null }]) as never,
    );
    const result = await getPublicProfile("u1");
    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "denied" } }]) as never,
    );
    const result = await getPublicProfile("u1");
    expect(result).toBeNull();
  });
});

// ---- getReviewsAbout --------------------------------------------------------

describe("getReviewsAbout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reviews with embedded reviewer on FK-embed success", async () => {
    const row = {
      id: "r1", booking_id: "b1", reviewer_id: "u2", reviewee_id: "u1",
      rating: 5, comment: "Excellent", created_at: "2026-01-02T00:00:00Z",
      reviewer: { id: "u2", full_name: "Bob", avatar_url: null },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: [row], error: null }]) as never,
    );
    const result = await getReviewsAbout("u1");
    expect(result).toHaveLength(1);
    expect(result[0].reviewer.full_name).toBe("Bob");
  });

  it("returns [] on database error (FK embed and stitch both fail)", async () => {
    // FK embed fails → stitch attempted → reviewRows empty/error → return []
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([
        { data: null, error: { message: "fail" } }, // FK embed fails
        { data: null, error: { message: "fail2" } }, // stitch review fetch also fails
      ]) as never,
    );
    const result = await getReviewsAbout("u1");
    expect(result).toEqual([]);
  });

  it("returns [] when no reviews exist", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: [], error: null }]) as never,
    );
    const result = await getReviewsAbout("u1");
    expect(result).toEqual([]);
  });
});
