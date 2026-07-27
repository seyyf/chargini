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
      return "bg-charge-500/10 text-charge-600 ring-charge-500/20";
    case "completed":
      return "bg-brand-50 text-brand-700 ring-brand-100";
    case "cancelled":
      return "bg-red-100 text-red-700 ring-red-200";
    default:
      return "bg-brand-50 text-ink-soft ring-brand-100";
  }
}

/**
 * Returns the i18n key for a booking status label.
 * e.g. statusLabelKey("pending") === "booking.status.pending"
 */
export function statusLabelKey(status: string): string {
  return `booking.status.${status}`;
}
