"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Charger } from "@/types/database";
import {
  ChargerFilters,
  EMPTY_FILTERS,
  filterChargers,
} from "@/lib/chargers/filter";
import { Filters } from "./Filters";
import { ChargerList } from "./ChargerList";
import type { ChargerMapProps } from "./ChargerMap";

// Load ChargerMap client-only: react-leaflet uses `window` at module load time.
const ChargerMap = dynamic<ChargerMapProps>(
  () => import("./ChargerMap").then((m) => m.ChargerMap),
  { ssr: false },
);

interface ExploreClientProps {
  chargers: Charger[];
}

export function ExploreClient({ chargers }: ExploreClientProps) {
  const t = useTranslations("explore");
  const [filters, setFilters] = useState<ChargerFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        {/* Interactive map — shows filtered chargers, synced with list */}
        <ChargerMap
          chargers={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Results count header */}
        <p className="mb-4 text-sm font-medium text-slate-600">
          {t("resultsCount", { count: filtered.length })}
        </p>

        <ChargerList
          chargers={filtered}
          selectedId={selectedId}
        />
      </div>
    </div>
  );
}
