import type { BookingStatus } from "@/types/database";

/**
 * Returns Tailwind badge classes for a booking status.
 * Mirrors the statusBadgeClasses used on the booking detail page.
 */
export function statusBadgeClasses(status: string): string {
  switch (status as BookingStatus) {
    case "pending":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "completed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "cancelled":
      return "bg-red-100 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

/**
 * Returns the i18n key for a booking status label.
 * e.g. statusLabelKey("pending") === "booking.status.pending"
 */
export function statusLabelKey(status: string): string {
  return `booking.status.${status}`;
}
