import { getRequestConfig } from "next-intl/server";

// Single-locale app (French) without i18n routing — the locale is fixed, so
// there is no [locale] URL segment and no locale-routing middleware.
// A future second locale would reintroduce next-intl routing.
export default getRequestConfig(async () => {
  const locale = "fr";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
