"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  acceptBooking,
  declineBooking,
  completeBooking,
  cancelBooking,
} from "@/app/actions/bookings";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BookingActionsProps {
  bookingId: string;
  role: "driver" | "host";
  status: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BookingActions({ bookingId, role, status }: BookingActionsProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Action handler factory ─────────────────────────────────────────────────

  function handleAction(
    action: (id: string) => Promise<{ error?: string; bookingId?: string }>,
  ) {
    return () => {
      startTransition(async () => {
        const result = await action(bookingId);
        if (result.error) {
          // Surface error inline — Phase 5 will replace with a toast
          try {
            alert(t(result.error as Parameters<typeof t>[0]));
          } catch {
            alert(result.error);
          }
          return;
        }
        router.refresh();
      });
    };
  }

  // ── Role + status gating ───────────────────────────────────────────────────

  if (role === "host" && status === "pending") {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAction(acceptBooking)}
          disabled={isPending}
          className="cursor-pointer rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("bookingPage.accept")}
        </button>
        <button
          onClick={handleAction(declineBooking)}
          disabled={isPending}
          className="cursor-pointer rounded-xl border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("bookingPage.decline")}
        </button>
      </div>
    );
  }

  if (role === "host" && status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAction(completeBooking)}
          disabled={isPending}
          className="cursor-pointer rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("bookingPage.complete")}
        </button>
      </div>
    );
  }

  if (role === "driver" && status === "pending") {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAction(cancelBooking)}
          disabled={isPending}
          className="cursor-pointer rounded-xl border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("bookingPage.cancel")}
        </button>
      </div>
    );
  }

  // completed / cancelled, or driver + confirmed
  return (
    <>
      {/* Phase 5: leaveReview */}
    </>
  );
}
