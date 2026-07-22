import { getTranslations } from "next-intl/server";
import { ShieldCheck, Star } from "lucide-react";
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
    <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? ""}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {initial}
          </div>
        )}

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">
            {profile.full_name || "Utilisateur"}
          </h1>

          {profile.is_verified && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-charge-500/10 px-2.5 py-0.5 text-xs font-medium text-charge-600">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("verified")}
            </span>
          )}
        </div>
      </div>

      {/* Rating summary */}
      {profile.rating_count > 0 && (
        <p className="mt-4 flex items-center gap-1 text-sm text-ink-soft">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          {t("ratingSummary", {
            avg: profile.rating_avg.toFixed(1),
            count: profile.rating_count,
          })}
        </p>
      )}

      {/* Member since */}
      <p className="mt-2 text-xs text-ink-faint">
        {t("memberSince", { date: memberSinceDate })}
      </p>
    </div>
  );
}
