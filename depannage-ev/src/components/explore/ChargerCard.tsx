"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Zap, Plug, Gauge, MapPin, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Charger } from "@/types/database";
import { CONNECTOR_LABELS, formatPrice, formatPower } from "@/lib/chargers/format";

interface ChargerCardProps {
  charger: Charger;
  /** Currently selected charger id (synced with map). */
  selectedId?: string | null;
}

export function ChargerCard({ charger, selectedId }: ChargerCardProps) {
  const t = useTranslations("explore");
  const photo = charger.photos[0];
  const isSelected = selectedId != null && charger.id === selectedId;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Scroll into view when this card becomes selected (e.g. via marker click).
  useEffect(() => {
    if (isSelected) {
      wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div ref={wrapperRef}>
      <Link
        href={`/chargers/${charger.id}`}
        className={[
          "group flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/10",
          isSelected
            ? "border-brand-500 ring-2 ring-brand-500/60"
            : "border-brand-100 shadow-sm",
        ].join(" ")}
        aria-current={isSelected ? "true" : undefined}
      >
        {/* Photo or gradient placeholder */}
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={charger.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-mesh">
              <Zap className="h-12 w-12 text-brand-400" aria-hidden="true" />
            </div>
          )}
          {/* Price pill */}
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-800 shadow-sm backdrop-blur">
            {formatPrice(charger.price_amount, charger.price_unit)}
          </span>
          {/* City chip */}
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <MapPin className="h-3 w-3 text-brand-300" />
            {charger.city}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-display font-semibold text-ink line-clamp-1">
            {charger.title}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
              <Plug className="h-3.5 w-3.5 text-brand-600" />
              {CONNECTOR_LABELS[charger.connector_type]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-charge-500/10 px-2.5 py-1 text-xs font-medium text-charge-600">
              <Gauge className="h-3.5 w-3.5" />
              {formatPower(charger.power_kw)}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 text-sm font-semibold text-brand-700 transition-colors group-hover:text-brand-800">
            {t("viewDetails")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </div>
  );
}
