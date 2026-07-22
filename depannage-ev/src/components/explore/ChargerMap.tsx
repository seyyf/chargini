"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Charger } from "@/types/database";

// ── Custom div icons (no external images needed) ──────────────────────────────

function makePin(color: string, size: number): L.DivIcon {
  const half = size / 2;
  const tipY = size + Math.round(size * 0.35);
  return L.divIcon({
    className: "",
    iconAnchor: [half, tipY],
    popupAnchor: [0, -tipY],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${tipY}" viewBox="0 0 ${size} ${tipY}" aria-hidden="true">
  <circle cx="${half}" cy="${half}" r="${half}" fill="${color}" stroke="white" stroke-width="2.5"/>
  <line x1="${half}" y1="${size}" x2="${half}" y2="${tipY}" stroke="${color}" stroke-width="2.5"/>
</svg>`,
  });
}

const PIN_NORMAL = makePin("#0891b2", 22); // brand-600
const PIN_SELECTED = makePin("#06b6d4", 34); // brand-500, larger

// ── Map controller: pans to selectedId + fits bounds + fixes hidden sizing ────

interface MapControllerProps {
  selectedId: string | null;
  chargers: Charger[];
  active: boolean;
}

function MapController({ selectedId, chargers, active }: MapControllerProps) {
  const map = useMap();

  // Leaflet renders grey tiles if its container was display:none at init.
  // Invalidate size whenever the map becomes active (mobile toggle) and on resize.
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t = setTimeout(fix, 60);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fix);
    };
  }, [map, active]);

  // Pan to the selected charger.
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
  /** Whether the map is currently visible (used to fix Leaflet sizing). */
  active?: boolean;
  /** Extra classes for the map container (height is controlled by the parent). */
  className?: string;
}

export function ChargerMap({
  chargers,
  selectedId,
  onSelect,
  active = true,
  className = "",
}: ChargerMapProps) {
  return (
    <div
      className={`h-full w-full overflow-hidden ${className}`}
      aria-label="Carte des bornes"
    >
      <MapContainer
        center={[34.0, 9.5]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <MapController selectedId={selectedId} chargers={chargers} active={active} />

        {chargers.map((charger) => (
          <Marker
            key={charger.id}
            position={[charger.lat, charger.lng]}
            icon={charger.id === selectedId ? PIN_SELECTED : PIN_NORMAL}
            eventHandlers={{
              click: () => onSelect(charger.id),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
