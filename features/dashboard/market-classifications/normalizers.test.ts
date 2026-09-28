import { describe, expect, it } from "vitest";

import {
  marketClassificationList,
  normalizeMarketClassification,
} from "./normalizers";

describe("market classification normalizers", () => {
  it("normalizes supported fields and defaults an unknown type", () => {
    expect(
      normalizeMarketClassification({
        id: "7",
        name: " مطاعم ",
        description: " محلات الطعام ",
        image: " /classification.png ",
        classification_type: "unexpected",
        is_active: false,
      }),
    ).toEqual({
      id: 7,
      name: "مطاعم",
      description: "محلات الطعام",
      image: "/classification.png",
      classification_type: "normal",
      is_active: false,
      deletionMode: null,
    });
  });

  it("shows destructive actions only for an explicit backend mode", () => {
    expect(normalizeMarketClassification({ id: 1, name: "الحيوانات", deletion_mode: "archive" })?.deletionMode).toBe("archive");
    expect(normalizeMarketClassification({ id: 2, name: "جديدة", deletion_mode: "delete" })?.deletionMode).toBe("delete");
    expect(normalizeMarketClassification({ id: 3, name: "غير معروفة" })?.deletionMode).toBeNull();
  });

  it("rejects incomplete records", () => {
    expect(normalizeMarketClassification({ id: 1, name: " " })).toBeNull();
    expect(normalizeMarketClassification({ name: "مطاعم" })).toBeNull();
  });

  it("accepts direct and paginated API lists", () => {
    const items = [{ id: 1 }];
    expect(marketClassificationList(items)).toBe(items);
    expect(marketClassificationList({ results: items })).toBe(items);
    expect(marketClassificationList({ data: items })).toEqual([]);
  });
});
