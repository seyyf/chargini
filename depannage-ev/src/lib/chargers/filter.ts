import type { ConnectorType, Charger } from "@/types/database";

export interface ChargerFilters {
  /** Active connector type constraints. Empty array means no constraint. */
  connectorTypes: ConnectorType[];
  /** Minimum power in kW (inclusive). null means no constraint. */
  minPowerKw: number | null;
  /** Maximum price amount (inclusive). null means no constraint. */
  maxPrice: number | null;
  /** Exact city match. null or "" means no constraint. */
  city: string | null;
}

/** Neutral starting point — no filters active. */
export const EMPTY_FILTERS: ChargerFilters = {
  connectorTypes: [],
  minPowerKw: null,
  maxPrice: null,
  city: null,
};

/**
 * Filters an array of chargers against the provided filter set.
 *
 * A charger passes if it satisfies ALL active filters (AND semantics):
 * - `connectorTypes` non-empty → `connector_type` must be in the array.
 * - `minPowerKw` non-null → `power_kw >= minPowerKw`.
 * - `maxPrice` non-null → `price_amount <= maxPrice`.
 * - `city` non-null and non-empty → `city === filters.city` (exact match).
 */
export function filterChargers<
  T extends Pick<Charger, "connector_type" | "power_kw" | "price_amount" | "city">,
>(chargers: T[], filters: ChargerFilters): T[] {
  return chargers.filter((charger) => {
    if (
      filters.connectorTypes.length > 0 &&
      !filters.connectorTypes.includes(charger.connector_type)
    ) {
      return false;
    }
    if (filters.minPowerKw !== null && charger.power_kw < filters.minPowerKw) {
      return false;
    }
    if (filters.maxPrice !== null && charger.price_amount > filters.maxPrice) {
      return false;
    }
    if (filters.city !== null && filters.city !== "" && charger.city !== filters.city) {
      return false;
    }
    return true;
  });
}

/**
 * Returns a sorted list of unique city names from an array of chargers.
 *
 * @example
 * cityOptions([{ city: "Sfax" }, { city: "Tunis" }, { city: "Sfax" }])
 * // ["Sfax", "Tunis"]
 */
export function cityOptions(chargers: Pick<Charger, "city">[]): string[] {
  return [...new Set(chargers.map((c) => c.city))].sort();
}
