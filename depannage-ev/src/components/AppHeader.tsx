import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AppHeader() {
  const t = useTranslations();
  return (
    <header className="border-b border-slate-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          {t("app.name")}
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/explore" className="hover:text-emerald-700">
            {t("nav.explore")}
          </Link>
          <Link href="/host/new" className="hover:text-emerald-700">
            {t("nav.becomeHost")}
          </Link>
          <Link href="/auth" className="hover:text-emerald-700">
            {t("nav.login")}
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
