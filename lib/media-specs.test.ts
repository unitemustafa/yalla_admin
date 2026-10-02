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

  it("accepts small images of any ratio for every slot", () => {
    for (const spec of Object.values(mediaSpecs)) {
      for (const [width, height] of [[1, 1], [32, 96], [96, 32], [400, 400], [1600, 1600]]) {
        expect(validateImageDimensions(width, height, spec)).toBeNull();
      }
      expect(spec.minimumWidth).toBe(1);
      expect(spec.minimumHeight).toBe(1);
      expect(spec.ratioRequired).toBe(false);
    }
  });

  it("shows only a short recommended-size hint for every slot", () => {
    for (const spec of Object.values(mediaSpecs)) {
      expect(mediaSpecHint(spec)).toBe(`المقاس المقترح: ${spec.width}×${spec.height}px`);
    }
  });

  it("accepts alternative ratios for fixed offer and campaign slots", () => {
    expect(validateImageDimensions(1600, 900, mediaSpecs.offerBanner)).toBeNull();
    expect(validateImageDimensions(1600, 1600, mediaSpecs.campaignMedia)).toBeNull();
    expect(validateImageDimensions(2400, 900, mediaSpecs.offerBanner)).toBeNull();
  });

  it("accepts alternative ratios for responsive covers and login backgrounds", () => {
    expect(validateImageDimensions(1600, 1000, mediaSpecs.storeCover)).toBeNull();
    expect(validateImageDimensions(1200, 1200, mediaSpecs.marketLogin)).toBeNull();
    expect(validateImageDimensions(1200, 1200, mediaSpecs.deliveryLogin)).toBeNull();
  });

  it("rejects unreadable dimensions", () => {
    for (const dimension of [0, -1, NaN, Infinity]) {
      expect(validateImageDimensions(dimension, 1600, mediaSpecs.product)).not.toBeNull();
      expect(validateImageDimensions(1600, dimension, mediaSpecs.product)).not.toBeNull();
    }
    expect(validateImageDimensions(1600, 0, mediaSpecs.product)).not.toBeNull();
    expect(validateImageDimensions(400, 400, mediaSpecs.product)).toBeNull();
  });

  it("does not enforce restrictions from an older media contract", () => {
    const legacySpec = { ...mediaSpecs.offerBanner, minimumWidth: 1200, minimumHeight: 450, ratioRequired: true };
    expect(validateImageDimensions(96, 32, legacySpec)).toBeNull();
    expect(validateImageDimensions(32, 96, legacySpec)).toBeNull();
  });

  it("preserves complete responsive store covers without a crop requirement", () => {
    expect(mediaSpecs.storeCover.fit).toBe("contain");
    expect(validateImageDimensions(1600, 900, mediaSpecs.storeCover)).toBeNull();
  });
});
