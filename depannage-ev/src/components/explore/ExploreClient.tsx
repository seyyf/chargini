"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  SlidersHorizontal,
  List as ListIcon,
  Map as MapIcon,
  X,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Charger } from "@/types/database";
import {
  ChargerFilters,
  EMPTY_FILTERS,
  filterChargers,
} from "@/lib/chargers/filter";
import { CONNECTOR_LABELS, formatPrice, formatPower } from "@/lib/chargers/format";
import { QuickFilters } from "./QuickFilters";
import { FilterDrawer } from "./FilterDrawer";
import { ChargerList } from "./ChargerList";
import type { ChargerMapProps } from "./ChargerMap";

// Load ChargerMap client-only: react-leaflet uses `window` at module load time.
const ChargerMap = dynamic<ChargerMapProps>(
  () => import("./ChargerMap").then((m) => m.ChargerMap),
  { ssr: false },
);

function activeFilterCount(f: ChargerFilters): number {
  return (
    f.connectorTypes.length +
    (f.minPowerKw != null ? 1 : 0) +
    (f.maxPrice != null ? 1 : 0) +
    (f.city ? 1 : 0)
  );
}

export function ExploreClient({ chargers }: { chargers: Charger[] }) {
  const t = useTranslations("explore");
  const [filters, setFilters] = useState<ChargerFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(
    () => filterChargers(chargers, filters),
    [chargers, filters],
  );
  const activeCount = activeFilterCount(filters);
  const selected = selectedId
    ? filtered.find((c) => c.id === selectedId) ?? null
    : null;

  return (
    <div className="mt-4">
      {/* ── Sticky control bar ─────────────────────────────────────── */}
      <div className="sticky top-[68px] z-30 -mx-4 border-b border-brand-100 bg-surface/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <p className="hidden shrink-0 text-sm font-semibold text-ink md:block">
            {t("resultsCount", { count: filtered.length })}
          </p>
          <div className="min-w-0 flex-1">
            <QuickFilters filters={filters} onChange={setFilters} />
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-brand-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t("openFilters")}</span>
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile: count + list/map toggle */}
        <div className="mt-3 flex items-center justify-between lg:hidden">
          <p className="text-sm font-semibold text-ink">
            {t("resultsCount", { count: filtered.length })}
          </p>
          <div className="inline-flex rounded-xl border border-brand-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === "list" ? "bg-ink text-white" : "text-ink-soft"
              }`}
            >
              <ListIcon className="h-4 w-4" />
              {t("showList")}
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === "map" ? "bg-ink text-white" : "text-ink-soft"
              }`}
            >
              <MapIcon className="h-4 w-4" />
              {t("showMap")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="mt-5 lg:flex lg:items-start lg:gap-6">
        {/* List */}
        <div className={`${view === "map" ? "hidden" : "block"} lg:block lg:min-w-0 lg:flex-1`}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-white/60 py-20 text-center">
              <p className="font-medium text-ink">{t("empty")}</p>
              <p className="mt-1 text-sm text-ink-soft">{t("emptyHint")}</p>
            </div>
          ) : (
            <ChargerList chargers={filtered} selectedId={selectedId} />
          )}
        </div>

        {/* Map */}
        <div
          className={`${
            view === "list" ? "hidden" : "block"
          } lg:sticky lg:top-[92px] lg:block lg:w-[44%] lg:shrink-0`}
        >
          <div className="relative h-[68dvh] overflow-hidden rounded-2xl border border-brand-100 shadow-sm lg:h-[calc(100dvh-7.5rem)]">
            <ChargerMap
              chargers={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              active={view === "map"}
            />
          </div>
        </div>
      </div>

      {/* Mobile map peek card — fixed to the viewport so it's never clipped */}
      {view === "map" && selected && (
        <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
          <div className="relative">
            <Link
              href={`/chargers/${selected.id}`}
              className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-2.5 shadow-2xl shadow-ink/20"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                {selected.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.photos[0]}
                    alt={selected.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-50">
                    <Zap className="h-6 w-6 text-brand-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-ink">
                  {selected.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {CONNECTOR_LABELS[selected.connector_type]} ·{" "}
                  {formatPower(selected.power_kw)}
                </p>
                <p className="mt-0.5 text-sm font-bold text-brand-700">
                  {formatPrice(selected.price_amount, selected.price_unit)}
                </p>
              </div>
              <span className="mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Fermer"
              className="absolute -right-2 -top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow-md ring-2 ring-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chargers={chargers}
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
      />
    </div>
  );
}
