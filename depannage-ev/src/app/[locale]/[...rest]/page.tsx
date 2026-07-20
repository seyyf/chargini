import { notFound } from "next/navigation";

// Any path under a locale that matches no real page (e.g. /fr/explore before it
// exists) lands here and renders the locale not-found page — which lives inside
// the [locale] layout, so it has the <html>/<body> the root layout omits.
export default function CatchAllPage() {
  notFound();
}
