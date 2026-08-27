import { describe, expect, it } from "vitest";

import {
  apiRecordList,
  deliveryDetails,
  localizedApiError,
  representativeAvailability,
  representativeListFromApprove,
} from "./domain";

describe("order review normalizers", () => {
  it("reads supported list envelopes", () => {
    expect(apiRecordList({ data: { results: [{ id: 1 }, null] } })).toEqual([{ id: 1 }]);
  });

  it("distinguishes an absent approve representative list from an empty one", () => {
    expect(representativeListFromApprove({})).toEqual({ present: false, representatives: [] });
    expect(representativeListFromApprove({ available_representatives: [] }))
      .toEqual({ present: true, representatives: [] });
  });

  it("normalizes representative availability", () => {
    expect(representativeAvailability({ is_available: "true" })).toEqual({ label: "متاح", tone: "green" });
    expect(representativeAvailability({ is_available: false })).toEqual({ label: "غير متاح", tone: "red" });
  });

  it("derives manual delivery details for general orders", () => {
    expect(deliveryDetails({ order_scope: "general", delivery_address: { manual_city: "طرابلس", manual_area: "الأندلس" } }))
      .toMatchObject({ type: "دليفري يدوي", city: "طرابلس", area: "الأندلس", price: "يحدد لاحقاً" });
  });

  it("localizes assignment errors", () => {
    expect(localizedApiError({ detail: "Representative must be approved before assignment" }, "fallback"))
      .toBe("يجب قبول الطلب قبل إسناده للطيار.");
  });
});
