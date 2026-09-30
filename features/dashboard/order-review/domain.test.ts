import { describe, expect, it } from "vitest";

import {
  apiRecordList,
  deliveryDetails,
  localizedApiError,
} from "./domain";

describe("order review normalizers", () => {
  it("reads supported list envelopes", () => {
    expect(apiRecordList({ data: { results: [{ id: 1 }, null] } })).toEqual([{ id: 1 }]);
  });

  it("derives manual delivery details for general orders", () => {
    expect(deliveryDetails({ order_scope: "general", delivery_address: { manual_city: "طرابلس", manual_area: "الأندلس" } }))
      .toMatchObject({ type: "دليفري يدوي", city: "طرابلس", area: "الأندلس", price: "يحدد لاحقاً" });
  });

  it("localizes an already reviewed order error", () => {
    expect(localizedApiError({ detail: "Order already reviewed" }, "fallback"))
      .toBe("تمت مراجعة الطلب بالفعل. حدّث التنبيه.");
  });
});
