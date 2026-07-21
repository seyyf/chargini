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
        <span key={i} className={i < rating ? "text-amber-400" : "text-slate-300"}>
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
      <h2 className="mb-4 text-xl font-semibold text-slate-900">
        {t("reviews")}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">{t("noReviews")}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const initial =
              review.reviewer.full_name?.charAt(0)?.toUpperCase() ?? "?";

            return (
              <li
                key={review.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {review.reviewer.avatar_url ? (
                    <img
                      src={review.reviewer.avatar_url}
                      alt={review.reviewer.full_name ?? ""}
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {initial}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">
                        {review.reviewer.full_name || "Utilisateur"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dateFormatter.format(new Date(review.created_at))}
                      </p>
                    </div>

                    <div className="mt-0.5">
                      <StarRating rating={review.rating} />
                    </div>

                    {review.comment && (
                      <p className="mt-2 text-sm text-slate-600">
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
