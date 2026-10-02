import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarketMediaFields } from "./market-media-fields";

describe("MarketMediaFields", () => {
  it("previews the complete store cover without crop controls or overlay mockups", () => {
    const form = {
      imagePreview: "",
      imageName: "",
      coverPreview: "blob:cover-preview",
      coverName: "cover.png",
      handleImageChange: async () => {},
      handleCoverChange: async () => {},
      removeSelectedImage: () => {},
      removeSelectedCover: () => {},
    } satisfies ComponentProps<typeof MarketMediaFields>["form"];
    const html = renderToStaticMarkup(createElement(MarketMediaFields, { form }));

    expect(html).toContain('alt="معاينة غلاف المحل"');
    expect(html).toContain("object-contain");
    expect(html).not.toContain("object-cover");
    expect(html).not.toContain('type="range"');
    expect(html).not.toContain("موضع القص:");
    expect(html).not.toContain("320px");
    expect(html).not.toContain("768px");
  });
});
