"use client";

import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { Charger } from "@/types/database";
import type { ChargerFilters } from "@/lib/chargers/filter";
import { Filters } from "./Filters";

/**
 * Slide-in filter panel: a bottom sheet on mobile, a right-side sheet on
 * desktop. Wraps the existing <Filters> so the filter controls (and their
 * tests) stay unchanged.
 */
export function FilterDrawer({
  open,
  onClose,
  chargers,
  filters,
  onChange,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  chargers: Charger[];
  filters: ChargerFilters;
  onChange: (f: ChargerFilters) => void;
  resultCount: number;
}) {
  const t = useTranslations("explore");
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Scrim */}
          <motion.button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
          />

          {/* Panel: bottom sheet on mobile, right sheet on sm+ */}
          <motion.div
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-h-none sm:rounded-t-none sm:rounded-l-3xl"
            initial={reduce ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">
                {t("filters.heading")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-ink-soft transition-colors hover:bg-brand-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Filters
              chargers={chargers}
              filters={filters}
              onChange={onChange}
              embedded
            />

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full cursor-pointer rounded-xl bg-ink px-5 py-3 font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25"
            >
              {t("resultsCount", { count: resultCount })}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
