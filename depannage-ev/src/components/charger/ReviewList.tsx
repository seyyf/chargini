import { getTranslations } from "next-intl/server";
import type { ChargerDetail } from "@/lib/chargers/queries";

type ReviewListProps = {
  reviews: ChargerDetail["reviews"];
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} étoiles sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-brand-100"}>
          ★
        </span>
      ))}
    </span>
  );
}

export async function ReviewList({ reviews }: ReviewListProps) {
  const t = await getTranslations("charger");

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">
        {t("reviews")}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("noReviews")}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const initial =
              review.reviewer.full_name?.charAt(0)?.toUpperCase() ?? "?";

            return (
              <li
                key={review.id}
                className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {review.reviewer.avatar_url ? (
                    <img
                      src={review.reviewer.avatar_url}
                      alt={review.reviewer.full_name ?? ""}
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-ink-soft">
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink">
                        {review.reviewer.full_name || "Utilisateur"}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {dateFormatter.format(new Date(review.created_at))}
                      </p>
                    </div>

                    <div className="mt-0.5">
                      <StarRating rating={review.rating} />
                    </div>

                    {review.comment && (
                      <p className="mt-2 text-sm text-ink-soft">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
