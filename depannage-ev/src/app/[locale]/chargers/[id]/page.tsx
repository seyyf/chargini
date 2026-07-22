import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, Zap } from "lucide-react";
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
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-brand-50 shadow-sm">
            <Zap className="h-20 w-20 text-brand-500" aria-hidden="true" />
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
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {charger.title}
        </h1>
        <p className="mt-1 text-ink-soft">
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
            <h2 className="mb-4 font-display text-xl font-semibold text-ink">
              {t("specs")}
            </h2>
            <dl className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white shadow-sm">
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-ink-soft">{t("connector")}</dt>
                <dd className="text-sm font-semibold text-ink">
                  {CONNECTOR_LABELS[charger.connector_type]}
                </dd>
              </div>
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-ink-soft">{t("power")}</dt>
                <dd className="text-sm font-semibold text-ink">
                  {formatPower(charger.power_kw)}
                </dd>
              </div>
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-ink-soft">{t("price")}</dt>
                <dd className="text-sm font-semibold text-ink">
                  {formatPrice(charger.price_amount, charger.price_unit)}
                </dd>
              </div>
              <div className="flex items-start justify-between px-5 py-3.5">
                <dt className="text-sm font-medium text-ink-soft">{t("location")}</dt>
                <dd className="text-right text-sm font-semibold text-ink">
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
