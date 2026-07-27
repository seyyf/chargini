"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star, ShieldCheck } from "lucide-react";

export interface ReviewCardItem {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: { full_name: string | null; avatar_url: string | null };
}

const PAGE = 5;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "fill-brand-50 text-brand-100"
          }`}
        />
      ))}
    </span>
  );
}

/** Review cards with a "show more" so long lists don't all render at once. */
export function ReviewCards({ reviews }: { reviews: ReviewCardItem[] }) {
  const t = useTranslations("charger");
  const [visible, setVisible] = useState(PAGE);
  const shown = reviews.slice(0, visible);

  return (
    <>
      <ul className="mt-4 space-y-3">
        {shown.map((review) => {
          const name = review.reviewer.full_name || "Utilisateur";
          const initial = name.charAt(0).toUpperCase();
          return (
            <li
              key={review.id}
              className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {review.reviewer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.reviewer.avatar_url}
                    alt={name}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {initial}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="text-xs text-ink-faint">
                      {dateFormatter.format(new Date(review.created_at))}
                    </p>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-charge-500/10 px-2 py-0.5 text-[11px] font-medium text-charge-600">
                      <ShieldCheck className="h-3 w-3" />
                      {t("verifiedCharge")}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {reviews.length > visible && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="cursor-pointer rounded-xl border border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-50"
          >
            {t("showMoreReviews")} ({reviews.length - visible})
          </button>
        </div>
      )}
    </>
  );
}
