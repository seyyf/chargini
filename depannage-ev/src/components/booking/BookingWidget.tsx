"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { AvailabilityRule } from "@/types/database";
import { isWithinAvailability, hasAnyAvailability } from "@/lib/bookings/availability";
import { calculateBookingTotal } from "@/lib/pricing";
import { createBooking } from "@/app/actions/bookings";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookingWidgetProps {
  charger: {
    id: string;
    title: string;
    priceAmount: number;
    priceUnit: "kwh" | "hour";
    powerKw: number;
  };
  availability: AvailabilityRule[];
  viewer: "guest" | "host" | "driver";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTND(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount) + " TND"
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── CheckoutModal ──────────────────────────────────────────────────────────────

interface CheckoutModalProps {
  charger: BookingWidgetProps["charger"];
  date: string;
  startTime: string;
  endTime: string;
  formattedTotal: string;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

function CheckoutModal({
  charger,
  date,
  startTime,
  endTime,
  formattedTotal,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const t = useTranslations("booking");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Close on ESC key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("chargerId", charger.id);
      fd.set("startISO", new Date(`${date}T${startTime}`).toISOString());
      fd.set("endISO", new Date(`${date}T${endTime}`).toISOString());

      const result = await createBooking(fd);

      if (result.bookingId) {
        onSuccess(result.bookingId);
      } else if (result.error) {
        // Errors are like "booking.loginToBook" — strip the namespace prefix
        const key = result.error.startsWith("booking.")
          ? result.error.replace("booking.", "")
          : result.error;
        try {
          setError(t(key as Parameters<typeof t>[0]));
        } catch {
          setError(result.error);
        }
      }
    });
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("checkoutTitle")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal card */}
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-2xl">
        <h2 className="mb-1 font-display text-lg font-bold text-ink">
          {t("checkoutTitle")}
        </h2>

        {/* Booking summary */}
        <p className="mb-5 text-sm text-ink-soft">
          {charger.title} &mdash; {date} {startTime}&ndash;{endTime} &mdash;{" "}
          <span className="font-semibold text-ink">{formattedTotal}</span>
        </p>

        {/* Fake card inputs */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              {t("cardName")}
            </label>
            <input
              type="text"
              autoComplete="cc-name"
              placeholder="Jean Dupont"
              className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              {t("cardNumber")}
            </label>
            <input
              type="text"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                {t("expiry")}
              </label>
              <input
                type="text"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                maxLength={5}
                className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                {t("cvc")}
              </label>
              <input
                type="text"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Mock notice */}
        <p className="mt-3 text-xs text-ink-faint">{t("mockNotice")}</p>

        {/* Error */}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 cursor-pointer rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            onClick={handlePay}
            disabled={isPending}
            className="flex-1 cursor-pointer rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending
              ? t("processing")
              : t("payNow", { amount: formattedTotal })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BookingWidget ──────────────────────────────────────────────────────────────

export function BookingWidget({
  charger,
  availability,
  viewer,
}: BookingWidgetProps) {
  const t = useTranslations("booking");
  const router = useRouter();

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showModal, setShowModal] = useState(false);

  // ── Guest ──
  if (viewer === "guest") {
    return (
      <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">
          {t("widgetTitle")}
        </h2>
        <Link
          href="/auth"
          className="block w-full cursor-pointer rounded-xl bg-ink px-5 py-3 text-center font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25"
        >
          {t("loginToBook")}
        </Link>
      </div>
    );
  }

  // ── Host ──
  if (viewer === "host") {
    return (
      <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">
          {t("widgetTitle")}
        </h2>
        <p className="text-sm text-ink-soft">{t("ownCharger")}</p>
      </div>
    );
  }

  // ── Driver ──

  if (!hasAnyAvailability(availability)) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">
          {t("widgetTitle")}
        </h2>
        <p className="text-sm text-ink-soft">{t("noAvailability")}</p>
      </div>
    );
  }

  // Compute slot validity
  let valid = false;
  let total: number | null = null;
  let formattedTotal = "";

  if (date && startTime && endTime) {
    try {
      if (isWithinAvailability(availability, date, startTime, endTime)) {
        const computed = calculateBookingTotal({
          priceUnit: charger.priceUnit,
          priceAmount: charger.priceAmount,
          powerKw: charger.powerKw,
          startTime: new Date(`${date}T${startTime}`),
          endTime: new Date(`${date}T${endTime}`),
        });
        total = computed;
        formattedTotal = formatTND(computed);
        valid = true;
      }
    } catch {
      valid = false;
    }
  }

  const slotChosen = Boolean(date && startTime && endTime);
  const notAvailable = slotChosen && !valid;

  return (
    <>
      <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">
          {t("widgetTitle")}
        </h2>

        <div className="space-y-3">
          {/* Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              {t("date")}
            </label>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>

          {/* Start time */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              {t("start")}
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>

          {/* End time */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              {t("end")}
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-brand-100 bg-surface/60 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Not-available message */}
        {notAvailable && (
          <p className="mt-3 text-sm font-medium text-red-600">
            {t("notAvailable")}
          </p>
        )}

        {/* Total */}
        {valid && total !== null && (
          <p className="mt-3 text-sm text-ink-soft">
            <span className="font-medium">{t("total")} :</span>{" "}
            <span className="font-bold text-brand-700">{formattedTotal}</span>
          </p>
        )}

        {/* Reserve button */}
        <button
          type="button"
          disabled={!valid}
          onClick={() => setShowModal(true)}
          className="mt-4 w-full cursor-pointer rounded-xl bg-ink px-5 py-3 font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("reserve")}
        </button>
      </div>

      {/* Checkout modal */}
      {showModal && (
        <CheckoutModal
          charger={charger}
          date={date}
          startTime={startTime}
          endTime={endTime}
          formattedTotal={formattedTotal}
          onClose={() => setShowModal(false)}
          onSuccess={(bookingId) => {
            setShowModal(false);
            router.push(`/bookings/${bookingId}`);
          }}
        />
      )}
    </>
  );
}
