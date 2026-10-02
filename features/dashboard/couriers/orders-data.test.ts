import { describe, expect, it, vi } from "vitest";
import { loadCourierDetailData } from "./api";
import { activeCourierOrders } from "./orders-data";

describe("courier history and server totals", () => {
  it("fails clearly when global counts are missing instead of reporting truncated delivery totals", async () => {
    const apiFetch = vi.fn(async () => Response.json({ results: [], count: 0 }));
    await expect(activeCourierOrders(apiFetch)).rejects.toThrow("إحصاءات");
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
  it("loads only active order pages for assignment while preserving all-time server counts", async () => {
    const apiFetch = vi.fn(async (path: string) => {
      const params = new URL(path, "https://example.test").searchParams;
      expect(params.get("scope")).toBe("active");
      expect(params.get("ordering")).toBe("-assigned_at");
      expect(params.get("page_size")).toBe("100");
      return Response.json({ count: 101,
        results: params.get("page") === "1" ? Array.from({ length: 100 }, (_, id) => ({ id, status: "assigned" })) : [{ id: 100, status: "picked_up" }],
        courier_summary: [{ assigned_representative_id: 7, active: 2, delivered: 8000, total: 9000, delivered_total: "90000.00" }],
      });
    });
    const data = await activeCourierOrders(apiFetch);
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(data.orders).toHaveLength(101);
    expect(data.summaries[0].delivered).toBe(8000);
  });

  it("pages the detail table without truncating totals or losing the latest delivered order", async () => {
    const apiFetch = vi.fn(async (path: string) => {
      if (path.startsWith("auth/users/")) return Response.json({ id: 7, first_name: "Test", last_name: "Courier", role: "representative", email: "courier@example.test" });
      const params = new URL(path, "https://example.test").searchParams;
      expect(params.get("representative_id")).toBe("7");
      let results: unknown[] = [];
      let count = 0;
      if (params.get("scope") === "active") { results = [{ id: 99, status: "assigned", assigned_representative_id: 7 }]; count = 1; }
      else if (params.get("status") === "delivered") {
        expect(params.get("ordering")).toBe("-delivered_at");
        results = [{ id: 98, status: "delivered", assigned_representative_id: 7 }]; count = 8000;
      }
      else {
        expect(params.get("page")).toBe("3");
        expect(params.get("page_size")).toBe("25");
        expect(params.get("search")).toBe("YM-12");
        results = [{ id: 12, status: "delivered", assigned_representative_id: 7 }]; count = 75;
      }
      return Response.json({ count, results, courier_summary: [{ assigned_representative_id: 7, active: 2, delivered: 8000, total: 9000, delivered_total: "90000.00" }] });
    });
    const data = await loadCourierDetailData(apiFetch, "7", 3, "YM-12");
    expect(data.orders.map((order) => order.id)).toEqual([12]);
    expect(data.activeOrders[0].id).toBe(99);
    expect(data.latestDelivered[0].id).toBe(98);
    expect(data.count).toBe(75);
    expect(data.summary?.delivered_total).toBe("90000.00");
  });
});
