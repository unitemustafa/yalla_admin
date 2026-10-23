import { describe, expect, it } from "vitest";

import { getDeliveryDestination } from "./order-display";

describe("delivery destination", () => {
  it("keeps customer details and instructions alongside the map address", () => {
    const destination = getDeliveryDestination({
      delivery_address: {
        formatted_address: "Map street, Cairo",
        street: "Customer street",
        building_name: "Building 7",
        floor: "4",
        apartment_number: "12",
        company_name: "Office destination",
        additional_instructions: "Call at gate",
        service_city: { name: "Cairo" },
        delivery_area: { name: "Downtown" },
      },
    });
    for (const detail of [
      "Map street, Cairo", "Customer street", "Building 7", "4", "12",
      "Office destination", "Call at gate", "Cairo", "Downtown",
    ]) {
      expect(destination).toContain(detail);
    }
  });

  it("keeps legacy details without coordinates or a map address", () => {
    expect(getDeliveryDestination({
      delivery_address: { details: "Family street", manual_city: "Mansoura", manual_area: "University" },
    })).toBe("Mansoura - University - Family street");
  });

  it("does not repeat identical map and street text", () => {
    expect(getDeliveryDestination({
      delivery_address: { formatted_address: "Same street", street: "Same street" },
    })).toBe("Same street");
  });
});
