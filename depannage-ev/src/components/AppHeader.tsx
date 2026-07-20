import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";

export async function AppHeader() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-emerald-700">
                {t("nav.dashboard")}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="hover:text-emerald-700"
                >
                  {t("nav.logout")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth" className="hover:text-emerald-700">
              {t("nav.login")}
            </Link>
          )}
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
