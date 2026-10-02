import { describe, expect, it } from "vitest";

import { mediaSpecHint, mediaSpecs, validateImageDimensions } from "./media-specs";

describe("media specifications", () => {
  it("accepts the canonical product square", () => {
    expect(validateImageDimensions(1600, 1600, mediaSpecs.product)).toBeNull();
  });

  it("accepts rectangular product images displayed with contain", () => {
    expect(validateImageDimensions(1600, 900, mediaSpecs.product)).toBeNull();
    expect(validateImageDimensions(900, 1600, mediaSpecs.product)).toBeNull();
  });

  it("rejects an undersized offer banner", () => {
    expect(validateImageDimensions(800, 300, mediaSpecs.offerBanner)).toContain("1200×450");
  });

  it("publishes the offer safe area in its hint", () => {
    expect(mediaSpecHint(mediaSpecs.offerBanner)).toContain("1200×450");
    expect(mediaSpecHint(mediaSpecs.offerBanner)).toContain("قد تغطيها عناصر الواجهة");
    expect(mediaSpecHint(mediaSpecs.offerBanner)).toContain("8:3");
  });

  it("keeps the aspect ratio required for fixed offer and campaign slots", () => {
    expect(validateImageDimensions(1600, 900, mediaSpecs.offerBanner)).not.toBeNull();
    expect(validateImageDimensions(1600, 1600, mediaSpecs.campaignMedia)).not.toBeNull();
    expect(validateImageDimensions(2400, 900, mediaSpecs.offerBanner)).toBeNull();
  });

  it("accepts alternative ratios for responsive covers and login backgrounds", () => {
    expect(validateImageDimensions(1600, 1000, mediaSpecs.storeCover)).toBeNull();
    expect(validateImageDimensions(1200, 1200, mediaSpecs.marketLogin)).toBeNull();
    expect(validateImageDimensions(1200, 1200, mediaSpecs.deliveryLogin)).toBeNull();
  });

  it("rejects unreadable dimensions and low resolution even for contain slots", () => {
    for (const width of [0, -1, NaN, Infinity]) {
      expect(validateImageDimensions(width, 1600, mediaSpecs.product)).not.toBeNull();
    }
    expect(validateImageDimensions(1600, 0, mediaSpecs.product)).not.toBeNull();
    expect(validateImageDimensions(400, 400, mediaSpecs.product)).not.toBeNull();
  });

  it("explains recommended dimensions and full-image display", () => {
    expect(mediaSpecHint(mediaSpecs.product)).toContain("تُقبل نسب أخرى");
    expect(mediaSpecHint(mediaSpecs.product)).toContain("دون قص");
  });
});
