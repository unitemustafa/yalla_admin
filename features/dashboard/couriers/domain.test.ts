import { describe, expect, it } from "vitest";

import {
  courierPayload,
  emptyCourierDraft,
  draftFromCourier,
  filterCouriers,
  isAssignmentEligible,
  isReassignmentEligible,
  normalizeCourierDraftField,
  orderServiceCityId,
  validateCourierDraft,
} from "./domain";
import type { AdminOrder } from "./types";

const validDraft = {
  ...emptyCourierDraft,
  firstName: "أحمد",
  username: "ahmed_driver",
  email: "driver@example.com",
  phone: "01012345678",
  password: "Password1!",
  vehicleType: "دراجة",
  plateNumber: "1234",
  serviceCity: "7",
  maxActiveOrders: "2",
};

function order(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 12,
    status: "confirmed",
    review_status: "approved",
    total_price: "20.00",
    ...overrides,
  };
}

describe("courier domain", () => {
  it("validates account and delivery data without React", () => {
    expect(validateCourierDraft(validDraft, false)).toEqual({});
    expect(validateCourierDraft({ ...validDraft, maxActiveOrders: "0" }, false)).toHaveProperty("maxActiveOrders");
    expect(validateCourierDraft({ ...validDraft, password: "" }, true)).toEqual({});
  });

  it("normalizes draft inputs and builds the existing payload", () => {
    expect(normalizeCourierDraftField("phone", "010 123-45678abc")).toBe("01012345678");
    expect(courierPayload(validDraft, null)).toMatchObject({
      username: "ahmed_driver",
      email: "driver@example.com",
      role: "representative",
      courier_profile: {
        service_city: 7,
        max_active_orders: 2,
        is_available: true,
      },
    });
  });

  it("leaves capacity optional and sends null for unlimited orders", () => {
    const unlimited = { ...validDraft, maxActiveOrders: "" };
    expect(validateCourierDraft(unlimited, false)).toEqual({});
    expect(courierPayload(unlimited, null)).toMatchObject({ courier_profile: { max_active_orders: null } });
    expect(draftFromCourier({ id: 1, courier_profile: { max_active_orders: null } }, []).maxActiveOrders).toBe("");
    for (const value of ["0", "-1", "1.5", "Infinity", "32768"]) {
      expect(validateCourierDraft({ ...validDraft, maxActiveOrders: value }, false)).toHaveProperty("maxActiveOrders");
    }
  });

  it("includes shipping company accounts in every city filter", () => {
    const couriers = [
      { id: 1, courier_profile: { service_city: 7 } },
      { id: 2, courier_profile: { service_city: 8 } },
      { id: 3, courier_profile: { service_city: null, is_shipping_company: true } },
    ];
    expect(filterCouriers(couriers, "7", "").map((courier) => courier.id)).toEqual([1, 3]);
    expect(filterCouriers(couriers, "8", "").map((courier) => courier.id)).toEqual([2, 3]);
  });

  it("keeps assignment and reassignment eligibility rules explicit", () => {
    expect(isAssignmentEligible(order())).toBe(true);
    expect(isAssignmentEligible(order({ assigned_representative_id: 8 }))).toBe(false);
    expect(isReassignmentEligible(order({ status: "assigned", assigned_representative_id: 8 }))).toBe(true);
    expect(orderServiceCityId(order({ delivery_address: { service_city_id: 7 } }))).toBe("7");
  });
});
