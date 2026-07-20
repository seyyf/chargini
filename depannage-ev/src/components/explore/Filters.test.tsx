import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Filters } from "./Filters";
import { EMPTY_FILTERS } from "@/lib/chargers/filter";
import type { Charger } from "@/types/database";

const messages = {
  explore: {
    filters: {
      heading: "Filtres",
      connector: "Type de prise",
      minPower: "Puissance min. (kW)",
      maxPrice: "Prix max. (TND)",
      city: "Ville",
      allCities: "Toutes les villes",
      reset: "Réinitialiser",
      anyConnector: "Toutes les prises",
    },
  },
  connectors: {
    type2: "Type 2",
    type1: "Type 1",
    ccs: "CCS",
    chademo: "CHAdeMO",
    schuko: "Prise domestique",
  },
};

const sampleChargers: Charger[] = [
  {
    id: "1",
    host_id: "h1",
    title: "Borne Tunis",
    description: "",
    address: "1 rue test",
    lat: 36.8,
    lng: 10.1,
    city: "Tunis",
    connector_type: "type2",
    power_kw: 7,
    price_amount: 0.3,
    price_unit: "kwh",
    photos: [],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    host_id: "h2",
    title: "Borne Sfax",
    description: "",
    address: "2 rue test",
    lat: 34.7,
    lng: 10.7,
    city: "Sfax",
    connector_type: "ccs",
    power_kw: 50,
    price_amount: 0.5,
    price_unit: "kwh",
    photos: [],
    is_active: true,
    created_at: "2024-01-02T00:00:00Z",
  },
];

function renderFilters(onChange = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <Filters
        chargers={sampleChargers}
        filters={EMPTY_FILTERS}
        onChange={onChange}
      />
    </NextIntlClientProvider>,
  );
}

describe("Filters", () => {
  it("renders connector type checkboxes", () => {
    renderFilters();
    expect(screen.getByLabelText("Type 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Type 1")).toBeInTheDocument();
    expect(screen.getByLabelText("CCS")).toBeInTheDocument();
    expect(screen.getByLabelText("CHAdeMO")).toBeInTheDocument();
    expect(screen.getByLabelText("Prise domestique")).toBeInTheDocument();
  });

  it("renders the city select with options derived from chargers", () => {
    renderFilters();
    const select = screen.getByRole("combobox", { name: /ville/i });
    expect(select).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Toutes les villes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sfax" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tunis" })).toBeInTheDocument();
  });

  it("calls onChange with updated minPowerKw when the user types in the min-power input", () => {
    const onChange = vi.fn();
    renderFilters(onChange);

    const input = screen.getByLabelText(/puissance min/i);
    fireEvent.change(input, { target: { value: "11" } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ minPowerKw: 11 }),
    );
  });

  it("resets filters when the reset button is clicked", () => {
    const onChange = vi.fn();
    renderFilters(onChange);

    const resetBtn = screen.getByRole("button", { name: /réinitialiser/i });
    fireEvent.click(resetBtn);

    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
