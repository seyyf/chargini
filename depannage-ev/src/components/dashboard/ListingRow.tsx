import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Charger } from "@/types/database";
import { ActiveToggle } from "./ActiveToggle";

interface ListingRowProps {
  charger: Charger;
}

export async function ListingRow({ charger }: ListingRowProps) {
  const t = await getTranslations();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {charger.title}
        </p>
        <p className="text-xs text-slate-500">{charger.city}</p>
      </div>

      {/* Active badge */}
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
          charger.is_active
            ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
            : "bg-slate-100 text-slate-600 ring-slate-200"
        }`}
      >
        {charger.is_active ? t("dashboard.active") : t("dashboard.inactive")}
      </span>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/chargers/${charger.id}`}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("dashboard.view")}
        </Link>
        <Link
          href={`/host/${charger.id}/edit`}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("dashboard.edit")}
        </Link>
        <ActiveToggle chargerId={charger.id} active={charger.is_active} />
      </div>
    </div>
  );
}
