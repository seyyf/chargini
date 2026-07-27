/**
 * Pure helpers for filtering bookable time slots against existing bookings.
 * All times are minutes since local midnight of the selected day; booking
 * intervals are half-open [start, end) — matching the DB exclusion constraint,
 * so a new booking may start exactly when another ends.
 */

export interface BusyRange {
  startMin: number;
  endMin: number;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Converts booked ISO ranges into minute-ranges within the given local day,
 * clamped to [0, 1440] and dropping anything outside it.
 */
export function busyRangesForDay(
  ranges: Array<{ start: string; end: string }>,
  dayStart: Date,
): BusyRange[] {
  const base = dayStart.getTime();
  const out: BusyRange[] = [];
  for (const r of ranges) {
    const s = (new Date(r.start).getTime() - base) / 60_000;
    const e = (new Date(r.end).getTime() - base) / 60_000;
    const startMin = Math.max(0, s);
    const endMin = Math.min(1440, e);
    if (Number.isFinite(startMin) && Number.isFinite(endMin) && endMin > startMin) {
      out.push({ startMin, endMin });
    }
  }
  return out;
}

/** Start slots that don't fall inside any busy range. */
export function filterStartSlots(slots: string[], busy: BusyRange[]): string[] {
  return slots.filter((s) => {
    const t = toMinutes(s);
    return !busy.some((b) => t >= b.startMin && t < b.endMin);
  });
}

/**
 * End slots such that [start, end) doesn't overlap any busy range.
 * (Ending exactly at a busy range's start is allowed.)
 */
export function filterEndSlots(
  slots: string[],
  startHHMM: string,
  busy: BusyRange[],
): string[] {
  if (!startHHMM) return slots;
  const s = toMinutes(startHHMM);
  return slots.filter((endSlot) => {
    const e = toMinutes(endSlot);
    return !busy.some((b) => s < b.endMin && e > b.startMin);
  });
}
