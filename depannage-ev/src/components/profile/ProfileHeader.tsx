import { getTranslations } from "next-intl/server";
import type { PublicProfile } from "@/lib/profiles/queries";

type ProfileHeaderProps = {
  profile: PublicProfile;
};

export async function ProfileHeader({ profile }: ProfileHeaderProps) {
  const t = await getTranslations("profile");

  const initial = profile.full_name?.charAt(0)?.toUpperCase() ?? "?";

  const memberSinceDate = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
  }).format(new Date(profile.created_at));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? ""}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
            {initial}
          </div>
        )}

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {profile.full_name || "Utilisateur"}
          </h1>

          {profile.is_verified && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <svg
                className="h-3.5 w-3.5"
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

      {/* Rating summary */}
      {profile.rating_count > 0 && (
        <p className="mt-4 flex items-center gap-1 text-sm text-slate-600">
          <span className="text-amber-400 text-base">★</span>
          {t("ratingSummary", {
            avg: profile.rating_avg.toFixed(1),
            count: profile.rating_count,
          })}
        </p>
      )}

      {/* Member since */}
      <p className="mt-2 text-xs text-slate-400">
        {t("memberSince", { date: memberSinceDate })}
      </p>
    </div>
  );
}
