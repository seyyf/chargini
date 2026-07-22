"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateBookingTotal } from "@/lib/pricing";

// ── Types ──────────────────────────────────────────────────────────────────────

type ActionResult = { error?: string; bookingId?: string };
type SetActiveResult = { error?: string };

// ── assertBookingHost (private) ────────────────────────────────────────────────

/**
 * Returns true iff userId is the host of the charger referenced by the booking.
 * Uses the user Supabase client so RLS participant-read applies to the booking
 * row itself.
 */
async function assertBookingHost(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bookingId: string,
  userId: string,
): Promise<boolean> {
  // Fetch the charger_id from the booking (RLS: participant can read).
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("charger_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !bookingData) return false;

  const { charger_id } = bookingData as { charger_id: string };

  // Fetch the host_id from the charger.
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select("host_id")
    .eq("id", charger_id)
    .single();

  if (chargerError || !chargerData) return false;

  return (chargerData as { host_id: string }).host_id === userId;
}

// ── createBooking ──────────────────────────────────────────────────────────────

export async function createBooking(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "booking.loginToBook" };

  const chargerId = (formData.get("chargerId") as string | null) ?? "";
  const startISO = (formData.get("startISO") as string | null) ?? "";
  const endISO = (formData.get("endISO") as string | null) ?? "";

  // Fetch charger with fields needed for validation + pricing.
  const { data: chargerData, error: chargerError } = await supabase
    .from("chargers")
    .select("id, host_id, price_unit, price_amount, power_kw, is_active")
    .eq("id", chargerId)
    .single();

  if (chargerError || !chargerData) return { error: "booking.chooseSlot" };

  const charger = chargerData as {
    id: string;
    host_id: string;
    price_unit: string;
    price_amount: number;
    power_kw: number;
    is_active: boolean;
  };

  if (!charger.is_active) return { error: "booking.chooseSlot" };
  if (charger.host_id === user.id) return { error: "booking.ownCharger" };

  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { error: "booking.chooseSlot" };
  }

  let total: number;
  try {
    total = calculateBookingTotal({
      priceUnit: charger.price_unit as "hour" | "kwh",
      priceAmount: charger.price_amount,
      powerKw: charger.power_kw,
      startTime: start,
      endTime: end,
    });
  } catch {
    return { error: "booking.chooseSlot" };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      charger_id: chargerId,
      driver_id: user.id,
      start_time: startISO,
      end_time: endISO,
      status: "pending",
      total_price: total,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[createBooking] insert error:", insertError);
    return { error: "booking.chooseSlot" };
  }

  return { bookingId: (inserted as { id: string }).id };
}

// ── acceptBooking ──────────────────────────────────────────────────────────────

export async function acceptBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  const isHost = await assertBookingHost(supabase, id, user.id);
  if (!isHost) return { error: "bookingPage.notAllowed" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("[acceptBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── declineBooking ─────────────────────────────────────────────────────────────

export async function declineBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  const isHost = await assertBookingHost(supabase, id, user.id);
  if (!isHost) return { error: "bookingPage.notAllowed" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("[declineBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── completeBooking ────────────────────────────────────────────────────────────

export async function completeBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  const isHost = await assertBookingHost(supabase, id, user.id);
  if (!isHost) return { error: "bookingPage.notAllowed" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", id)
    .eq("status", "confirmed");

  if (error) {
    console.error("[completeBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── cancelBooking ──────────────────────────────────────────────────────────────

export async function cancelBooking(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "bookingPage.notAllowed" };

  // DRIVER only: verify caller is the driver of this booking.
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("driver_id")
    .eq("id", id)
    .single();

  if (bookingError || !bookingData) return { error: "bookingPage.notAllowed" };

  if ((bookingData as { driver_id: string }).driver_id !== user.id) {
    return { error: "bookingPage.notAllowed" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("[cancelBooking] update error:", error);
    return { error: "bookingPage.notAllowed" };
  }

  revalidatePath("/dashboard");
  return { bookingId: id };
}

// ── setChargerActive ───────────────────────────────────────────────────────────

export async function setChargerActive(
  chargerId: string,
  active: boolean,
): Promise<SetActiveResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "host.loginRequired" };

  const { error } = await supabase
    .from("chargers")
    .update({ is_active: active })
    .eq("id", chargerId);
  // RLS enforces host_id = auth.uid() so non-owners silently get 0 rows updated.

  if (error) {
    console.error("[setChargerActive] update error:", error);
    return { error: "host.errors.generic" };
  }

  revalidatePath("/dashboard");
  return {};
}
