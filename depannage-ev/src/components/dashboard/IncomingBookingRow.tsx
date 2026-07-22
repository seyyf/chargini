import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { BookingWithRefs } from "@/lib/bookings/queries";
import { statusBadgeClasses } from "@/lib/bookings/status";
import { BookingActions } from "@/components/booking/BookingActions";

interface IncomingBookingRowProps {
  booking: BookingWithRefs;
}

const slotFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function IncomingBookingRow({ booking }: IncomingBookingRowProps) {
  const t = await getTranslations();

  const slot = `${slotFmt.format(new Date(booking.start_time))} – ${new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(booking.end_time))}`;

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Driver name + charger link */}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">
            {booking.driver.full_name ?? "—"}
          </p>
          <Link
            href={`/bookings/${booking.id}`}
            className="truncate text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            {booking.charger.title}
          </Link>
          <p className="text-xs text-slate-500">{slot}</p>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses(booking.status)}`}
        >
          {t(`booking.status.${booking.status}` as Parameters<typeof t>[0])}
        </span>
      </div>

      {/* Inline Accept / Decline for pending bookings */}
      {booking.status === "pending" && (
        <BookingActions
          bookingId={booking.id}
          role="host"
          status={booking.status}
        />
      )}
    </div>
  );
}
