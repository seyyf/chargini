import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Arabic ("ar") will be added in phase 2.
  locales: ["fr"],
  defaultLocale: "fr",
  // Default locale (fr) has no URL prefix → clean URLs like "/explore".
  // A future non-default locale would be prefixed (e.g. "/ar/explore").
  localePrefix: "as-needed",
});
