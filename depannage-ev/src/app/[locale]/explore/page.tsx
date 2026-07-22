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
    <section className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        {t("title")}
      </h1>
      <ExploreClient chargers={chargers} />
    </section>
  );
}
