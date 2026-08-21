import { describe, expect, it } from "vitest";

import {
  addonMatchesSearch,
  addonPricePayload,
  classificationIdByName,
  translateAddonCategoryDeleteError,
  validateAddonDraft,
} from "./domain";

describe("addon domain", () => {
  const addon = {
    index: "1",
    id: "7",
    image: "/addon.png",
    name: "Cheese",
    nameAr: "جبنة",
    price: "12 EGP",
    category: "إضافات",
  };

  it("filters by Arabic and English addon fields", () => {
    expect(addonMatchesSearch(addon, "جبنة")).toBe(true);
    expect(addonMatchesSearch(addon, "cheese")).toBe(true);
    expect(addonMatchesSearch(addon, "صوص")).toBe(false);
  });

  it("validates the create form without changing accepted price formats", () => {
    expect(validateAddonDraft({ nameAr: "", category: "إضافات", price: "12" }))
      .toBe("اسم الإضافة مطلوب");
    expect(validateAddonDraft({ nameAr: "جبنة", category: "إضافات", price: "12" }))
      .toBeNull();
    expect(addonPricePayload("12 EGP")).toBe("12");
  });

  it("uses backend category identifiers with the existing fallback", () => {
    expect(classificationIdByName("مشروبات", { مشروبات: 9 }, ["مشروبات"]))
      .toBe(9);
    expect(classificationIdByName("صوص", {}, ["مشروبات", "صوص"])).toBe(2);
  });

  it("localizes the in-use classification error", () => {
    expect(
      translateAddonCategoryDeleteError(
        "Cannot delete addition classification while product additions are using it",
      ),
    ).toBe("لا يمكن حذف التصنيف لأنه مستخدم في إضافات حالية.");
  });
});
