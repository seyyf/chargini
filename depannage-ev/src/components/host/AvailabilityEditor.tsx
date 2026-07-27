"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

export interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityEditorProps {
  value: AvailabilityRow[];
  onChange: (rows: AvailabilityRow[]) => void;
}

const DEFAULT_ROW: AvailabilityRow = {
  day_of_week: 1,
  start_time: "08:00",
  end_time: "20:00",
};

const DAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export function AvailabilityEditor({ value, onChange }: AvailabilityEditorProps) {
  const t = useTranslations();

  function addRow() {
    onChange([...value, { ...DEFAULT_ROW }]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<AvailabilityRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      {value.map((row, i) => (
        <div
          key={i}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 bg-surface/60 px-3 py-2"
        >
          {/* Day selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-soft">
              {t("host.day")}
            </label>
            <select
              value={row.day_of_week}
              onChange={(e) =>
                updateRow(i, { day_of_week: Number(e.target.value) })
              }
              className="rounded-lg border border-brand-100 bg-white px-2 py-1 text-sm text-ink transition-colors focus:border-brand-400 focus:outline-none"
            >
              {DAY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`days.${k}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Start time */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-soft">
              {t("host.startTime")}
            </label>
            <input
              type="time"
              value={row.start_time}
              onChange={(e) => updateRow(i, { start_time: e.target.value })}
              className="rounded-lg border border-brand-100 bg-white px-2 py-1 text-sm text-ink transition-colors focus:border-brand-400 focus:outline-none"
            />
          </div>

          {/* End time */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-soft">
              {t("host.endTime")}
            </label>
            <input
              type="time"
              value={row.end_time}
              onChange={(e) => updateRow(i, { end_time: e.target.value })}
              className="rounded-lg border border-brand-100 bg-white px-2 py-1 text-sm text-ink transition-colors focus:border-brand-400 focus:outline-none"
            />
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="ml-auto inline-flex cursor-pointer items-center gap-1 self-end rounded-lg px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            {t("host.remove")}
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
      >
        <Plus className="h-4 w-4" />
        {t("host.addAvailability")}
      </button>
    </div>
  );
}
