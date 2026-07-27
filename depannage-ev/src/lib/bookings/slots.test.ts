import { describe, it, expect } from "vitest";
import {
  busyRangesForDay,
  filterStartSlots,
  filterEndSlots,
} from "./slots";

// Busy 10:00–12:00
const BUSY = [{ startMin: 600, endMin: 720 }];

describe("filterStartSlots", () => {
  it("removes starts inside a busy range, keeps the boundary end", () => {
    const slots = ["09:00", "10:00", "11:00", "11:30", "12:00", "13:00"];
    expect(filterStartSlots(slots, BUSY)).toEqual(["09:00", "12:00", "13:00"]);
  });

  it("keeps everything when nothing is booked", () => {
    expect(filterStartSlots(["09:00", "10:00"], [])).toEqual(["09:00", "10:00"]);
  });
});

describe("filterEndSlots", () => {
  it("allows ending exactly at a busy range start, but not past it", () => {
    const slots = ["09:30", "10:00", "10:30", "11:00", "12:30"];
    expect(filterEndSlots(slots, "09:00", BUSY)).toEqual(["09:30", "10:00"]);
  });

  it("does not constrain ends after the busy range when starting after it", () => {
    const slots = ["12:30", "13:00"];
    expect(filterEndSlots(slots, "12:00", BUSY)).toEqual(["12:30", "13:00"]);
  });

  it("returns slots unchanged when no start selected", () => {
    expect(filterEndSlots(["10:30"], "", BUSY)).toEqual(["10:30"]);
  });
});

describe("busyRangesForDay", () => {
  const dayStart = new Date("2026-08-01T00:00:00");

  it("converts ISO ranges to minute offsets within the day", () => {
    const iso = (h: number) =>
      new Date(dayStart.getTime() + h * 3_600_000).toISOString();
    const out = busyRangesForDay([{ start: iso(10), end: iso(12) }], dayStart);
    expect(out).toEqual([{ startMin: 600, endMin: 720 }]);
  });

  it("clamps ranges that spill outside the day and drops invalid ones", () => {
    const iso = (h: number) =>
      new Date(dayStart.getTime() + h * 3_600_000).toISOString();
    // Starts the day before, ends 01:00.
    expect(busyRangesForDay([{ start: iso(-2), end: iso(1) }], dayStart)).toEqual([
      { startMin: 0, endMin: 60 },
    ]);
    // Entirely on another day → dropped.
    expect(busyRangesForDay([{ start: iso(30), end: iso(32) }], dayStart)).toEqual(
      [],
    );
  });
});
