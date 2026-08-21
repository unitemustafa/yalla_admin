import { describe, expect, it } from "vitest";

import {
  apiOrderData,
  orderApiError,
  representativeOptionsFromResponse,
} from "./api";

describe("order API normalizers", () => {
  it.each([
    [{ id: 7, status: "pending" }, 7],
    [{ data: { id: 8, status: "confirmed" } }, 8],
    [{ data: { order: { id: 9, status: "assigned" } } }, 9],
    [[{ id: 10, status: "delivered" }], 10],
  ])("reads supported order envelopes", (value, id) => {
    expect(apiOrderData(value)?.id).toBe(id);
  });

  it.each([null, [], {}, { id: "7", status: "pending" }])(
    "rejects malformed order data %#",
    (value) => {
      expect(apiOrderData(value)).toBeNull();
    },
  );

  it("normalizes representative identifiers, names, and phones", () => {
    expect(
      representativeOptionsFromResponse({
        representatives: [
          { representative_id: 4, name: "أحمد", phone: "01000000000" },
          { user: { id: 5, first_name: "منى", last_name: "علي" } },
          { name: "بدون معرّف" },
        ],
      }),
    ).toEqual([
      { id: "4", name: "أحمد", phone: "01000000000" },
      { id: "5", name: "منى علي", phone: null },
    ]);
  });

  it("localizes known API contract errors", () => {
    expect(orderApiError({ payment_method: ["required"] }, "تعذر الإنشاء"))
      .toBe("طريقة الدفع مطلوبة");
    expect(orderApiError({ items: ["منتج غير متاح"] }, "تعذر الإنشاء"))
      .toBe("منتج غير متاح");
    expect(orderApiError({}, "تعذر الإنشاء")).toBe("تعذر الإنشاء");
  });
});
