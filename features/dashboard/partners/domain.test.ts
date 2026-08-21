import { describe, expect, it } from "vitest";

import {
  filterPartnerApplications,
  formatPartnerDate,
  partnerApplicationCounts,
  partnerApplicationFromApi,
  partnerApplicationsFromApi,
  partnerBusinessTypeLabel,
  partnerDecisionValue,
  partnerStatusLabel,
  partnerStatusTone,
} from "./domain";
import type { PartnerApplication } from "./types";

function application(
  id: string,
  status: PartnerApplication["status"],
): PartnerApplication {
  return {
    id,
    applicantName: "مقدم الطلب",
    applicantUsername: `applicant-${id}`,
    businessName: id === "1" ? "متجر النور" : "مطعم البحر",
    contactName: id === "1" ? "أحمد سالم" : "سارة علي",
    businessType: "shop",
    branchesCount: 1,
    applicantRole: "owner_partner",
    hasTradeLicense: true,
    email: `${id}@example.com`,
    mobileNumber: `090000000${id}`,
    landline: "",
    whatsappOptIn: false,
    notes: "",
    status,
    adminNotes: "",
    reviewedByName: "",
    reviewedAt: "",
    createdAt: "",
  };
}

describe("partners domain", () => {
  it("normalizes API scalar values and defaults unknown statuses", () => {
    expect(
      partnerApplicationFromApi({
        id: 7,
        applicant_name: " Applicant ",
        business_name: " Market ",
        contact_first_name: "أحمد",
        contact_last_name: "سالم",
        branches_count: "3",
        has_trade_license: "yes",
        whatsapp_opt_in: "0",
        status: "unknown",
      }),
    ).toMatchObject({
      id: "7",
      applicantName: "Applicant",
      businessName: "Market",
      contactName: "أحمد سالم",
      branchesCount: 3,
      hasTradeLicense: true,
      whatsappOptIn: false,
      status: "pending",
      email: "-",
      mobileNumber: "-",
    });
  });

  it("accepts array and paginated list responses", () => {
    const row = { id: 1, business_name: "متجر" };
    expect(partnerApplicationsFromApi([row])).toHaveLength(1);
    expect(partnerApplicationsFromApi({ results: [row, null] })).toHaveLength(
      1,
    );
    expect(partnerApplicationsFromApi({ rows: [row] })).toEqual([]);
  });

  it("filters by status and searchable fields and calculates all counts", () => {
    const applications = [
      application("1", "pending"),
      application("2", "approved"),
      application("3", "rejected"),
    ];
    expect(
      filterPartnerApplications(applications, "all", "أحمد").map(
        (item) => item.id,
      ),
    ).toEqual(["1"]);
    expect(
      filterPartnerApplications(applications, "approved", "").map(
        (item) => item.id,
      ),
    ).toEqual(["2"]);
    expect(partnerApplicationCounts(applications)).toEqual({
      total: 3,
      pending: 1,
      approved: 1,
      rejected: 1,
    });
  });

  it("keeps status, label, decision, and date fallbacks", () => {
    expect(partnerStatusLabel("in_review")).toBe("قيد المراجعة");
    expect(partnerStatusTone("approved")).toBe("green");
    expect(partnerStatusTone("rejected")).toBe("red");
    expect(partnerDecisionValue("pending")).toBeUndefined();
    expect(partnerDecisionValue("approved")).toBe("approved");
    expect(partnerBusinessTypeLabel("restaurant")).toBe("مطعم");
    expect(partnerBusinessTypeLabel("custom")).toBe("custom");
    expect(formatPartnerDate("")).toBe("-");
    expect(formatPartnerDate("not-a-date")).toBe("not-a-date");
  });
});
