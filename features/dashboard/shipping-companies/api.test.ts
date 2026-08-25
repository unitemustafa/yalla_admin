import { describe, expect, it, vi } from "vitest";

import { archiveShippingCompany, companyFromResponse, saveShippingCompany } from "./api";

describe("shipping company API mapping", () => {
  it("maps multiple cities, logo, state, and deletion mode", () => {
    expect(companyFromResponse({
      id: 7,
      name: " Fast Ship ",
      logo_url: "https://example.com/logo.webp",
      service_city_ids: [2, "3"],
      service_cities: [{ id: 2, name: "القاهرة" }, { id: 3, name: "الجيزة" }],
      is_active: false,
      archived_at: null,
      deletion_mode: "archive",
    })).toEqual({
      id: "7",
      name: "Fast Ship",
      logoUrl: "https://example.com/logo.webp",
      cityIds: ["2", "3"],
      cityNames: ["القاهرة", "الجيزة"],
      status: "inactive",
      archivedAt: null,
      deletionMode: "archive",
    });
  });

  it("rejects malformed responses", () => {
    expect(companyFromResponse(null)).toBeNull();
    expect(companyFromResponse({ id: 1, name: " " })).toBeNull();
  });

  it("submits multipart data with every selected city and the logo", async () => {
    const apiFetch = vi.fn<
      (path: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response(JSON.stringify({
      id: 9,
      name: "Fast Ship",
      service_city_ids: [2, 3],
      service_cities: [{ id: 2, name: "القاهرة" }, { id: 3, name: "الجيزة" }],
      is_active: true,
      archived_at: null,
      deletion_mode: "delete",
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const logo = new File(["logo"], "logo.png", { type: "image/png" });

    await saveShippingCompany(apiFetch, {
      name: " Fast Ship ",
      cityIds: ["2", "3"],
      status: "active",
      logoFile: logo,
      removeLogo: false,
    });

    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("locations/shipping-companies/");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init?.body as FormData;
    expect(form.get("name")).toBe("Fast Ship");
    expect(form.getAll("service_city_ids")).toEqual(["2", "3"]);
    expect(form.get("logo")).toBe(logo);
  });

  it("uses the explicit archive action without deleting the company", async () => {
    const apiFetch = vi.fn<
      (path: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response(JSON.stringify({
      id: 7,
      name: "Fast Ship",
      service_city_ids: [2],
      service_cities: [{ id: 2, name: "القاهرة" }],
      is_active: false,
      archived_at: "2026-08-25T10:00:00Z",
      deletion_mode: "delete",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await archiveShippingCompany(apiFetch, "7");

    expect(result.archivedAt).toBe("2026-08-25T10:00:00Z");
    expect(apiFetch).toHaveBeenCalledWith(
      "locations/shipping-companies/7/",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ archive: true }) }),
    );
  });
});
