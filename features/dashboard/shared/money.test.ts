import { describe, expect, it } from "vitest";

import { formatMoney, formatReferenceCurrency, safeNumber } from "./money";

describe("money utilities", () => {
  it.each([
    [1250, 1250],
    ["1,250.50", 1250.5],
    ["invalid", 0],
    [Number.POSITIVE_INFINITY, 0],
    [null, 0],
  ])("normalizes %j", (value, expected) => {
    expect(safeNumber(value)).toBe(expected);
  });

  it("formats prefix and reference suffix currencies consistently", () => {
    expect(formatMoney("1200.5")).toBe("EGP 1,200.50");
    expect(formatMoney(12, "")).toBe("EGP 12.00");
    expect(formatReferenceCurrency(1200.5)).toBe("1,200.50 EGP");
    expect(formatReferenceCurrency(12, "LYD")).toBe("12.00 LYD");
  });
});
