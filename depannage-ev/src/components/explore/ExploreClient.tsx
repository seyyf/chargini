"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Charger } from "@/types/database";
import {
  ChargerFilters,
  EMPTY_FILTERS,
  filterChargers,
} from "@/lib/chargers/filter";
import { Filters } from "./Filters";
import { ChargerList } from "./ChargerList";

interface ExploreClientProps {
  chargers: Charger[];
}

export function ExploreClient({ chargers }: ExploreClientProps) {
  const t = useTranslations("explore");
  const [filters, setFilters] = useState<ChargerFilters>(EMPTY_FILTERS);

  const filtered = useMemo(
    () => filterChargers(chargers, filters),
    [chargers, filters],
  );

  return (
    <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
      {/* Filters sidebar */}
      <aside className="w-full shrink-0 md:w-72">
        <Filters
          chargers={chargers}
          filters={filters}
          onChange={setFilters}
        />
      </aside>

      {/* Results column */}
      <div className="min-w-0 flex-1">
        {/* Map mounts here in P2-T5 */}
        <div data-map-placeholder className="hidden" aria-hidden="true" />

        {/* Results count header */}
        <p className="mb-4 text-sm font-medium text-slate-600">
          {t("resultsCount", { count: filtered.length })}
        </p>

        <ChargerList chargers={filtered} />
      </div>
    </div>
  );
}
