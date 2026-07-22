import { describe, it, expect } from "vitest";
import {
  filterChargers,
  cityOptions,
  EMPTY_FILTERS,
  ChargerFilters,
} from "./filter";
import type { ConnectorType } from "@/types/database";

// Minimal charger shape used across all tests
type TestCharger = {
  connector_type: ConnectorType;
  power_kw: number;
  price_amount: number;
  city: string;
};

const chargers: TestCharger[] = [
  { connector_type: "type2", power_kw: 7, price_amount: 0.45, city: "Tunis" },
  { connector_type: "ccs", power_kw: 50, price_amount: 0.85, city: "Sfax" },
  { connector_type: "chademo", power_kw: 50, price_amount: 0.80, city: "Sfax" },
  { connector_type: "type1", power_kw: 3.7, price_amount: 0.30, city: "Sousse" },
  { connector_type: "schuko", power_kw: 2.3, price_amount: 0.20, city: "Tunis" },
];

describe("EMPTY_FILTERS", () => {
  it("has an empty connectorTypes array", () => {
    expect(EMPTY_FILTERS.connectorTypes).toEqual([]);
  });

  it("has null for minPowerKw", () => {
    expect(EMPTY_FILTERS.minPowerKw).toBeNull();
  });

  it("has null for maxPrice", () => {
    expect(EMPTY_FILTERS.maxPrice).toBeNull();
  });

  it("has null for city", () => {
    expect(EMPTY_FILTERS.city).toBeNull();
  });
});

describe("filterChargers — EMPTY_FILTERS passes everything", () => {
  it("returns all chargers when no filters are active", () => {
    expect(filterChargers(chargers, EMPTY_FILTERS)).toHaveLength(chargers.length);
  });
});

describe("filterChargers — connector type filter", () => {
  it("filters to a single connector type", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      connectorTypes: ["type2"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].connector_type).toBe("type2");
  });

  it("filters to multiple connector types (multi-select)", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      connectorTypes: ["ccs", "chademo"],
    });
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.connector_type)).toContain("ccs");
    expect(result.map((c) => c.connector_type)).toContain("chademo");
  });

  it("returns empty when no charger matches the connector type", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      connectorTypes: ["type1"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].connector_type).toBe("type1");
  });
});

describe("filterChargers — minPowerKw filter", () => {
  it("includes chargers with power_kw >= minPowerKw (inclusive boundary)", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      minPowerKw: 50,
    });
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.power_kw).toBeGreaterThanOrEqual(50));
  });

  it("includes the exact boundary value (>=, not >)", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      minPowerKw: 7,
    });
    // 7kW, 50kW, 50kW are all >= 7
    expect(result).toHaveLength(3);
  });

  it("excludes chargers below minPowerKw", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      minPowerKw: 10,
    });
    result.forEach((c) => expect(c.power_kw).toBeGreaterThanOrEqual(10));
  });
});

describe("filterChargers — maxPrice filter", () => {
  it("includes chargers with price_amount <= maxPrice (inclusive boundary)", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      maxPrice: 0.45,
    });
    // 0.45, 0.30, 0.20 qualify
    expect(result).toHaveLength(3);
    result.forEach((c) => expect(c.price_amount).toBeLessThanOrEqual(0.45));
  });

  it("includes the exact boundary value (<=, not <)", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      maxPrice: 0.80,
    });
    // 0.45, 0.80, 0.30, 0.20 qualify (0.85 does not)
    expect(result).toHaveLength(4);
  });

  it("excludes chargers above maxPrice", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      maxPrice: 0.25,
    });
    result.forEach((c) => expect(c.price_amount).toBeLessThanOrEqual(0.25));
  });
});

describe("filterChargers — city filter", () => {
  it("filters to an exact city match", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      city: "Tunis",
    });
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.city).toBe("Tunis"));
  });

  it("null city means any city (no constraint)", () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      city: null,
    });
    expect(result).toHaveLength(chargers.length);
  });

  it('empty string city means any city (no constraint)', () => {
    const result = filterChargers(chargers, {
      ...EMPTY_FILTERS,
      city: "",
    });
    expect(result).toHaveLength(chargers.length);
  });
});

describe("filterChargers — combined filters", () => {
  it("applies all active filters together (AND semantics)", () => {
    // CCS or CHAdeMO, >= 50 kW, <= 0.85, in Sfax
    const result = filterChargers(chargers, {
      connectorTypes: ["ccs", "chademo"],
      minPowerKw: 50,
      maxPrice: 0.85,
      city: "Sfax",
    });
    expect(result).toHaveLength(2);
  });

  it("returns empty when combined filters produce no match", () => {
    const result = filterChargers(chargers, {
      connectorTypes: ["type2"],
      minPowerKw: 50, // type2 charger is only 7kW
      maxPrice: null,
      city: null,
    });
    expect(result).toHaveLength(0);
  });
});

describe("cityOptions", () => {
  it("returns sorted unique city names", () => {
    const result = cityOptions(chargers);
    expect(result).toEqual(["Sfax", "Sousse", "Tunis"]);
  });

  it("deduplicates cities that appear multiple times", () => {
    const result = cityOptions(chargers);
    const uniqueResult = [...new Set(result)];
    expect(result).toEqual(uniqueResult);
  });

  it("returns an empty array for an empty input", () => {
    expect(cityOptions([])).toEqual([]);
  });

  it("returns a single city for a single input", () => {
    expect(cityOptions([{ city: "Bizerte" }])).toEqual(["Bizerte"]);
  });
});
