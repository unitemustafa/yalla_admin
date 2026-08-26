import { describe, expect, it } from "vitest";

import { mediaSpecHint, mediaSpecs, validateImageDimensions } from "./media-specs";

describe("media specifications", () => {
  it("accepts the canonical product square", () => {
    expect(validateImageDimensions(1600, 1600, mediaSpecs.product)).toBeNull();
  });

  it("rejects a product image that would need responsive cropping", () => {
    expect(validateImageDimensions(1600, 900, mediaSpecs.product)).toContain("1600:1600");
  });

  it("rejects an undersized offer banner", () => {
    expect(validateImageDimensions(800, 300, mediaSpecs.offerBanner)).toContain("1200×450");
  });

  it("publishes the offer safe area in its hint", () => {
    expect(mediaSpecHint(mediaSpecs.offerBanner)).toContain("1200×450");
  });
});
