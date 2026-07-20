import "./globals.css";

// Global fallback for paths with no locale prefix. The root layout is a
// pass-through (no <html>/<body>), so this page must provide them itself.
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <section className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-6xl font-bold text-emerald-600">404</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Page introuvable
          </h1>
          <p className="mt-3 text-slate-600">
            Cette page n&apos;existe pas ou n&apos;est pas encore disponible.
          </p>
          <a
            href="/fr"
            className="mt-8 inline-block rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
          >
            Retour à l&apos;accueil
          </a>
        </section>
      </body>
    </html>
  );
}
