import { getTranslations } from "next-intl/server";
import { Search, CalendarCheck, Zap, ShieldCheck, HeartHandshake, MapPin, Star, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getActiveChargers } from "@/lib/chargers/queries";
import { ChargerCard } from "@/components/explore/ChargerCard";
import { Reveal } from "@/components/Reveal";
import { HeroArt } from "@/components/home/HeroArt";

export default async function HomePage() {
  const [t, chargers] = await Promise.all([
    getTranslations("home"),
    getActiveChargers(),
  ]);

  const featured = chargers.slice(0, 6);
  const cities = [...new Set(chargers.map((c) => c.city))];
  const hosts = new Set(chargers.map((c) => c.host_id)).size;

  const stats = [
    { value: chargers.length, label: t("stats.chargersLabel") },
    { value: cities.length, label: t("stats.citiesLabel") },
    { value: hosts, label: t("stats.hostsLabel") },
  ];

  const steps = [
    { icon: Search, title: t("how.step1Title"), body: t("how.step1Body") },
    { icon: CalendarCheck, title: t("how.step2Title"), body: t("how.step2Body") },
    { icon: Zap, title: t("how.step3Title"), body: t("how.step3Body") },
  ];

  const reasons = [
    { icon: ShieldCheck, title: t("why.verifiedTitle"), body: t("why.verifiedBody") },
    { icon: HeartHandshake, title: t("why.easyTitle"), body: t("why.easyBody") },
    { icon: Star, title: t("why.reviewsTitle"), body: t("why.reviewsBody") },
  ];

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-mesh">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-24 pt-16 md:grid-cols-2 md:pt-24">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-charge-500" />
              {t("badge")}
            </span>

            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
              {t("heroA")}{" "}
              <span className="text-gradient">{t("heroB")}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-soft md:mx-0">
              {t("heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link
                href="/explore"
                className="group inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-900/10 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/25"
              >
                <Zap className="h-5 w-5 text-brand-300 transition-transform group-hover:scale-110" />
                {t("ctaExplore")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/host/new"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white/70 px-6 py-3.5 text-base font-semibold text-ink backdrop-blur transition-all hover:border-brand-300 hover:bg-white"
              >
                {t("ctaHost")}
              </Link>
            </div>

            <p className="mt-5 text-sm text-ink-faint">{t("trustNote")}</p>
          </div>

          <Reveal className="md:pl-6">
            <HeroArt />
          </Reveal>
        </div>

        {/* Stats strip */}
        <div className="relative mx-auto max-w-5xl px-6 pb-16">
          <div className="glass grid grid-cols-3 gap-4 rounded-2xl px-6 py-6 shadow-lg shadow-brand-900/5">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-medium text-ink-soft sm:text-sm">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("how.title")}
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div className="group relative h-full rounded-2xl border border-brand-100 bg-white p-7 transition-all hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                <span className="absolute right-6 top-6 font-display text-5xl font-bold text-brand-50">
                  {i + 1}
                </span>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-charge-500 text-white shadow-lg shadow-brand-600/25">
                  <step.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FEATURED CHARGERS ────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="bg-white/60 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  {t("featured")}
                </h2>
              </div>
              <Link
                href="/explore"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {t("seeAll")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((charger, i) => (
                <Reveal key={charger.id} delay={(i % 3) * 0.08}>
                  <ChargerCard charger={charger} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHY / TRUST ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("why.title")}
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {reasons.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-brand-100 bg-gradient-to-b from-white to-brand-50/40 p-7">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <r.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink">
                  {r.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {r.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Cities — calm static row */}
        {cities.length > 0 && (
          <div className="mt-16 rounded-2xl border border-brand-100 bg-white px-6 py-5">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 text-sm font-medium text-ink-faint">
                {t("citiesTitle")}
              </span>
              {cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-800"
                >
                  <MapPin className="h-3.5 w-3.5 text-charge-500" />
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── HOST CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-mesh-dark px-8 py-14 text-center shadow-2xl shadow-brand-900/20 md:px-16 md:py-20">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-brand-300 ring-1 ring-white/15">
                <Zap className="h-7 w-7" />
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("hostCta.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
                {t("hostCta.subtitle")}
              </p>
              <Link
                href="/host/new"
                className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-ink shadow-lg transition-all hover:bg-brand-50 hover:shadow-xl"
              >
                {t("hostCta.button")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
