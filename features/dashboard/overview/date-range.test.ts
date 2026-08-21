import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultDateRange,
  createWeekdayLabels,
  dateRangeError,
  formatDateParam,
  getCalendarCells,
  isInRange,
  sameDate,
} from "./date-range";

afterEach(() => {
  vi.useRealTimers();
});

describe("overview date range", () => {
  it("uses the local first day of the month through today by default", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 21, 14, 45));

    const range = createDefaultDateRange();

    expect(range.from).toEqual(new Date(2026, 7, 1));
    expect(range.to).toEqual(new Date(2026, 7, 21));
  });

  it("formats local date parts without converting to UTC", () => {
    expect(formatDateParam(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
  });

  it("validates invalid and reversed ranges with the existing messages", () => {
    expect(
      dateRangeError({ from: new Date(Number.NaN), to: new Date(2026, 0, 2) }),
    ).toBe("الرجاء اختيار تاريخ صحيح");
    expect(
      dateRangeError({ from: new Date(2026, 0, 3), to: new Date(2026, 0, 2) }),
    ).toBe("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
    expect(
      dateRangeError({ from: new Date(2026, 0, 2), to: new Date(2026, 0, 2) }),
    ).toBeNull();
  });

  it("treats both range edges as inclusive and ignores time", () => {
    const range = {
      from: new Date(2026, 0, 2),
      to: new Date(2026, 0, 4),
    };

    expect(isInRange(new Date(2026, 0, 2, 23), range)).toBe(true);
    expect(isInRange(new Date(2026, 0, 4, 23), range)).toBe(true);
    expect(isInRange(new Date(2026, 0, 5), range)).toBe(false);
    expect(sameDate(new Date(2026, 0, 2, 23), range.from)).toBe(true);
  });

  it("creates full calendar weeks with leading and trailing dates", () => {
    const cells = getCalendarCells(new Date(2026, 4, 1));

    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({ date: new Date(2026, 3, 26), currentMonth: false });
    expect(cells[5]).toEqual({ date: new Date(2026, 4, 1), currentMonth: true });
    expect(cells.at(-1)).toEqual({
      date: new Date(2026, 5, 6),
      currentMonth: false,
    });
  });

  it("builds weekday labels starting on Sunday", () => {
    expect(createWeekdayLabels("en-US")).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
  });
});
