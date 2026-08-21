import { describe, expect, it } from "vitest";

import { recentOrdersFromBackend } from "./domain";

describe("customer detail domain", () => {
  it("normalizes recent orders and uses the existing id-number fallbacks", () => {
    expect(
      recentOrdersFromBackend([
        {
          id: 4,
          number: "ORD-4",
          status: "completed",
          total: 12.5,
          created_at: "2026-08-21T10:00:00Z",
        },
        { id: 5, total: null },
        { number: "ORD-6", status: 7 },
      ]),
    ).toEqual([
      {
        id: "4",
        number: "ORD-4",
        status: "completed",
        total: "12.5",
        created_at: "2026-08-21T10:00:00Z",
      },
      {
        id: "5",
        number: "5",
        status: "",
        total: "0.00",
        created_at: null,
      },
      {
        id: "ORD-6",
        number: "ORD-6",
        status: "",
        total: "0.00",
        created_at: null,
      },
    ]);
  });

  it("rejects non-arrays and rows without usable identifiers", () => {
    expect(recentOrdersFromBackend(null)).toEqual([]);
    expect(recentOrdersFromBackend([null, "row", {}, { id: "" }])).toEqual(
      [],
    );
  });
});
