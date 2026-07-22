"use client";

import { useTranslations } from "next-intl";
import { Plug } from "lucide-react";
import type { ConnectorType } from "@/types/database";
import type { ChargerFilters } from "@/lib/chargers/filter";
import { CONNECTOR_LABELS } from "@/lib/chargers/format";

const CONNECTOR_TYPES: ConnectorType[] = [
  "type2",
  "type1",
  "ccs",
  "chademo",
  "schuko",
];

/**
 * Horizontally-scrollable connector chips for fast one-tap filtering.
 * Drives the same `connectorTypes` filter as the drawer checkboxes.
 */
export function QuickFilters({
  filters,
  onChange,
}: {
  filters: ChargerFilters;
  onChange: (f: ChargerFilters) => void;
}) {
  const t = useTranslations("explore.filters");

  function toggle(type: ConnectorType) {
    const current = filters.connectorTypes;
    const next = current.includes(type)
      ? current.filter((c) => c !== type)
      : [...current, type];
    onChange({ ...filters, connectorTypes: next });
  }

  const noneActive = filters.connectorTypes.length === 0;

  return (
    <div
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label={t("connector")}
    >
      <button
        type="button"
        onClick={() => onChange({ ...filters, connectorTypes: [] })}
        aria-pressed={noneActive}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
          noneActive
            ? "border-ink bg-ink text-white"
            : "border-brand-200 bg-white text-ink-soft hover:bg-brand-50"
        }`}
      >
        <Plug className="h-3.5 w-3.5" />
        {t("anyConnector")}
      </button>

      {CONNECTOR_TYPES.map((type) => {
        const active = filters.connectorTypes.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            aria-pressed={active}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 bg-white text-ink-soft hover:bg-brand-50"
            }`}
          >
            {CONNECTOR_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
