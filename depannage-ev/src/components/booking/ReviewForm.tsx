"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createReview } from "@/app/actions/reviews";
import { validateReview } from "@/lib/reviews/review";

// ── Props ──────────────────────────────────────────────────────────────────────

interface ReviewFormProps {
  bookingId: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ReviewForm({ bookingId }: ReviewFormProps) {
  const t = useTranslations("review");
  const router = useRouter();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [hovered, setHovered] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation
    const errors = validateReview({ rating, comment });
    if (errors.rating) {
      // Strip the "review." namespace prefix since t() is already scoped to "review"
      setFormError(t(errors.rating.replace("review.", "") as Parameters<typeof t>[0]));
      return;
    }
    if (errors.comment) {
      setFormError(t(errors.comment.replace("review.", "") as Parameters<typeof t>[0]));
      return;
    }

    const fd = new FormData();
    fd.set("bookingId", bookingId);
    fd.set("rating", String(rating));
    fd.set("comment", comment);

    startTransition(async () => {
      const result = await createReview(fd);
      if (result.ok) {
        setSuccess(true);
        router.refresh();
      } else if (result.error) {
        // Strip the "review." prefix so the key works with the scoped t()
        const key = result.error.replace("review.", "") as Parameters<typeof t>[0];
        setFormError(t(key));
      }
    });
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="rounded-2xl border border-charge-500/20 bg-charge-500/10 px-5 py-4">
        <p className="text-sm font-medium text-charge-600">{t("success")}</p>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-brand-100 bg-white px-5 py-5 shadow-sm">
      <h2 className="mb-4 font-display text-base font-semibold text-ink">
        {t("leaveTitle")}
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Star rating */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t("yourRating")}
          </label>
          <div
            className="flex gap-1"
            onMouseLeave={() => setHovered(0)}
            role="group"
            aria-label={t("yourRating")}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hovered || rating);
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                  aria-pressed={star <= rating}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  className="cursor-pointer text-2xl leading-none transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 rounded"
                >
                  <span className={filled ? "text-amber-400" : "text-ink-faint"}>
                    {filled ? "★" : "☆"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label
            htmlFor={`review-comment-${bookingId}`}
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            {t("yourComment")}
          </label>
          <textarea
            id={`review-comment-${bookingId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            disabled={isPending}
            className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm text-ink placeholder-ink-faint shadow-sm focus:border-brand-400 focus:bg-white focus:outline-none disabled:bg-surface disabled:text-ink-faint"
          />
          <p className="mt-1 text-right text-xs text-ink-faint">
            {comment.length}/1000
          </p>
        </div>

        {/* Error message */}
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || rating < 1}
          className="cursor-pointer rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
