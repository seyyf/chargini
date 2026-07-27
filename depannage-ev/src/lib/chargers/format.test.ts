import { describe, it, expect } from "vitest";
import { CONNECTOR_LABELS, formatPrice, formatPower } from "./format";

describe("CONNECTOR_LABELS", () => {
  it("has a label for type2", () => {
    expect(CONNECTOR_LABELS.type2).toBe("Type 2");
  });

  it("has a label for type1", () => {
    expect(CONNECTOR_LABELS.type1).toBe("Type 1");
  });

  it("has a label for ccs", () => {
    expect(CONNECTOR_LABELS.ccs).toBe("CCS");
  });

  it("has a label for chademo", () => {
    expect(CONNECTOR_LABELS.chademo).toBe("CHAdeMO");
  });

  it("has a label for schuko", () => {
    expect(CONNECTOR_LABELS.schuko).toBe("Prise domestique");
  });
});

describe("formatPrice", () => {
  it("formats kwh price with French comma and 3 decimals", () => {
    expect(formatPrice(0.45, "kwh")).toBe("0,450 TND / kWh");
  });

  it("formats hour price with French comma and 3 decimals", () => {
    expect(formatPrice(5, "hour")).toBe("5,000 TND / h");
  });

  it("formats a non-round kwh price correctly", () => {
    expect(formatPrice(0.350, "kwh")).toBe("0,350 TND / kWh");
  });

  it("formats a larger hour price correctly", () => {
    expect(formatPrice(12.5, "hour")).toBe("12,500 TND / h");
  });

  it("uses exactly 3 fraction digits (no more, no less)", () => {
    // 1 TND/kWh — should show "1,000" not "1" or "1.000"
    expect(formatPrice(1, "kwh")).toBe("1,000 TND / kWh");
  });

  it("shows 'Gratuit' when the price is zero (free charger)", () => {
    expect(formatPrice(0, "kwh")).toBe("Gratuit");
    expect(formatPrice(0, "hour")).toBe("Gratuit");
  });
});

describe("formatPower", () => {
  it("formats an integer kW value", () => {
    expect(formatPower(7)).toBe("7 kW");
  });

  it("formats a fractional kW value with French comma", () => {
    expect(formatPower(3.7)).toBe("3,7 kW");
  });

  it("formats a larger power value", () => {
    expect(formatPower(22)).toBe("22 kW");
  });

  it("formats a fractional value with multiple decimals", () => {
    expect(formatPower(11.5)).toBe("11,5 kW");
  });
});
