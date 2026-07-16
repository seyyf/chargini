"use client";

import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

// Arabic will appear here automatically once added to routing.locales.
const LABELS: Record<string, string> = { fr: "FR", ar: "ع" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  if (routing.locales.length < 2) {
    return (
      <button
        type="button"
        disabled
        className="rounded px-2 py-1 text-sm font-medium text-slate-500"
      >
        {LABELS[locale] ?? locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="flex gap-1">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={`rounded px-2 py-1 text-sm font-medium ${
            l === locale ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
