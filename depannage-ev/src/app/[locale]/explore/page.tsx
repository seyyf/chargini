import { getTranslations } from "next-intl/server";
import { getActiveChargers } from "@/lib/chargers/queries";
import { ExploreClient } from "@/components/explore/ExploreClient";

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await params per Next.js 16 convention
  await params;

  const [t, chargers] = await Promise.all([
    getTranslations("explore"),
    getActiveChargers(),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft sm:text-base">{t("subtitle")}</p>
      <ExploreClient chargers={chargers} />
    </section>
  );
}
