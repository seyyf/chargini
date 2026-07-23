import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getChargerDetail } from "@/lib/chargers/queries";
import { ListingForm } from "@/components/host/ListingForm";

export default async function HostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const detail = await getChargerDetail(id);

  if (!detail) {
    notFound();
  }

  const [t, tNav] = await Promise.all([
    getTranslations("host"),
    getTranslations("nav"),
  ]);

  if (detail.host_id !== user!.id) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          {t("editTitle")}
        </h1>
        <p className="mt-4 text-ink-soft">{t("notOwner")}</p>
        <Link
          href="/explore"
          className="mt-6 inline-block rounded-xl bg-ink px-5 py-2.5 font-medium text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25"
        >
          {tNav("explore")}
        </Link>
      </section>
    );
  }

  const initial = {
    title: detail.title,
    description: detail.description,
    address: detail.address,
    city: detail.city,
    lat: detail.lat,
    lng: detail.lng,
    connectorType: detail.connector_type,
    powerKw: detail.power_kw,
    priceAmount: detail.price_amount,
    priceUnit: detail.price_unit,
    photos: detail.photos,
    availability: detail.availability.map((a) => ({
      day_of_week: a.day_of_week,
      start_time: a.start_time.slice(0, 5),
      end_time: a.end_time.slice(0, 5),
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        {t("editTitle")}
      </h1>
      <div className="mt-8">
        <ListingForm mode="edit" chargerId={id} initial={initial} />
      </div>
    </section>
  );
}
