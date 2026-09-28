import { describe, expect, it } from "vitest";

import { campaignFromApi, campaignPayload, initialCampaignForm, validateCampaign } from "./domain";

describe("home campaign domain", () => {
  it("normalizes the effective status, city, and target", () => {
    const campaign = campaignFromApi({
      id: 15,
      internal_name: "حملة أغسطس",
      effective_status: "scheduled",
      service_city: { id: 2, name: "القاهرة" },
      target_summary: { id: 9, name: "عرض أول طلب" },
      start_time: "2026-08-25T10:00:00Z",
      end_time: "2026-08-30T10:00:00Z",
    });
    expect(campaign).toMatchObject({
      id: "15",
      internal_name: "حملة أغسطس",
      effective_status: "scheduled",
      service_city_name: "القاهرة",
      target_name: "عرض أول طلب",
      use_theme_colors: true,
    });
  });

  it("sends one compatible target and clears the rest", () => {
    const form = {
      ...initialCampaignForm(),
      action_type: "product",
      target_offer_id: "7",
      target_product_id: "12",
      target_market_id: "4",
    };
    expect(campaignPayload(form)).toMatchObject({
      target_offer_id: null,
      target_product_id: 12,
      target_market_id: null,
      target_product_category_id: null,
      use_theme_colors: true,
    });
    expect(campaignPayload(form)).not.toHaveProperty("priority");
    expect(campaignPayload(form)).not.toHaveProperty("audience");
  });

  it("requires the video and poster before activating", () => {
    const form = {
      ...initialCampaignForm(),
      internal_name: "إطلاق جديد",
      media_type: "video",
      is_active: true,
    };
    expect(validateCampaign(form, {})).toContain("فيديو MP4");
  });

  it("accepts multiple images and rejects removing the last active image", () => {
    const form = {
      ...initialCampaignForm(),
      internal_name: "Campaign",
      media_type: "image",
      is_active: true,
    };
    const image = { name: "campaign.png" } as File;
    expect(validateCampaign(form, { images: [image] })).toBe("");
    const existing = {
      ...form,
      id: "1",
      effective_status: "active" as const,
      service_city_name: "",
      target_name: "",
      teaser_image: "",
      sheet_image: "",
      video: "",
      video_poster: "",
      additional_images: [{ id: 5, url: "https://example.com/image.png" }],
      updated_at: "",
    };
    expect(validateCampaign(form, {}, existing, [5])).not.toBe("");
  });
});
