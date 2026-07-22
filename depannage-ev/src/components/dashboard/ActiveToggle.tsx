"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { setChargerActive } from "@/app/actions/bookings";

interface ActiveToggleProps {
  chargerId: string;
  active: boolean;
}

export function ActiveToggle({ chargerId, active }: ActiveToggleProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await setChargerActive(chargerId, !active);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={
        active
          ? "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          : "rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      }
    >
      {active ? t("dashboard.deactivate") : t("dashboard.activate")}
    </button>
  );
}
