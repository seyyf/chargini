import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createReview } from "./reviews";

// ---------------------------------------------------------------------------
// Chain builder
// ---------------------------------------------------------------------------
//
// Each call to `.from()` consumes the next response from `responses`.
// The query chain returned by `.from()` is awaitable (`.then`) so that
// `await supabase.from(...).select()...` works.
// The client object itself must NOT have `.then` — otherwise mockResolvedValue
// treats it as a thenable and unwraps it.

function makeClient(
  userId: string | null,
  responses: Array<{ data: unknown; error: unknown }>,
) {
  let call = 0;

  const from = (_table: string) => {
    const res = responses[call] ?? { data: null, error: { message: "unexpected call" } };
    call++;

    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select      = self;
    chain.eq          = self;
    chain.in          = self;
    chain.order       = self;
    chain.limit       = self;
    chain.insert      = self;
    chain.update      = self;
    chain.single      = () => Promise.resolve(res);
    chain.maybeSingle = () => Promise.resolve(res);
    chain.then = (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(res).then(onFulfilled, onRejected);

    return chain;
  };

  const auth = {
    getUser: () =>
      Promise.resolve({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
  };

  // Client has NO `.then` property — critical for mockResolvedValue to work.
  return { from, auth };
}

function makeAdminClient(responses: Array<{ data: unknown; error: unknown }>) {
  let call = 0;

  const from = (_table: string) => {
    const res = responses[call] ?? { data: null, error: null };
    call++;

    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq     = self;
    chain.in     = self;
    chain.order  = self;
    chain.limit  = self;
    chain.update = self;
    chain.insert = self;
    chain.then = (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(res).then(onFulfilled, onRejected);

    return chain;
  };

  // Admin client also has NO `.then` at root level.
  return { from };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function fd(rating: string, bookingId: string, comment = "") {
  const f = new FormData();
  f.set("bookingId", bookingId);
  f.set("rating", rating);
  f.set("comment", comment);
  return f;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient(null, []) as never,
    );
    const result = await createReview(fd("5", "b1"));
    expect(result.error).toBe("review.errors.notAllowed");
  });

  it("returns rating error for invalid rating", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient("u1", []) as never,
    );
    const result = await createReview(fd("0", "b1"));
    expect(result.error).toBe("review.errors.ratingRequired");
  });

  it("returns notAllowed when booking not found", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient("u1", [
        { data: null, error: { message: "not found" } }, // booking fetch
      ]) as never,
    );
    const result = await createReview(fd("5", "b1"));
    expect(result.error).toBe("review.errors.notAllowed");
  });

  it("returns notAllowed when booking status is not completed", async () => {
    const booking = { id: "b1", driver_id: "u1", charger_id: "c1", status: "pending" };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient("u1", [
        { data: booking, error: null }, // booking fetch
      ]) as never,
    );
    const result = await createReview(fd("5", "b1"));
    expect(result.error).toBe("review.errors.notAllowed");
  });

  it("returns notAllowed when user is not a participant", async () => {
    const booking = { id: "b1", driver_id: "other", charger_id: "c1", status: "completed" };
    const charger = { host_id: "anotherhost" };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient("u1", [
        { data: booking, error: null }, // booking
        { data: charger, error: null }, // charger
      ]) as never,
    );
    const result = await createReview(fd("5", "b1"));
    expect(result.error).toBe("review.errors.notAllowed");
  });

  it("returns alreadyReviewed on unique constraint violation", async () => {
    const booking = { id: "b1", driver_id: "u1", charger_id: "c1", status: "completed" };
    const charger = { host_id: "host1" };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient("u1", [
        { data: booking, error: null },                               // booking
        { data: charger, error: null },                               // charger
        { data: null, error: { code: "23505", message: "unique" } }, // insert
      ]) as never,
    );
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeAdminClient([]) as never,
    );
    const result = await createReview(fd("5", "b1"));
    expect(result.error).toBe("review.alreadyReviewed");
  });

  it("returns ok:true on success (driver reviews host)", async () => {
    const booking = { id: "b1", driver_id: "u1", charger_id: "c1", status: "completed" };
    const charger = { host_id: "host1" };
    const ratingsRows = [{ rating: 5 }];
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient("u1", [
        { data: booking, error: null },  // booking fetch
        { data: charger, error: null },  // charger fetch
        { data: null,    error: null },  // insert (no data needed)
      ]) as never,
    );
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeAdminClient([
        { data: ratingsRows, error: null }, // admin fetch ratings
        { data: null,        error: null }, // admin update profile
      ]) as never,
    );
    const result = await createReview(fd("5", "b1", "Great!"));
    expect(result.ok).toBe(true);
  });
});
