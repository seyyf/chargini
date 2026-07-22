import type { ConnectorType, PriceUnit } from "@/types/database";

/** Human-readable labels for each connector type (French UI). */
export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  type2: "Type 2",
  type1: "Type 1",
  ccs: "CCS",
  chademo: "CHAdeMO",
  schuko: "Prise domestique",
};

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const powerFormatter = new Intl.NumberFormat("fr-FR");

/**
 * Formats a price for display in TND.
 *
 * @example
 * formatPrice(0.45, "kwh") // "0,450 TND / kWh"
 * formatPrice(5, "hour")   // "5,000 TND / h"
 */
export function formatPrice(amount: number, unit: PriceUnit): string {
  const suffix = unit === "kwh" ? " TND / kWh" : " TND / h";
  return `${priceFormatter.format(amount)}${suffix}`;
}

/**
 * Formats a power value in kW with a French locale decimal separator.
 *
 * @example
 * formatPower(7)   // "7 kW"
 * formatPower(3.7) // "3,7 kW"
 */
export function formatPower(kw: number): string {
  return `${powerFormatter.format(kw)} kW`;
}
