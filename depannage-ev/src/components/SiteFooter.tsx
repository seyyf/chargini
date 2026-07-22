import { getTranslations } from "next-intl/server";
import { MapPin, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./Logo";

export async function SiteFooter() {
  const [t, tApp] = await Promise.all([
    getTranslations("footer"),
    getTranslations("app"),
  ]);

  return (
    <footer className="relative mt-24 overflow-hidden bg-mesh-dark text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <span className="font-display text-xl font-bold text-white">
              Charg<span className="text-gradient-bright">ini</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            {t("tagline")}
          </p>
          <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
            <MapPin className="h-3.5 w-3.5 text-brand-300" />
            {t("madeIn")}
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            {t("product")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link href="/explore" className="transition-colors hover:text-brand-300">
                {t("explore")}
              </Link>
            </li>
            <li>
              <Link href="/host/new" className="transition-colors hover:text-brand-300">
                {t("becomeHost")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            {t("resources")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <span className="cursor-default text-white/50">{t("about")}</span>
            </li>
            <li>
              <span className="cursor-default text-white/50">{t("contact")}</span>
            </li>
            <li>
              <span className="cursor-default text-white/50">{t("legal")}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {tApp("name")}. {t("rights")}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-brand-300" />
            {t("madeIn")}
          </p>
        </div>
      </div>
    </footer>
  );
}
