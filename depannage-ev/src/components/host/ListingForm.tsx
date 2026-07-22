"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { validateListing, type ListingErrors } from "@/lib/chargers/listingValidation";
import { createCharger, updateCharger } from "@/app/actions/chargers";
import { PhotoUploader } from "./PhotoUploader";
import { AvailabilityEditor, type AvailabilityRow } from "./AvailabilityEditor";

// Leaflet must only run in the browser — load via dynamic ssr:false
const LocationPicker = dynamic(
  () => import("./LocationPicker").then((m) => m.LocationPicker),
  { ssr: false },
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface InitialValues {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  connectorType?: string;
  powerKw?: number;
  priceAmount?: number;
  priceUnit?: string;
  availability?: AvailabilityRow[];
  photos?: string[];
}

export interface ListingFormProps {
  mode: "new" | "edit";
  chargerId?: string;
  initial?: InitialValues;
}

const CONNECTOR_TYPES = ["type2", "type1", "ccs", "chademo", "schuko"] as const;
const PRICE_UNITS = ["kwh", "hour"] as const;

// ── Field component helpers ───────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

// ── ListingForm ───────────────────────────────────────────────────────────────

export function ListingForm({ mode, chargerId, initial = {} }: ListingFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Field state — pre-filled from initial
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initial.lat != null && initial.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  );
  const [connectorType, setConnectorType] = useState(initial.connectorType ?? "type2");
  const [powerKw, setPowerKw] = useState(initial.powerKw?.toString() ?? "");
  const [priceAmount, setPriceAmount] = useState(initial.priceAmount?.toString() ?? "");
  const [priceUnit, setPriceUnit] = useState(initial.priceUnit ?? "kwh");
  const [photos, setPhotos] = useState<File[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>(
    initial.availability ?? [],
  );

  // Validation + server errors
  const [fieldErrors, setFieldErrors] = useState<ListingErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // ── Submit handler ──────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const parsedPower = powerKw ? parseFloat(powerKw) : null;
    const parsedPrice = priceAmount ? parseFloat(priceAmount) : null;

    const input = {
      title,
      description,
      address,
      city,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      connectorType,
      powerKw: isNaN(parsedPower as number) ? null : parsedPower,
      priceAmount: isNaN(parsedPrice as number) ? null : parsedPrice,
      priceUnit,
      availability,
    };

    // Client-side validation first
    const errors = validateListing(input);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    // Build FormData for the server action
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("address", address);
    fd.append("city", city);
    if (location) {
      fd.append("lat", String(location.lat));
      fd.append("lng", String(location.lng));
    }
    fd.append("connectorType", connectorType);
    fd.append("powerKw", powerKw);
    fd.append("priceAmount", priceAmount);
    fd.append("priceUnit", priceUnit);
    fd.append("availability", JSON.stringify(availability));
    photos.forEach((file) => fd.append("photos", file));
    if (mode === "edit") {
      fd.append("existingPhotos", JSON.stringify(initial.photos ?? []));
    }

    startTransition(async () => {
      const result =
        mode === "new"
          ? await createCharger(fd)
          : await updateCharger(chargerId!, fd);

      if (result.error) {
        // error is an i18n key — translate it
        setServerError(t(result.error as Parameters<typeof t>[0]));
        return;
      }

      if (result.chargerId) {
        router.push(`/chargers/${result.chargerId}`);
      }
    });
  }

  // ── Translate field error keys ──────────────────────────────────────────────
  function fe(key: keyof ListingErrors): string | undefined {
    const k = fieldErrors[key];
    return k ? t(k as Parameters<typeof t>[0]) : undefined;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Server-level error */}
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Title */}
      <div>
        <FieldLabel htmlFor="title">{t("host.fields.title")}</FieldLabel>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="mt-1 block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        />
        <FieldError message={fe("title")} />
      </div>

      {/* Description */}
      <div>
        <FieldLabel htmlFor="description">{t("host.fields.description")}</FieldLabel>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        />
        <FieldError message={fe("description")} />
      </div>

      {/* Address */}
      <div>
        <FieldLabel htmlFor="address">{t("host.fields.address")}</FieldLabel>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        />
        <FieldError message={fe("address")} />
      </div>

      {/* City — auto-filled by reverse geocode but still editable */}
      <div>
        <FieldLabel htmlFor="city">{t("host.fields.city")}</FieldLabel>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        />
        <FieldError message={fe("city")} />
      </div>

      {/* Map location picker */}
      <div>
        <FieldLabel htmlFor="location-map">{t("host.fields.location")}</FieldLabel>
        <p className="mb-2 text-xs text-ink-faint">{t("host.locationHint")}</p>
        <div id="location-map">
          <LocationPicker
            value={location}
            onChange={setLocation}
            onCity={(geocodedCity) => {
              // Only auto-fill city if the user hasn't typed one yet
              if (!city) setCity(geocodedCity);
            }}
          />
        </div>
        <FieldError message={fe("lat")} />
      </div>

      {/* Connector type */}
      <div>
        <FieldLabel htmlFor="connectorType">{t("host.fields.connector")}</FieldLabel>
        <select
          id="connectorType"
          value={connectorType}
          onChange={(e) => setConnectorType(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        >
          {CONNECTOR_TYPES.map((ct) => (
            <option key={ct} value={ct}>
              {t(`connectors.${ct}`)}
            </option>
          ))}
        </select>
        <FieldError message={fe("connectorType")} />
      </div>

      {/* Power (kW) */}
      <div>
        <FieldLabel htmlFor="powerKw">{t("host.fields.power")}</FieldLabel>
        <input
          id="powerKw"
          type="number"
          min={0.1}
          max={350}
          step={0.1}
          value={powerKw}
          onChange={(e) => setPowerKw(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        />
        <FieldError message={fe("powerKw")} />
      </div>

      {/* Price amount + unit */}
      <div>
        <FieldLabel htmlFor="priceAmount">{t("host.fields.price")}</FieldLabel>
        <div className="mt-1 flex gap-2">
          <input
            id="priceAmount"
            type="number"
            min={0.01}
            step={0.01}
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            className="block w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
          />
          <select
            id="priceUnit"
            value={priceUnit}
            onChange={(e) => setPriceUnit(e.target.value)}
            className="rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
          >
            {PRICE_UNITS.map((u) => (
              <option key={u} value={u}>
                {t(u === "kwh" ? "host.fields.perKwh" : "host.fields.perHour")}
              </option>
            ))}
          </select>
        </div>
        <FieldError message={fe("priceAmount")} />
        <FieldError message={fe("priceUnit")} />
      </div>

      {/* Photos */}
      <div>
        <FieldLabel htmlFor="photos">{t("host.fields.photos")}</FieldLabel>
        <div id="photos" className="mt-1">
          <PhotoUploader files={photos} onChange={setPhotos} />
        </div>
      </div>

      {/* Availability */}
      <div>
        <FieldLabel htmlFor="availability">{t("host.fields.availability")}</FieldLabel>
        <div id="availability" className="mt-2">
          <AvailabilityEditor value={availability} onChange={setAvailability} />
        </div>
        <FieldError message={fe("availability")} />
      </div>

      {/* Submit */}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending
            ? t("host.submitting")
            : mode === "new"
              ? t("host.submitNew")
              : t("host.submitEdit")}
        </button>
      </div>
    </form>
  );
}
