"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { reverseGeocode, type LatLng, type ReverseResult } from "@/lib/geocode";

// ── Brand pin (matches ChargerMap) ────────────────────────────────────────────

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

const PIN = makePin("#0891b2", 28); // brand-600

// ── Click handler: place pin + reverse-geocode ville/adresse ─────────────────

function ClickHandler({
  onChange,
  onGeocode,
}: {
  onChange: (v: LatLng) => void;
  onGeocode?: (r: ReverseResult) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onChange({ lat, lng });

      if (onGeocode) {
        void reverseGeocode(lat, lng).then((r) => {
          if (r && (r.city || r.address)) onGeocode(r);
        });
      }
    },
  });
  return null;
}

// ── Focus controller: flies to a target set by forward geocoding ──────────────

function FocusController({ focus }: { focus: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 15), {
      duration: 0.9,
    });
  }, [focus, map]);
  return null;
}

// ── LocationPicker ────────────────────────────────────────────────────────────

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  /** Called after a map click with the reverse-geocoded ville + adresse. */
  onGeocode?: (r: ReverseResult) => void;
  /** When set (by forward geocoding), the map flies to this point. */
  focus?: LatLng | null;
}

export function LocationPicker({
  value,
  onChange,
  onGeocode,
  focus = null,
}: LocationPickerProps) {
  return (
    <div className="h-80 w-full overflow-hidden rounded-2xl border border-brand-100">
      <MapContainer
        center={value ? [value.lat, value.lng] : [34.0, 9.5]}
        zoom={value ? 15 : 6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickHandler onChange={onChange} onGeocode={onGeocode} />
        <FocusController focus={focus} />
        {value && <Marker position={[value.lat, value.lng]} icon={PIN} />}
      </MapContainer>
    </div>
  );
}
