import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listHostChargers,
  listHostBookings,
  listDriverBookings,
} from "@/lib/bookings/queries";
import { ListingRow } from "@/components/dashboard/ListingRow";
import { BookingRow } from "@/components/dashboard/BookingRow";
import { IncomingBookingRow } from "@/components/dashboard/IncomingBookingRow";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Auth guard
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/auth", locale });
  }

  // Parallel data fetch (user is guaranteed non-null after redirect)
  const [hostChargers, hostBookings, driverBookings] = await Promise.all([
    listHostChargers(user!.id),
    listHostBookings(user!.id),
    listDriverBookings(user!.id),
  ]);

  const t = await getTranslations();

  // ── Derived values ─────────────────────────────────────────────────────────

  const isHost = hostChargers.length > 0 || hostBookings.length > 0;

  const earnings = hostBookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + b.total_price, 0);

  const earningsLabel =
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(earnings) + " TND";

  const now = new Date();
  const upcomingBookings = driverBookings.filter(
    (b) => new Date(b.end_time) >= now && b.status !== "cancelled",
  );
  const pastBookings = driverBookings.filter(
    (b) => !(new Date(b.end_time) >= now && b.status !== "cancelled"),
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="mx-auto max-w-5xl px-6 py-8 space-y-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {t("dashboard.title")}
      </h1>

      {/* ── HOST section ──────────────────────────────────────────────────── */}
      {isHost && (
        <div className="space-y-8">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {t("dashboard.hostSection")}
            </h2>
            <Link
              href="/host/new"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              {t("dashboard.addListing")}
            </Link>
          </div>

          {/* Earnings */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("dashboard.earnings")}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {earningsLabel}
            </p>
          </div>

          {/* My listings */}
          {hostChargers.length > 0 && (
            <div className="space-y-2">
              {hostChargers.map((charger) => (
                <ListingRow key={charger.id} charger={charger} />
              ))}
            </div>
          )}

          {/* Incoming bookings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("dashboard.incoming")}
            </h3>
            {hostBookings.length > 0 ? (
              <div className="space-y-2">
                {hostBookings.map((booking) => (
                  <IncomingBookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("dashboard.noIncoming")}</p>
            )}
          </div>
        </div>
      )}

      {/* ── DRIVER section ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">
          {t("dashboard.driverSection")}
        </h2>

        {/* Upcoming */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.upcoming")}
          </h3>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-2">
              {upcomingBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("dashboard.noBookings")}</p>
          )}
        </div>

        {/* Past */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.past")}
          </h3>
          {pastBookings.length > 0 ? (
            <div className="space-y-2">
              {pastBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("dashboard.noBookings")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
