import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getActiveChargers } from "@/lib/chargers/queries";
import { ChargerCard } from "@/components/explore/ChargerCard";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await params per Next.js 16 convention.
  await params;

  const [t, tApp, chargers] = await Promise.all([
    getTranslations("home"),
    getTranslations("app"),
    getActiveChargers(),
  ]);

  const featured = chargers.slice(0, 6);

  return (
    <>
      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        {/* Soft decorative blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-100 opacity-40 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          {/* Text column */}
          <div className="text-center md:text-left">
            <span className="mb-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              {tApp("name")} · Tunisie
            </span>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 text-lg text-slate-600">{t("heroSubtitle")}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
              <Link
                href="/explore"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                {t("ctaExplore")}
              </Link>
              <Link
                href="/host/new"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                {t("ctaHost")}
              </Link>
            </div>
          </div>

          {/* Hero image column */}
          <div className="flex justify-center md:justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1400&q=80&auto=format&fit=crop"
              alt="Voiture électrique branchée à une borne de recharge"
              className="w-full max-w-md rounded-2xl object-cover shadow-xl md:max-w-full"
              style={{ aspectRatio: "16/10" }}
            />
          </div>
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            {t("how.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">
            {tApp("tagline")}
          </p>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                {/* Search icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-600">
                Étape 1
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t("how.step1Title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t("how.step1Body")}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                {/* Calendar icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-600">
                Étape 2
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t("how.step2Title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t("how.step2Body")}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                {/* Bolt/star icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-600">
                Étape 3
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {t("how.step3Title")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t("how.step3Body")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURED CHARGERS ────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {t("featured")}
              </h2>
              <Link
                href="/explore"
                className="text-sm font-medium text-emerald-600 underline-offset-2 hover:underline"
              >
                {t("seeAll")} →
              </Link>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((charger) => (
                <ChargerCard key={charger.id} charger={charger} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/explore"
                className="inline-block rounded-xl border border-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
              >
                {t("seeAll")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. WHY / TRUST STRIP ────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
            {t("why.title")}
          </h2>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {/* Verified hosts */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t("why.verifiedTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t("why.verifiedBody")}
              </p>
            </div>

            {/* Easy payment */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t("why.easyTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t("why.easyBody")}
              </p>
            </div>

            {/* Transparent reviews */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t("why.reviewsTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t("why.reviewsBody")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-base font-bold text-slate-900">
                {tApp("name")}
              </p>
              <p className="mt-1 text-sm text-slate-500">{tApp("tagline")}</p>
            </div>

            <nav className="flex gap-6 text-sm font-medium text-slate-600">
              <Link
                href="/explore"
                className="hover:text-emerald-600 transition-colors"
              >
                Explorer
              </Link>
              <Link
                href="/host/new"
                className="hover:text-emerald-600 transition-colors"
              >
                Devenir hôte
              </Link>
            </nav>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {tApp("name")}. {t("footer.tagline")}
          </p>
        </div>
      </footer>
    </>
  );
}
