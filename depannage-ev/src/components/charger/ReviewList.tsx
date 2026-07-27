import { getTranslations } from "next-intl/server";
import { Star, ShieldCheck, MessageSquareText } from "lucide-react";
import type { ChargerDetail } from "@/lib/chargers/queries";
import { ReviewCards } from "./ReviewCards";

type ReviewListProps = {
  reviews: ChargerDetail["reviews"];
};

/** A row of 5 stars, filled up to `rating`. */
function Stars({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${className} ${
            i < rating ? "fill-amber-400 text-amber-400" : "fill-brand-50 text-brand-100"
          }`}
        />
      ))}
    </span>
  );
}

export async function ReviewList({ reviews }: ReviewListProps) {
  const t = await getTranslations("charger");

  const count = reviews.length;
  const avg =
    count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const avgLabel = avg.toFixed(1).replace(".", ",");

  // Distribution: dist[k] = number of k-star reviews (k = 1..5).
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1] += 1;
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-ink">
          {t("reviews")}
        </h2>
        {count > 0 && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <ShieldCheck className="h-4 w-4 text-charge-600" />
            {t("reviewsSubtitle")}
          </p>
        )}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 py-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
            <MessageSquareText className="h-6 w-6" />
          </span>
          <p className="max-w-sm text-sm text-ink-soft">{t("beFirst")}</p>
        </div>
      ) : (
        <>
          {/* Aggregate summary */}
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Big score */}
              <div className="flex items-center gap-4 sm:w-44 sm:flex-col sm:items-start sm:gap-1 sm:border-r sm:border-brand-100 sm:pr-6">
                <p className="font-display text-5xl font-bold leading-none text-ink">
                  {avgLabel}
                </p>
                <div>
                  <Stars rating={Math.round(avg)} className="h-4 w-4" />
                  <p className="mt-1 text-sm text-ink-soft">
                    {t("avisCount", { count })}
                  </p>
                </div>
              </div>

              {/* Distribution bars */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = dist[star - 1];
                  const pct = count > 0 ? Math.round((n / count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-2 text-ink-soft">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right tabular-nums text-ink-faint">
                        {n}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Individual reviews (with "show more") */}
          <ReviewCards reviews={reviews} />
        </>
      )}
    </div>
  );
}
