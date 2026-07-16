import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("home");
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("heroTitle")}</h1>
      <p className="mt-4 text-lg text-slate-600">{t("heroSubtitle")}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/explore"
          className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
        >
          {t("ctaExplore")}
        </Link>
        <Link
          href="/host/new"
          className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50"
        >
          {t("ctaHost")}
        </Link>
      </div>
    </section>
  );
}
