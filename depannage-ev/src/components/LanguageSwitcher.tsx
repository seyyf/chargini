"use client";

import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
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
        aria-label="Langue : Français"
        className="inline-flex items-center gap-1 rounded-lg border border-brand-100 bg-white/60 px-2.5 py-1.5 text-xs font-semibold text-brand-700"
      >
        <Globe className="h-3.5 w-3.5" />
        {LABELS[locale] ?? locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-brand-100 bg-white/60 p-0.5">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            l === locale
              ? "bg-ink text-white"
              : "text-ink-soft hover:text-brand-700"
          }`}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
