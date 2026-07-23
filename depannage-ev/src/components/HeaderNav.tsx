"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, LogOut, LayoutDashboard, Zap } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./notifications/NotificationBell";
import { signOutAction } from "@/app/actions/auth";

export function HeaderNav({ isAuthed }: { isAuthed: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { href: "/explore", label: t("explore") },
    { href: "/host/new", label: t("becomeHost") },
  ] as const;

  return (
    <motion.header
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 px-4 pt-4"
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5 ${
          scrolled
            ? "glass shadow-lg shadow-brand-900/5"
            : "border border-transparent bg-white/40 backdrop-blur-sm"
        }`}
      >
        <Logo />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right cluster */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthed && <NotificationBell />}
          <LanguageSwitcher />
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t("dashboard")}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {t("login")}
              </Link>
              <Link
                href="/explore"
                className="group inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25"
              >
                <Zap className="h-4 w-4 text-brand-300 transition-transform group-hover:scale-110" />
                {t("explore")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: bell + menu toggle */}
        <div className="flex items-center gap-1 md:hidden">
          {isAuthed && <NotificationBell />}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-ink transition-colors hover:bg-brand-50"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="glass mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl p-3 shadow-lg shadow-brand-900/5 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-3 text-base font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-brand-100" />
              {isAuthed ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    {t("dashboard")}
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      {t("logout")}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/explore"
                    className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-base font-semibold text-white"
                  >
                    <Zap className="h-5 w-5 text-brand-300" />
                    {t("explore")}
                  </Link>
                </>
              )}
              <div className="mt-2 flex justify-end px-1">
                <LanguageSwitcher />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
