"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// ── Emerald pin (matches ChargerMap) ─────────────────────────────────────────

function makePin(color: string, size: number): L.DivIcon {
  const half = size / 2;
  const tipY = size + Math.round(size * 0.35);
  return L.divIcon({
    className: "",
    iconAnchor: [half, tipY],
    popupAnchor: [0, -tipY],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${tipY}" viewBox="0 0 ${size} ${tipY}" aria-hidden="true">
  <circle cx="${half}" cy="${half}" r="${half}" fill="${color}" stroke="white" stroke-width="2"/>
  <line x1="${half}" y1="${size}" x2="${half}" y2="${tipY}" stroke="${color}" stroke-width="2"/>
</svg>`,
  });
}

const PIN = makePin("#10b981", 28); // emerald-500

// ── Click-handler child ───────────────────────────────────────────────────────

interface ClickHandlerProps {
  onChange: (v: { lat: number; lng: number }) => void;
  onCity?: (city: string) => void;
}

function ClickHandler({ onChange, onCity }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onChange({ lat, lng });

      // Optional best-effort reverse geocode
      if (onCity) {
        void (async () => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              { headers: { "Accept-Language": "fr" } },
            );
            if (!res.ok) return;
            const json = (await res.json()) as {
              address?: {
                city?: string;
                town?: string;
                village?: string;
                county?: string;
              };
            };
            const city =
              json.address?.city ??
              json.address?.town ??
              json.address?.village ??
              json.address?.county ??
              "";
            if (city) onCity(city);
          } catch {
            // Never throw — geocoding is best-effort
          }
        })();
      }
    },
  });
  return null;
}

// ── LocationPicker ────────────────────────────────────────────────────────────

export interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
  onCity?: (city: string) => void;
}

export function LocationPicker({ value, onChange, onCity }: LocationPickerProps) {
  // Fix Leaflet's default icon paths broken by bundlers
  useEffect(() => {
    // No-op: we use custom divIcons so default icon fix is not needed
  }, []);

  return (
    <div className="h-80 w-full overflow-hidden rounded-lg border border-slate-200">
      <MapContainer
        center={[34.0, 9.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickHandler onChange={onChange} onCity={onCity} />
        {value && <Marker position={[value.lat, value.lng]} icon={PIN} />}
      </MapContainer>
    </div>
  );
}
