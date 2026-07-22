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
          ? "cursor-pointer rounded-xl border border-brand-200 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
          : "cursor-pointer rounded-xl border border-charge-500/30 px-3 py-1.5 text-xs font-medium text-charge-600 transition-colors hover:bg-charge-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {active ? t("dashboard.deactivate") : t("dashboard.activate")}
    </button>
  );
}
