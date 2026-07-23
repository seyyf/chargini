import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ChevronLeft,
  MapPin,
  Plug,
  Gauge,
  Wallet,
  Star,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getChargerDetail } from "@/lib/chargers/queries";
import { CONNECTOR_LABELS, formatPrice, formatPower } from "@/lib/chargers/format";
import { ChargerGallery } from "@/components/charger/ChargerGallery";
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

  const priceLabel = formatPrice(charger.price_amount, charger.price_unit);
  const reviewCount = charger.reviews.length;
  const reviewAvg =
    reviewCount > 0
      ? charger.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : 0;

  const specs = [
    { icon: Plug, label: t("connector"), value: CONNECTOR_LABELS[charger.connector_type] },
    { icon: Gauge, label: t("power"), value: formatPower(charger.power_kw) },
    { icon: Wallet, label: t("price"), value: priceLabel },
    { icon: MapPin, label: t("location"), value: charger.city },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12">
      {/* Back link */}
      <Link
        href="/explore"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToExplore")}
      </Link>

      <ChargerGallery photos={charger.photos ?? []} title={charger.title} />

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        {/* Main column */}
        <div className="space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {charger.title}
                </h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-ink-soft">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="truncate">
                    {charger.city}
                    {charger.address ? ` — ${charger.address}` : ""}
                  </span>
                </p>
              </div>
              <div className="shrink-0 rounded-2xl border border-brand-100 bg-white px-4 py-2 text-right shadow-sm">
                <p className="font-display text-xl font-bold text-brand-700">
                  {priceLabel}
                </p>
              </div>
            </div>

            {/* Badge row */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                <Plug className="h-4 w-4 text-brand-600" />
                {CONNECTOR_LABELS[charger.connector_type]}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-charge-500/10 px-3 py-1.5 text-sm font-medium text-charge-600">
                <Gauge className="h-4 w-4" />
                {formatPower(charger.power_kw)}
              </span>
              {reviewCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {reviewAvg.toFixed(1)} ({reviewCount})
                </span>
              )}
              {charger.host.is_verified && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  {t("hostVerified")}
                </span>
              )}
            </div>
          </div>

          {/* Spec cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-xs font-medium text-ink-faint">
                  {s.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {charger.description && (
            <div>
              <h2 className="mb-3 font-display text-xl font-semibold text-ink">
                {t("aboutTitle")}
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-ink-soft">
                {charger.description}
              </p>
            </div>
          )}

          <ReviewList reviews={charger.reviews} />
          <AvailabilityTable availability={charger.availability} />
        </div>

        {/* Sidebar (sticky on desktop) */}
        <aside className="mt-8 space-y-4 lg:mt-0 lg:self-start lg:sticky lg:top-24">
          <HostCard host={charger.host} />
          <div id="booking" className="scroll-mt-24">
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
        </aside>
      </div>

      {/* Mobile sticky reserve bar */}
      {viewer !== "host" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-brand-700">
                {priceLabel}
              </p>
            </div>
            <a
              href="#booking"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700"
            >
              {t("book")}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
