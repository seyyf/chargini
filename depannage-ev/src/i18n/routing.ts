import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Arabic ("ar") will be added in phase 2.
  locales: ["fr"],
  defaultLocale: "fr",
});
