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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {charger.title}
        </p>
        <p className="text-xs text-ink-soft">{charger.city}</p>
      </div>

      {/* Active badge */}
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
          charger.is_active
            ? "bg-charge-500/10 text-charge-600 ring-charge-500/30"
            : "bg-brand-50 text-ink-faint ring-brand-100"
        }`}
      >
        {charger.is_active ? t("dashboard.active") : t("dashboard.inactive")}
      </span>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/chargers/${charger.id}`}
          className="cursor-pointer rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-brand-50"
        >
          {t("dashboard.view")}
        </Link>
        <Link
          href={`/host/${charger.id}/edit`}
          className="cursor-pointer rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-brand-50"
        >
          {t("dashboard.edit")}
        </Link>
        <ActiveToggle chargerId={charger.id} active={charger.is_active} />
      </div>
    </div>
  );
}
