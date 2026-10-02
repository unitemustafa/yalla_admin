import { describe, expect, it } from "vitest";
import { launchMediaError, validateLaunchMediaFile } from "./domain";

describe("launch media validation", () => {
  it("limits market login images to 5 MB, independently of the video limit", () => {
    expect(validateLaunchMediaFile("market_login", { type: "image/png", size: 6 * 1024 * 1024 })).toContain("5");
    expect(validateLaunchMediaFile("market_login", { type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateLaunchMediaFile("market_login", { type: "video/mp4", size: 30 * 1024 * 1024 })).toBeNull();
    expect(validateLaunchMediaFile("market_login", { type: "video/mp4", size: 31 * 1024 * 1024 })).toContain("30");
  });

  it("accepts videos only for market login", () => {
    expect(validateLaunchMediaFile("delivery_login", { type: "video/mp4", size: 100 })).not.toBeNull();
    expect(validateLaunchMediaFile("onboarding_one", { type: "image/gif", size: 100 })).not.toBeNull();
  });

  it("displays field and general API validation errors", () => {
    expect(launchMediaError({ market_login_video: ["Invalid MP4."] }, "market_login_video")).toBe("Invalid MP4.");
    expect(launchMediaError({ non_field_errors: ["Invalid image."] }, "onboarding_one")).toBe("Invalid image.");
    expect(launchMediaError(null, "market_login")).toBe("تعذر حفظ الملف.");
  });
});
