import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ChargerDetail } from "@/lib/chargers/queries";

type HostCardProps = {
  host: ChargerDetail["host"];
};

export async function HostCard({ host }: HostCardProps) {
  const t = await getTranslations("charger");

  const memberSinceDate = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
  }).format(new Date(host.created_at));

  const initial = host.full_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    // Phase 5: profile route
    <Link href={`/profile/${host.id}`} className="block">
      <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          {t("host")}
        </p>

        <div className="flex items-center gap-3">
          {host.avatar_url ? (
            <img
              src={host.avatar_url}
              alt={host.full_name ?? ""}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
              {initial}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {host.full_name}
            </p>
            {host.is_verified && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-charge-500/10 px-2 py-0.5 text-xs font-medium text-charge-600">
                <Check className="h-3 w-3" aria-hidden="true" />
                {t("verified")}
              </span>
            )}
          </div>
        </div>

        {host.rating_count > 0 && (
          <p className="mt-3 flex items-center gap-1 text-sm text-ink-soft">
            <span className="text-amber-400">★</span>
            {t("ratingSummary", {
              avg: host.rating_avg.toFixed(1),
              count: host.rating_count,
            })}
          </p>
        )}

        <p className="mt-2 text-xs text-ink-faint">
          {t("memberSince", { date: memberSinceDate })}
        </p>
      </div>
    </Link>
  );
}
