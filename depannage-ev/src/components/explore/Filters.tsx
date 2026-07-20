"use client";

import { useTranslations } from "next-intl";
import type { Charger, ConnectorType } from "@/types/database";
import {
  ChargerFilters,
  EMPTY_FILTERS,
  cityOptions,
} from "@/lib/chargers/filter";
import { CONNECTOR_LABELS } from "@/lib/chargers/format";

const CONNECTOR_TYPES: ConnectorType[] = [
  "type2",
  "type1",
  "ccs",
  "chademo",
  "schuko",
];

interface FiltersProps {
  chargers: Charger[];
  filters: ChargerFilters;
  onChange: (f: ChargerFilters) => void;
}

export function Filters({ chargers, filters, onChange }: FiltersProps) {
  const t = useTranslations("explore.filters");

  function toggleConnector(type: ConnectorType) {
    const current = filters.connectorTypes;
    const next = current.includes(type)
      ? current.filter((c) => c !== type)
      : [...current, type];
    onChange({ ...filters, connectorTypes: next });
  }

  function handleMinPower(value: string) {
    const parsed = parseFloat(value);
    onChange({
      ...filters,
      minPowerKw: value === "" || isNaN(parsed) ? null : parsed,
    });
  }

  function handleMaxPrice(value: string) {
    const parsed = parseFloat(value);
    onChange({
      ...filters,
      maxPrice: value === "" || isNaN(parsed) ? null : parsed,
    });
  }

  function handleCity(value: string) {
    onChange({ ...filters, city: value === "" ? null : value });
  }

  const cities = cityOptions(chargers);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-800">
        {t("heading")}
      </h2>

      {/* Connector type */}
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-medium text-slate-700">
          {t("connector")}
        </legend>
        <div className="flex flex-col gap-2">
          {CONNECTOR_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={filters.connectorTypes.includes(type)}
                onChange={() => toggleConnector(type)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              {CONNECTOR_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Min power */}
      <div className="mb-5">
        <label
          htmlFor="filter-min-power"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {t("minPower")}
        </label>
        <input
          id="filter-min-power"
          type="number"
          min={0}
          step={0.1}
          value={filters.minPowerKw ?? ""}
          onChange={(e) => handleMinPower(e.target.value)}
          placeholder="—"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
        />
      </div>

      {/* Max price */}
      <div className="mb-5">
        <label
          htmlFor="filter-max-price"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {t("maxPrice")}
        </label>
        <input
          id="filter-max-price"
          type="number"
          min={0}
          step={0.001}
          value={filters.maxPrice ?? ""}
          onChange={(e) => handleMaxPrice(e.target.value)}
          placeholder="—"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
        />
      </div>

      {/* City */}
      <div className="mb-6">
        <label
          htmlFor="filter-city"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {t("city")}
        </label>
        <select
          id="filter-city"
          value={filters.city ?? ""}
          onChange={(e) => handleCity(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
        >
          <option value="">{t("allCities")}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t("reset")}
      </button>
    </div>
  );
}
