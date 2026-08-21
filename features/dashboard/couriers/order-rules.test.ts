import { describe, expect, it } from "vitest";

import { assignedRepresentativeId, isActiveAssignedOrder } from "./order-rules";

describe("courier order rules", () => {
  it("normalizes scalar and object representative assignments", () => {
    expect(assignedRepresentativeId({ assigned_representative: { id: 9 } })).toBe("9");
    expect(assignedRepresentativeId({ assigned_representative_id: "10" })).toBe("10");
    expect(assignedRepresentativeId({ assigned_representative: null })).toBe("");
  });

  it("classifies active delivery statuses independently of assignment shape", () => {
    expect(isActiveAssignedOrder({ status: "picked_up", assigned_representative_id: 9 })).toBe(true);
    expect(isActiveAssignedOrder({ status: "delivered", assigned_representative_id: 9 })).toBe(false);
    expect(isActiveAssignedOrder({ status: "assigned" })).toBe(true);
  });
});
