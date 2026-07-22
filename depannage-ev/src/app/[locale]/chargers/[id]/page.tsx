import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getChargerDetail } from "@/lib/chargers/queries";
import { CONNECTOR_LABELS, formatPrice, formatPower } from "@/lib/chargers/format";
import { HostCard } from "@/components/charger/HostCard";
import { AvailabilityTable } from "@/components/charger/AvailabilityTable";
import { ReviewList } from "@/components/charger/ReviewList";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ChargerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  const charger = await getChargerDetail(id);

  if (!charger) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewer: "guest" | "host" | "driver" =
    !user ? "guest" : user.id === charger.host_id ? "host" : "driver";

  const t = await getTranslations("charger");

  const [primaryPhoto, ...otherPhotos] = charger.photos ?? [];

  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      {/* Back link */}
      <Link
        href="/explore"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 010 1.06L8.06 10l3.72 3.72a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z"
            clipRule="evenodd"
          />
        </svg>
        {t("backToExplore")}
      </Link>

      {/* Photo area */}
      <div className="mb-6">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={charger.title}
            className="aspect-video w-full rounded-xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-slate-100 shadow-sm">
            <svg
              className="h-20 w-20 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
        )}

        {/* Thumbnail strip (shown when there are additional photos) */}
        {otherPhotos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {otherPhotos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`${charger.title} — photo ${i + 2}`}
                className="h-20 w-32 flex-shrink-0 rounded-lg object-cover shadow-sm"
              />
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {charger.title}
        </h1>
        <p className="mt-1 text-slate-500">
          {charger.city}
          {charger.address ? ` — ${charger.address}` : ""}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="md:grid md:grid-cols-3 md:gap-8">
        {/* Main content (2/3) */}
        <div className="space-y-10 md:col-span-2">
          {/* Specs block */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              {t("specs")}
            </h2>
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-slate-500">{t("connector")}</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {CONNECTOR_LABELS[charger.connector_type]}
                </dd>
              </div>
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-slate-500">{t("power")}</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatPower(charger.power_kw)}
                </dd>
              </div>
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-slate-500">{t("price")}</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatPrice(charger.price_amount, charger.price_unit)}
                </dd>
              </div>
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-slate-500">{t("location")}</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">
                  {charger.address}, {charger.city}
                </dd>
              </div>
            </dl>
          </div>

          {/* Availability */}
          <AvailabilityTable availability={charger.availability} />

          {/* Reviews */}
          <ReviewList reviews={charger.reviews} />
        </div>

        {/* Sidebar (1/3) */}
        <div className="mt-10 space-y-4 md:mt-0">
          <HostCard host={charger.host} />
          <BookingWidget
            charger={{
              id: charger.id,
              title: charger.title,
              priceAmount: charger.price_amount,
              priceUnit: charger.price_unit,
              powerKw: charger.power_kw,
            }}
            availability={charger.availability}
            viewer={viewer}
          />
        </div>
      </div>
    </section>
  );
}
