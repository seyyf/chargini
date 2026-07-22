import { describe, it, expect } from "vitest";
import {
  dayOfWeekOf,
  windowsForWeekday,
  isWithinAvailability,
  hasAnyAvailability,
} from "./availability";
import type { AvailabilityRule } from "@/types/database";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRule(
  day_of_week: number,
  start_time: string,
  end_time: string,
  id = "r1",
  charger_id = "c1"
): AvailabilityRule {
  return { id, charger_id, day_of_week, start_time, end_time };
}

// ---------------------------------------------------------------------------
// dayOfWeekOf
// ---------------------------------------------------------------------------

describe("dayOfWeekOf", () => {
  it('returns 1 (Monday) for "2026-07-20"', () => {
    expect(dayOfWeekOf("2026-07-20")).toBe(1);
  });

  it('returns 0 (Sunday) for "2026-07-19"', () => {
    expect(dayOfWeekOf("2026-07-19")).toBe(0);
  });

  it('returns 4 (Thursday) for "2026-01-01"', () => {
    expect(dayOfWeekOf("2026-01-01")).toBe(4);
  });

  it('returns 4 (Thursday) for leap day "2024-02-29"', () => {
    expect(dayOfWeekOf("2024-02-29")).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// windowsForWeekday
// ---------------------------------------------------------------------------

describe("windowsForWeekday", () => {
  it("returns only rules matching the requested weekday", () => {
    const rules: AvailabilityRule[] = [
      makeRule(1, "08:00:00", "12:00:00", "r1"),
      makeRule(3, "09:00:00", "17:00:00", "r2"),
      makeRule(1, "14:00:00", "18:00:00", "r3"),
    ];
    const windows = windowsForWeekday(rules, 1);
    expect(windows).toHaveLength(2);
  });

  it("returns empty array when no rules match the weekday", () => {
    const rules: AvailabilityRule[] = [makeRule(3, "09:00:00", "17:00:00")];
    expect(windowsForWeekday(rules, 1)).toHaveLength(0);
  });

  it('normalizes "HH:MM:SS" times to "HH:MM"', () => {
    const rules: AvailabilityRule[] = [makeRule(1, "08:00:00", "12:00:00")];
    const [w] = windowsForWeekday(rules, 1);
    expect(w.start_time).toBe("08:00");
    expect(w.end_time).toBe("12:00");
  });

  it("preserves original order of rules", () => {
    const rules: AvailabilityRule[] = [
      makeRule(1, "06:00:00", "10:00:00", "r1"),
      makeRule(1, "14:00:00", "18:00:00", "r2"),
    ];
    const windows = windowsForWeekday(rules, 1);
    expect(windows[0].start_time).toBe("06:00");
    expect(windows[1].start_time).toBe("14:00");
  });
});

// ---------------------------------------------------------------------------
// isWithinAvailability
// ---------------------------------------------------------------------------

describe("isWithinAvailability", () => {
  // Monday rules: 08:00–12:00, 14:00–18:00
  const mondayRules: AvailabilityRule[] = [
    makeRule(1, "08:00:00", "12:00:00", "r1"),
    makeRule(1, "14:00:00", "18:00:00", "r2"),
  ];

  // "2026-07-20" is a Monday (day 1)
  const monday = "2026-07-20";
  // "2026-07-19" is a Sunday (day 0) — no window for day 0 in mondayRules
  const sunday = "2026-07-19";

  it("returns true for a slot fully inside a window", () => {
    expect(isWithinAvailability(mondayRules, monday, "09:00", "11:00")).toBe(true);
  });

  it("returns true for a slot exactly matching window edges", () => {
    expect(isWithinAvailability(mondayRules, monday, "08:00", "12:00")).toBe(true);
  });

  it("returns false for a slot starting before the window", () => {
    expect(isWithinAvailability(mondayRules, monday, "07:30", "12:00")).toBe(false);
  });

  it("returns false for a slot ending after the window", () => {
    expect(isWithinAvailability(mondayRules, monday, "08:00", "12:30")).toBe(false);
  });

  it("returns false when end <= start (invalid slot)", () => {
    expect(isWithinAvailability(mondayRules, monday, "10:00", "10:00")).toBe(false);
  });

  it("returns false when end < start", () => {
    expect(isWithinAvailability(mondayRules, monday, "11:00", "09:00")).toBe(false);
  });

  it("returns false when the date's weekday has no matching window", () => {
    expect(isWithinAvailability(mondayRules, sunday, "09:00", "11:00")).toBe(false);
  });

  it("returns true when slot fits the second of multiple windows on the same day", () => {
    expect(isWithinAvailability(mondayRules, monday, "14:30", "17:00")).toBe(true);
  });

  it("accepts HH:MM:SS format for startHHMM and endHHMM", () => {
    expect(isWithinAvailability(mondayRules, monday, "09:00:00", "11:00:00")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasAnyAvailability
// ---------------------------------------------------------------------------

describe("hasAnyAvailability", () => {
  it("returns true when rules array is non-empty", () => {
    expect(hasAnyAvailability([makeRule(1, "08:00:00", "12:00:00")])).toBe(true);
  });

  it("returns false when rules array is empty", () => {
    expect(hasAnyAvailability([])).toBe(false);
  });
});
