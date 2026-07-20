import type { PriceUnit } from "@/types/database";

// Single source of truth for the enum lives in @/types/database; re-exported
// here so pricing consumers can import it alongside the calculator.
export type { PriceUnit };

export interface BookingTotalInput {
  priceUnit: PriceUnit;
  priceAmount: number;
  startTime: Date;
  endTime: Date;
  powerKw?: number;
}

/** Hours between two dates (fractional). */
function durationHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/** Round to 3 decimals to match the numeric(10,3) `total_price` column. */
function roundToPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Booking total in TND.
 * - "hour": priceAmount * duration in hours.
 * - "kwh":  priceAmount * estimated energy = powerKw * duration in hours.
 *
 * Throws if the duration is not strictly positive, and rounds to 3 decimals so
 * the result matches what Postgres stores in `bookings.total_price`.
 */
export function calculateBookingTotal(input: BookingTotalInput): number {
  const hours = durationHours(input.startTime, input.endTime);
  if (!(hours > 0)) {
    throw new Error("Booking duration must be positive");
  }
  if (input.priceUnit === "hour") {
    return roundToPrice(input.priceAmount * hours);
  }
  if (input.powerKw == null) {
    throw new Error("kwh pricing requires powerKw");
  }
  return roundToPrice(input.priceAmount * input.powerKw * hours);
}
