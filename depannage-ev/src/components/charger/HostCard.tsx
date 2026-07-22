import { getTranslations } from "next-intl/server";
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
              {initial}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {host.full_name}
            </p>
            {host.is_verified && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("verified")}
              </span>
            )}
          </div>
        </div>

        {host.rating_count > 0 && (
          <p className="mt-3 flex items-center gap-1 text-sm text-slate-600">
            <span className="text-amber-400">★</span>
            {t("ratingSummary", {
              avg: host.rating_avg.toFixed(1),
              count: host.rating_count,
            })}
          </p>
        )}

        <p className="mt-2 text-xs text-slate-400">
          {t("memberSince", { date: memberSinceDate })}
        </p>
      </div>
    </Link>
  );
}
