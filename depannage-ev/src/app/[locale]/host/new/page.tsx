import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/host/ListingForm";

export default async function HostNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/auth", locale });
  }

  const t = await getTranslations("host");

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {t("newTitle")}
      </h1>
      <p className="mt-2 text-slate-600">{t("intro")}</p>
      <div className="mt-8">
        <ListingForm mode="new" />
      </div>
    </section>
  );
}
