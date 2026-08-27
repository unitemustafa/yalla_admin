import { describe, expect, it } from "vitest";

import {
  classificationNameError,
  filterMarketClassifications,
  paginateMarketClassifications,
  translateMarketClassificationError,
} from "./domain";
import type { MarketClassification } from "./types";

const classifications: MarketClassification[] = [
  {
    id: 1,
    name: "مطاعم",
    description: "",
    image: null,
    classification_type: "popular",
    is_active: true,
  },
  {
    id: 2,
    name: "أثاث",
    description: "",
    image: null,
    classification_type: "normal",
    is_active: true,
  },
];

describe("market classification domain", () => {
  it("filters by the Arabic classification type label", () => {
    expect(filterMarketClassifications(classifications, " شائعة ")).toEqual([
      classifications[0],
    ]);
    expect(filterMarketClassifications(classifications, "أثاث")).toEqual([
      classifications[1],
    ]);
  });

  it("clamps pagination to the final populated page", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      ...classifications[0],
      id: index + 1,
    }));

    expect(paginateMarketClassifications(items, 9)).toMatchObject({
      totalPages: 2,
      safeCurrentPage: 2,
      pageStartIndex: 10,
      items: items.slice(10),
    });
  });

  it("keeps form and API error messages in the domain", () => {
    expect(classificationNameError("   ")).toBe("اسم الفئة مطلوب.");
    expect(classificationNameError("مطاعم")).toBeNull();
    expect(
      translateMarketClassificationError(
        "Only four active featured market classifications are allowed",
      ),
    ).toContain("الأربعة");
  });
});
