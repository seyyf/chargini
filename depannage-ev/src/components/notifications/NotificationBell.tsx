"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, Check, X, CalendarClock, CircleCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { NotificationType } from "@/types/database";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type NotificationsData,
} from "@/app/actions/notifications";

const POLL_MS = 20_000;

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  booking_requested: CalendarClock,
  booking_confirmed: Check,
  booking_cancelled: X,
  booking_completed: CircleCheck,
};

const TYPE_TONE: Record<NotificationType, string> = {
  booking_requested: "bg-brand-100 text-brand-700",
  booking_confirmed: "bg-charge-500/10 text-charge-600",
  booking_cancelled: "bg-red-100 text-red-600",
  booking_completed: "bg-brand-100 text-brand-700",
};

function useTimeAgo() {
  const t = useTranslations("notifications.time");
  return (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return t("now");
    if (mins < 60) return t("minutes", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("hours", { n: hrs });
    return t("days", { n: Math.floor(hrs / 24) });
  };
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const timeAgo = useTimeAgo();
  const reduce = useReducedMotion();
  const [data, setData] = useState<NotificationsData>({ count: 0, items: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await fetchNotifications());
    } catch {
      /* transient network error — keep last known state */
    }
  }, []);

  // Initial load + light polling + refresh on tab focus.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    // Opening marks everything read (optimistically, then persisted).
    if (next && data.count > 0) {
      setData((d) => ({
        count: 0,
        items: d.items.map((i) => ({ ...i, isRead: true })),
      }));
      await markAllNotificationsRead();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={t("aria")}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        <Bell className="h-5 w-5" />
        {data.count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-surface">
            {data.count > 9 ? "9+" : data.count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-xl shadow-brand-900/10"
          >
            <div className="border-b border-brand-100 px-4 py-3">
              <p className="font-display text-sm font-semibold text-ink">
                {t("title")}
              </p>
            </div>

            {data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">
                {t("empty")}
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-brand-100 overflow-y-auto">
                {data.items.map((n) => {
                  const Icon = TYPE_ICON[n.type];
                  const inner = (
                    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-brand-50">
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TYPE_TONE[n.type]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {t(`types.${n.type}` as Parameters<typeof t>[0])}
                        </p>
                        {n.chargerTitle && (
                          <p className="truncate text-xs text-ink-soft">
                            {n.chargerTitle}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.bookingId ? (
                        <Link
                          href={`/bookings/${n.bookingId}`}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
