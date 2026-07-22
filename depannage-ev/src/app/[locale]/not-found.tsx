import { useTranslations } from "next-intl";
import { Home, Compass } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/Logo";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");
  return (
    <section className="relative flex min-h-[calc(100vh-6rem)] items-center overflow-hidden bg-mesh">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="relative mx-auto max-w-xl px-6 py-24 text-center">
        <LogoMark className="mx-auto h-12 w-12" />
        <p className="mt-8 font-display text-8xl font-bold leading-none text-gradient">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("description")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25"
          >
            <Home className="h-4 w-4 text-brand-300" />
            {t("backHome")}
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white/70 px-5 py-3 font-semibold text-ink backdrop-blur transition-colors hover:bg-white"
          >
            <Compass className="h-4 w-4 text-brand-600" />
            Explorer les bornes
          </Link>
        </div>
      </div>
    </section>
  );
}
