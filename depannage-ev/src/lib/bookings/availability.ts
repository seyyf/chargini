import type { AvailabilityRule } from "@/types/database";

/**
 * Returns the day-of-week (0 = Sunday … 6 = Saturday) for a "YYYY-MM-DD"
 * string without any timezone drift by parsing the parts and using the local
 * Date constructor.
 */
export function dayOfWeekOf(dateISO: string): number {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

/**
 * Returns the availability windows for a given weekday, with times normalized
 * from "HH:MM:SS" to "HH:MM". Order is preserved.
 */
export function windowsForWeekday(
  rules: AvailabilityRule[],
  weekday: number
): Array<{ start_time: string; end_time: string }> {
  return rules
    .filter((r) => r.day_of_week === weekday)
    .map((r) => ({
      start_time: r.start_time.slice(0, 5),
      end_time: r.end_time.slice(0, 5),
    }));
}

/**
 * Returns true iff:
 *  - endHHMM > startHHMM (valid slot direction), AND
 *  - at least one availability window for the date's weekday fully contains
 *    the slot (lexicographic "HH:MM" comparison).
 *
 * Both startHHMM and endHHMM may be "HH:MM" or "HH:MM:SS"; the seconds part
 * is ignored.
 */
export function isWithinAvailability(
  rules: AvailabilityRule[],
  dateISO: string,
  startHHMM: string,
  endHHMM: string
): boolean {
  const start = startHHMM.slice(0, 5);
  const end = endHHMM.slice(0, 5);

  if (end <= start) return false;

  const weekday = dayOfWeekOf(dateISO);
  const windows = windowsForWeekday(rules, weekday);

  return windows.some((w) => start >= w.start_time && end <= w.end_time);
}

/**
 * Returns true when there is at least one availability rule defined.
 */
export function hasAnyAvailability(rules: AvailabilityRule[]): boolean {
  return rules.length > 0;
}
