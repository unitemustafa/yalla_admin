import { describe, expect, it, vi } from "vitest";

import {
  currentScheduleValues,
  formatDateInputValue,
  formatLocalIsoDateTime,
  formatTimeInputValue,
} from "./schedule";

describe("offer schedule utilities", () => {
  const date = new Date(2026, 4, 24, 6, 5, 7);

  it("formats local form values", () => {
    expect(formatDateInputValue(date)).toBe("2026-05-24");
    expect(formatTimeInputValue(date)).toBe("06:05");
    expect(currentScheduleValues(date)).toEqual({
      date: "2026-05-24",
      time: "06:05",
    });
  });

  it("creates an ISO value with the local offset and same instant", () => {
    const value = formatLocalIsoDateTime(date);
    expect(value).toMatch(/^2026-05-24T06:05:07[+-]\d{2}:\d{2}$/);
    expect(new Date(value).getTime()).toBe(date.getTime());
  });

  it.each([
    [-120, "+02:00"],
    [300, "-05:00"],
  ])("formats timezone offset %s", (offset, suffix) => {
    vi.spyOn(date, "getTimezoneOffset").mockReturnValue(offset);
    expect(formatLocalIsoDateTime(date).endsWith(suffix)).toBe(true);
    vi.restoreAllMocks();
  });
});
