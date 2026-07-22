import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache before importing actions
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createBooking,
  acceptBooking,
  declineBooking,
  cancelBooking,
} from "./bookings";

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------

function makeChain(responses: Array<{ data: unknown; error: unknown }>) {
  let call = 0;
  const from = () => {
    const res = responses[call] ?? { data: null, error: { message: "unexpected" } };
    call++;
    // Minimal chain — each method returns itself except terminal ones
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.in = self;
    chain.update = self;
    chain.insert = self;
    chain.single = () => Promise.resolve(res);
    // make chain awaitable
    (chain as Promise<unknown> & Record<string, unknown>).then = (fn: (v: unknown) => unknown) =>
      Promise.resolve(res).then(fn);
    return chain;
  };
  const auth = {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  };
  return { from, auth };
}

function makeClientWithUser(userId: string, responses: Array<{ data: unknown; error: unknown }>) {
  const base = makeChain(responses);
  base.auth = {
    getUser: () => Promise.resolve({ data: { user: { id: userId } }, error: null }),
  };
  return base;
}

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

describe("createBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns booking.loginToBook when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T10:00:00.000Z");
    fd.set("endISO", "2026-08-01T12:00:00.000Z");
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.loginToBook");
  });

  it("returns booking.ownCharger when driver is the charger host", async () => {
    const charger = {
      id: "c1", host_id: "user1", price_unit: "hour", price_amount: 10,
      power_kw: 22, is_active: true,
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClientWithUser("user1", [
        { data: charger, error: null }, // charger fetch
      ]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T10:00:00.000Z");
    fd.set("endISO", "2026-08-01T12:00:00.000Z");
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.ownCharger");
  });

  it("returns booking.chooseSlot when end <= start", async () => {
    const charger = {
      id: "c1", host_id: "host1", price_unit: "hour", price_amount: 10,
      power_kw: 22, is_active: true,
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClientWithUser("driver1", [
        { data: charger, error: null },
      ]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T12:00:00.000Z");
    fd.set("endISO", "2026-08-01T10:00:00.000Z"); // end before start
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.chooseSlot");
  });

  it("returns booking.chooseSlot when charger not found", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClientWithUser("driver1", [
        { data: null, error: { message: "not found" } },
      ]) as never
    );
    const fd = new FormData();
    fd.set("chargerId", "c1");
    fd.set("startISO", "2026-08-01T10:00:00.000Z");
    fd.set("endISO", "2026-08-01T12:00:00.000Z");
    const result = await createBooking(fd);
    expect(result.error).toBe("booking.chooseSlot");
  });
});

// ---------------------------------------------------------------------------
// acceptBooking / declineBooking / cancelBooking — unauthenticated guard
// ---------------------------------------------------------------------------

describe("acceptBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bookingPage.notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const result = await acceptBooking("b1");
    expect(result.error).toBe("bookingPage.notAllowed");
  });
});

describe("declineBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bookingPage.notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const result = await declineBooking("b1");
    expect(result.error).toBe("bookingPage.notAllowed");
  });
});

describe("cancelBooking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns bookingPage.notAllowed when not authenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeChain([]) as never
    );
    const result = await cancelBooking("b1");
    expect(result.error).toBe("bookingPage.notAllowed");
  });
});
