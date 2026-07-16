import { describe, it, expect } from "vitest";
import { calculateBookingTotal } from "./pricing";

describe("calculateBookingTotal", () => {
  it("charges per hour by booking duration", () => {
    const total = calculateBookingTotal({
      priceUnit: "hour",
      priceAmount: 5, // 5 TND / hour
      startTime: new Date("2026-07-16T10:00:00Z"),
      endTime: new Date("2026-07-16T12:30:00Z"), // 2.5 hours
    });
    expect(total).toBeCloseTo(12.5, 3);
  });

  it("charges per kWh by estimated energy (power x hours)", () => {
    const total = calculateBookingTotal({
      priceUnit: "kwh",
      priceAmount: 0.4, // 0.4 TND / kWh
      powerKw: 7, // 7 kW charger
      startTime: new Date("2026-07-16T10:00:00Z"),
      endTime: new Date("2026-07-16T12:00:00Z"), // 2 hours -> 14 kWh
    });
    expect(total).toBeCloseTo(5.6, 3);
  });

  it("throws if kwh pricing has no powerKw", () => {
    expect(() =>
      calculateBookingTotal({
        priceUnit: "kwh",
        priceAmount: 0.4,
        startTime: new Date("2026-07-16T10:00:00Z"),
        endTime: new Date("2026-07-16T11:00:00Z"),
      }),
    ).toThrow();
  });
});
