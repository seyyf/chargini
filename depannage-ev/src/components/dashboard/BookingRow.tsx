import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { BookingWithRefs } from "@/lib/bookings/queries";
import { statusBadgeClasses } from "@/lib/bookings/status";

interface BookingRowProps {
  booking: BookingWithRefs;
}

const slotFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function BookingRow({ booking }: BookingRowProps) {
  const t = await getTranslations();

  const slot = `${slotFmt.format(new Date(booking.start_time))} – ${new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(booking.end_time))}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
      {/* Charger link + slot */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/bookings/${booking.id}`}
          className="truncate text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          {booking.charger.title}
        </Link>
        <p className="text-xs text-ink-soft">{slot}</p>
      </div>

      {/* Status badge */}
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClasses(booking.status)}`}
      >
        {t(`booking.status.${booking.status}` as Parameters<typeof t>[0])}
      </span>
    </div>
  );
}
