"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function BookingCta() {
  const t = useTranslations("charger");
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setShowComingSoon(true)}
        disabled={showComingSoon}
        className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
      >
        {t("book")}
      </button>

      {showComingSoon && (
        <p className="mt-3 text-center text-sm text-slate-500">
          {t("bookingComingSoon")}
        </p>
      )}
    </div>
  );
}
