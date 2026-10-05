import { describe, expect, it } from "vitest";
import { initialOfferFormState } from "./form-state";
import { offerFormPatchFromApi } from "./form-normalizers";
import { countdownUnits, offerPreviewMeta } from "./offer-preview-elements";

describe("offer preview contract", () => {
  it("restores saved focus and centers invalid or legacy data", () => {
    expect(offerFormPatchFromApi({ image_focus: { x: 0.2, y: 0.8 } }).imageFocus).toEqual({ x: 0.2, y: 0.8 });
    for (const value of [undefined, null, {}, { x: true, y: 0.5 }, { x: NaN, y: 1 }]) {
      expect(offerFormPatchFromApi({ image_focus: value }).imageFocus).toEqual({ x: 0.5, y: 0.5 });
    }
  });
  it("matches app badge labels, colors and external CTA behavior", () => {
    const state = initialOfferFormState();
    expect(offerPreviewMeta({ ...state, selectedType: "فلاش" })).toMatchObject({ badge: "عرض سريع - خصم 30%", color: "#F59E0B", cta: "اشتري الآن" });
    expect(offerPreviewMeta({ ...state, selectedType: "توصيل" })).toMatchObject({ badge: "توصيل", color: "#013C7E" });
    expect(offerPreviewMeta({ ...state, selectedType: "إعلان", announcementUrl: "https://example.com", announcementCtaLabel: " " })).toMatchObject({ badge: "إعلان", cta: "فتح الإعلان" });
  });
  it("calculates actual remaining time and stops at zero", () => {
    expect(countdownUnits(90061000, 0)).toEqual([1, 1, 1, 1]);
    expect(countdownUnits(1000, 2000)).toEqual([0, 0, 0, 0]);
  });
});
