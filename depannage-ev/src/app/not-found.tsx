import "./globals.css";

// Global fallback for paths with no locale prefix. The root layout is a
// pass-through (no <html>/<body>), so this page must provide them itself.
// It sits outside the locale segment, so it cannot use the i18n Link
// component or next-intl translations — plain <a href> and hard-coded
// French copy only.
export default function GlobalNotFound() {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-surface text-ink antialiased">
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mesh">
          <div className="relative mx-auto max-w-2xl px-6 py-24 text-center">
            <p className="font-display text-8xl font-bold leading-none text-gradient">
              404
            </p>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
              Page introuvable
            </h1>
            <p className="mt-3 text-ink-soft">
              Cette page n&apos;existe pas ou n&apos;est pas encore disponible.
            </p>
            <a
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25"
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </section>
      </body>
    </html>
  );
}
