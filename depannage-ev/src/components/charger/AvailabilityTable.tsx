import { getTranslations } from "next-intl/server";
import type { AvailabilityRule } from "@/types/database";

type AvailabilityTableProps = {
  availability: AvailabilityRule[];
};

/** Trims seconds from "HH:MM:SS" → "HH:MM". */
function trimSeconds(time: string): string {
  return time.slice(0, 5);
}

export async function AvailabilityTable({ availability }: AvailabilityTableProps) {
  const t = await getTranslations();

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-slate-900">
        {t("charger.availability")}
      </h2>

      {availability.length === 0 ? (
        <p className="text-sm text-slate-500">{t("charger.noAvailability")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {(() => {
                // Group rules by day_of_week (0–6), preserving order
                const byDay = new Map<number, AvailabilityRule[]>();
                for (const rule of availability) {
                  const existing = byDay.get(rule.day_of_week) ?? [];
                  byDay.set(rule.day_of_week, [...existing, rule]);
                }

                return Array.from(byDay.entries()).map(([day, rules]) => (
                  <tr key={day} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700 w-32">
                      {t(`days.${day}` as Parameters<typeof t>[0])}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {rules
                        .map(
                          (r) =>
                            `${trimSeconds(r.start_time)} – ${trimSeconds(r.end_time)}`,
                        )
                        .join(", ")}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
