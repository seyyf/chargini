export type PriceUnit = "kwh" | "hour";

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

/**
 * Booking total in TND.
 * - "hour": priceAmount * duration in hours.
 * - "kwh":  priceAmount * estimated energy = powerKw * duration in hours.
 */
export function calculateBookingTotal(input: BookingTotalInput): number {
  const hours = durationHours(input.startTime, input.endTime);
  if (input.priceUnit === "hour") {
    return input.priceAmount * hours;
  }
  if (input.powerKw == null) {
    throw new Error("kwh pricing requires powerKw");
  }
  return input.priceAmount * input.powerKw * hours;
}
