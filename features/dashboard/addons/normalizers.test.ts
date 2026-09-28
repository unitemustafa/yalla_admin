import { describe, expect, it } from "vitest";

import { addonCategoryFromApi } from "./normalizers";

describe("addition classification actions", () => {
  it("reads the number of linked additions before showing deletion", () => {
    expect(addonCategoryFromApi({ id: 1, name: "إضافات", addition_count: 2 })?.additionCount).toBe(2);
    expect(addonCategoryFromApi({ id: 2, name: "جديدة", addition_count: 0 })?.additionCount).toBe(0);
    expect(addonCategoryFromApi({ id: 3, name: "غير معروفة" })?.additionCount).toBeNull();
  });
});
