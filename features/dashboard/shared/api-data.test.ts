import { describe, expect, it } from "vitest";

import { apiListData, asRecord, firstApiError } from "./api-data";

describe("API response normalizers", () => {
  it.each([
    [[1, 2], [1, 2]],
    [{ results: [1, 2] }, [1, 2]],
    [{ data: [1, 2] }, [1, 2]],
    [{ data: { results: [1, 2] } }, [1, 2]],
    [{ data: { results: "invalid" } }, []],
    [null, []],
  ])("normalizes supported list envelopes", (input, expected) => {
    expect(apiListData(input)).toEqual(expected);
  });

  it("accepts records but rejects arrays and null", () => {
    expect(asRecord({ id: 1 })).toEqual({ id: 1 });
    expect(asRecord([])).toBeNull();
    expect(asRecord(null)).toBeNull();
  });

  it("finds the first nested API error", () => {
    expect(firstApiError({ errors: ["  مطلوب  ", "آخر"] })).toBe("مطلوب");
    expect(firstApiError({ errors: [null, { detail: "تعذر الحفظ" }] })).toBe(
      "تعذر الحفظ",
    );
    expect(firstApiError({ errors: [] })).toBeNull();
  });
});
