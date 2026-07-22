import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBookingDetail } from "@/lib/bookings/queries";
import { getReviewByBookingAndReviewer } from "@/lib/reviews/queries";
import { BookingActions } from "@/components/booking/BookingActions";
import { ReviewForm } from "@/components/booking/ReviewForm";

// ── Helpers ────────────────────────────────────────────────────────────────────

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

function statusBadgeClasses(status: BookingStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "cancelled":
      return "bg-red-100 text-red-700 ring-red-200";
  }
}

const CONNECTOR_LABELS: Record<string, string> = {
  type2: "Type 2",
  type1: "Type 1",
  ccs: "CCS",
  chademo: "CHAdeMO",
  schuko: "Prise domestique",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/auth", locale });
  }

  const booking = await getBookingDetail(id);

  // RLS already blocks non-participants → null
  if (!booking) {
    notFound();
  }

  // user is guaranteed non-null here (redirect() fired above if !user)
  const role: "driver" | "host" =
    booking.driver.id === user!.id ? "driver" : "host";

  const t = await getTranslations();

  // ── Date/time formatting ───────────────────────────────────────────────────

  const dtFmt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" });

  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const whenLabel = sameDay
    ? `${dtFmt.format(start)} – ${timeFmt.format(end)}`
    : `${dtFmt.format(start)} – ${dtFmt.format(end)}`;

  // ── Price formatting ───────────────────────────────────────────────────────

  const priceLabel =
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(booking.total_price) + " TND";

  // ── Other party ────────────────────────────────────────────────────────────

  const status = booking.status as BookingStatus;
  const connectorLabel =
    CONNECTOR_LABELS[booking.charger.connector_type] ??
    booking.charger.connector_type;

  // ── Review state (only relevant for completed bookings) ────────────────────

  const existingReview =
    status === "completed"
      ? await getReviewByBookingAndReviewer(booking.id, user!.id)
      : null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        {t("bookingPage.title")}
      </h1>

      {/* Summary card */}
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Charger */}
        <div className="flex items-start justify-between px-5 py-4">
          <span className="text-sm font-medium text-slate-500">
            {t("bookingPage.charger")}
          </span>
          <span className="text-right text-sm font-semibold text-slate-900">
            <Link
              href={`/chargers/${booking.charger.id}`}
              className="text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              {booking.charger.title}
            </Link>
            <span className="block text-xs font-normal text-slate-500">
              {connectorLabel} · {booking.charger.city}
            </span>
          </span>
        </div>

        {/* When */}
        <div className="flex items-start justify-between px-5 py-4">
          <span className="text-sm font-medium text-slate-500">
            {t("bookingPage.when")}
          </span>
          <span className="text-right text-sm font-semibold text-slate-900">
            {whenLabel}
          </span>
        </div>

        {/* Total */}
        <div className="flex items-start justify-between px-5 py-4">
          <span className="text-sm font-medium text-slate-500">
            {t("bookingPage.total")}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {priceLabel}
          </span>
        </div>

        {/* Other party */}
        <div className="flex items-start justify-between px-5 py-4">
          <span className="text-sm font-medium text-slate-500">
            {role === "driver"
              ? t("bookingPage.host")
              : t("bookingPage.driver")}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {role === "driver"
              ? (booking.host.full_name ?? "—")
              : (booking.driver.full_name ?? "—")}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-start justify-between px-5 py-4">
          <span className="text-sm font-medium text-slate-500">
            {t("bookingPage.statusLabel")}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses(status)}`}
          >
            {t(`booking.status.${status}`)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <BookingActions
          bookingId={booking.id}
          role={role}
          status={status}
        />
      </div>

      {/* Review section — only shown for completed bookings */}
      {status === "completed" && (
        <div className="mt-6">
          {existingReview ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm text-slate-500">
                {t("review.alreadyReviewed")}
              </p>
              {/* Show the stars they gave */}
              <div className="mt-1 flex gap-0.5" aria-label={`${existingReview.rating} étoiles`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-lg ${star <= existingReview.rating ? "text-amber-400" : "text-slate-300"}`}
                  >
                    {star <= existingReview.rating ? "★" : "☆"}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <ReviewForm bookingId={booking.id} />
          )}
        </div>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          ← {t("bookingPage.backToDashboard")}
        </Link>
      </div>
    </section>
  );
}
