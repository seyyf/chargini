"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "@/i18n/navigation";
import type { Charger } from "@/types/database";
import { formatPrice } from "@/lib/chargers/format";

// ── Custom div icons (no external images needed) ──────────────────────────────

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

const PIN_NORMAL = makePin("#10b981", 22); // emerald-500
const PIN_SELECTED = makePin("#059669", 32); // emerald-600, larger

// ── Map controller: pans to selectedId ───────────────────────────────────────

interface MapControllerProps {
  selectedId: string | null;
  chargers: Charger[];
}

function MapController({ selectedId, chargers }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const charger = chargers.find((c) => c.id === selectedId);
    if (charger) {
      map.setView([charger.lat, charger.lng], Math.max(map.getZoom(), 12), {
        animate: true,
      });
    }
  }, [selectedId, chargers, map]);

  return null;
}

// ── ChargerMap ────────────────────────────────────────────────────────────────

export interface ChargerMapProps {
  chargers: Charger[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ChargerMap({ chargers, selectedId, onSelect }: ChargerMapProps) {
  return (
    <div
      className="mb-4 h-[420px] w-full overflow-hidden rounded-xl border border-slate-200"
      aria-label="Carte des bornes"
    >
      <MapContainer
        center={[34.0, 9.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        // Suppress SSR errors — file is only loaded via ssr:false
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <MapController selectedId={selectedId} chargers={chargers} />

        {chargers.map((charger) => (
          <Marker
            key={charger.id}
            position={[charger.lat, charger.lng]}
            icon={charger.id === selectedId ? PIN_SELECTED : PIN_NORMAL}
            eventHandlers={{
              click: () => onSelect(charger.id),
            }}
          >
            <Popup>
              <div className="min-w-[160px] space-y-1 text-sm">
                <p className="font-semibold text-slate-900">{charger.title}</p>
                <p className="text-slate-600">
                  {formatPrice(charger.price_amount, charger.price_unit)}
                </p>
                <Link
                  href={`/chargers/${charger.id}`}
                  className="mt-1 inline-block rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  Voir la borne
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
