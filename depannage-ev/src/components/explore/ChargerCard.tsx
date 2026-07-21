"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Charger } from "@/types/database";
import { CONNECTOR_LABELS, formatPrice, formatPower } from "@/lib/chargers/format";

interface ChargerCardProps {
  charger: Charger;
  /** Currently selected charger id (synced with map). */
  selectedId?: string | null;
  /** Called when the user clicks the card to select/pan the map. */
  onSelect?: (id: string) => void;
}

export function ChargerCard({ charger, selectedId, onSelect }: ChargerCardProps) {
  const t = useTranslations("explore");
  const photo = charger.photos[0];
  const isSelected = selectedId != null && charger.id === selectedId;

  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md",
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500"
          : "border-slate-200",
      ].join(" ")}
      onMouseEnter={() => onSelect?.(charger.id)}
      aria-current={isSelected ? "true" : undefined}
    >
      {/* Photo or placeholder */}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={charger.title}
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-slate-100">
          {/* Bolt icon placeholder */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-12 w-12 text-emerald-400"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-1">
          {charger.title}
        </h3>
        <p className="text-sm text-slate-500">{charger.city}</p>

        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <dt className="text-slate-400">{t("card.connector")}</dt>
            <dd className="font-medium text-slate-700">
              {CONNECTOR_LABELS[charger.connector_type]}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("card.power")}</dt>
            <dd className="font-medium text-slate-700">
              {formatPower(charger.power_kw)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-400">{t("card.price")}</dt>
            <dd className="font-medium text-slate-700">
              {formatPrice(charger.price_amount, charger.price_unit)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-3">
          <Link
            href={`/chargers/${charger.id}`}
            className="block w-full rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("viewDetails")}
          </Link>
        </div>
      </div>
    </article>
  );
}
