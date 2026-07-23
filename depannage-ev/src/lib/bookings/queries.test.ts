import { describe, it, expect, vi, beforeEach } from "vitest";

// We mock the whole server module so no real Supabase calls happen.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBookingDetail,
  listDriverBookings,
  listHostBookings,
  listHostChargers,
} from "./queries";

// ---------------------------------------------------------------------------
// Helpers for building a chainable Supabase mock
// ---------------------------------------------------------------------------

function makeSelectChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const noop = () => chain;
  chain.select = noop;
  chain.eq = noop;
  chain.in = noop;
  chain.order = noop;
  chain.limit = noop;
  chain.single = () => Promise.resolve(resolveWith);
  // make awaiting the chain work too
  (chain as Promise<unknown> & Record<string, unknown>).then = (fn: (v: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(fn);
  return chain;
}

function makeClient(
  responses: Array<{ data: unknown; error: unknown }>
) {
  let call = 0;
  const from = () => {
    const res = responses[call] ?? { data: null, error: { message: "unexpected call" } };
    call++;
    return makeSelectChain(res);
  };
  return { from };
}

// ---------------------------------------------------------------------------
// getBookingDetail
// ---------------------------------------------------------------------------

describe("getBookingDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when booking is not found (RLS/missing row)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { code: "PGRST116", message: "no rows" } }]) as never
    );
    const result = await getBookingDetail("missing-id");
    expect(result).toBeNull();
  });

  it("returns null when charger row is missing", async () => {
    const booking = {
      id: "b1", charger_id: "c1", driver_id: "d1",
      start_time: "2026-08-01T10:00:00Z", end_time: "2026-08-01T12:00:00Z",
      status: "pending", total_price: 20, created_at: "2026-07-01T00:00:00Z",
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([
        { data: booking, error: null },              // booking
        { data: null, error: { message: "no row" } }, // charger
      ]) as never
    );
    const result = await getBookingDetail("b1");
    expect(result).toBeNull();
  });

  it("returns a stitched BookingWithRefs on success", async () => {
    const booking = {
      id: "b1", charger_id: "c1", driver_id: "d1",
      start_time: "2026-08-01T10:00:00Z", end_time: "2026-08-01T12:00:00Z",
      status: "pending", total_price: 20, created_at: "2026-07-01T00:00:00Z",
    };
    const charger = {
      id: "c1", title: "Fast Charger", city: "Tunis",
      connector_type: "type2", power_kw: 22, price_amount: 10, price_unit: "hour",
      host_id: "h1", photos: [],
    };
    const driver = { id: "d1", full_name: "Alice Driver", avatar_url: null };
    const host   = { id: "h1", full_name: "Bob Host",   avatar_url: null };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([
        { data: booking, error: null },  // booking
        { data: charger, error: null },  // charger
        { data: driver,  error: null },  // driver profile
        { data: host,    error: null },  // host profile
      ]) as never
    );

    const result = await getBookingDetail("b1");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("b1");
    expect(result?.charger.title).toBe("Fast Charger");
    expect(result?.driver.full_name).toBe("Alice Driver");
    expect(result?.host.full_name).toBe("Bob Host");
  });
});

// ---------------------------------------------------------------------------
// listDriverBookings
// ---------------------------------------------------------------------------

describe("listDriverBookings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] on database error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "db down" } }]) as never
    );
    const result = await listDriverBookings("d1");
    expect(result).toEqual([]);
  });

  it("returns [] when no bookings exist for driver", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: [], error: null }]) as never
    );
    const result = await listDriverBookings("d1");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listHostBookings
// ---------------------------------------------------------------------------

describe("listHostBookings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] when host has no chargers (short-circuit)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: [], error: null }]) as never  // charger ids query
    );
    const result = await listHostBookings("h1");
    expect(result).toEqual([]);
  });

  it("returns [] on charger fetch error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "fail" } }]) as never
    );
    const result = await listHostBookings("h1");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listHostChargers
// ---------------------------------------------------------------------------

describe("listHostChargers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] on error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: null, error: { message: "fail" } }]) as never
    );
    const result = await listHostChargers("h1");
    expect(result).toEqual([]);
  });

  it("returns charger array on success", async () => {
    const chargers = [
      { id: "c1", host_id: "h1", title: "Charger One", city: "Tunis",
        connector_type: "type2", power_kw: 22, price_amount: 10, price_unit: "hour",
        photos: [], is_active: true, created_at: "2026-07-01T00:00:00Z",
        description: "", address: "", lat: 0, lng: 0 },
    ];
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeClient([{ data: chargers, error: null }]) as never
    );
    const result = await listHostChargers("h1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Charger One");
  });
});
