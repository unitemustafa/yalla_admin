import { describe, expect, it } from "vitest";

import {
  dashboardPalettes,
  defaultDashboardCustomization,
} from "@/features/dashboard/customization";
import {
  defaultServerBrandName,
  defaultServerTagline,
  maxDashboardLogoSize,
  selectedSettingsSwatches,
  settingsErrorMessage,
  validateDashboardLogo,
  validateSettingsDraft,
  withServerDefaults,
} from "./domain";

describe("settings draft domain", () => {
  it("fills only missing server brand values", () => {
    expect(withServerDefaults(defaultDashboardCustomization)).toMatchObject({
      brandName: defaultServerBrandName,
      branchName: defaultServerTagline,
    });
    expect(
      withServerDefaults({
        ...defaultDashboardCustomization,
        brandName: "Brand",
        branchName: "Tagline",
      }),
    ).toMatchObject({ brandName: "Brand", branchName: "Tagline" });
  });

  it("trims a valid draft and validates brand fields in order", () => {
    expect(
      validateSettingsDraft({
        ...defaultDashboardCustomization,
        brandName: "   ",
        branchName: "Tagline",
      }),
    ).toEqual({ valid: false, message: "اسم البراند مطلوب." });
    expect(
      validateSettingsDraft({
        ...defaultDashboardCustomization,
        brandName: "Brand",
        branchName: "   ",
      }),
    ).toEqual({ valid: false, message: "وصف البراند مطلوب." });
    expect(
      validateSettingsDraft({
        ...defaultDashboardCustomization,
        brandName: " Brand ",
        branchName: " Tagline ",
      }),
    ).toMatchObject({
      valid: true,
      customization: { brandName: "Brand", branchName: "Tagline" },
    });
  });

  it("uses palette swatches or calculated custom swatches", () => {
    expect(
      selectedSettingsSwatches({
        ...defaultDashboardCustomization,
        palette: "market-blue",
      }),
    ).toEqual(
      dashboardPalettes.find((palette) => palette.id === "market-blue")
        ?.swatches,
    );
    expect(
      selectedSettingsSwatches({
        ...defaultDashboardCustomization,
        palette: "custom",
        customColors: {
          primary: "#111111",
          surface: "#222222",
          accent: "#333333",
        },
      }),
    ).toEqual(["#111111", "#222222", "#333333"]);
  });
});

describe("settings validation messages", () => {
  it.each([
    ["Color must be a hex value", "استخدم لونًا بصيغة #RRGGBB."],
    ["Brand name is required", "اسم البراند مطلوب."],
    ["Brand tagline is required", "وصف البراند مطلوب."],
    [
      "Upload a valid dashboard logo",
      "ارفع لوجو صالحًا بصيغة JPG أو JPEG أو PNG أو WEBP.",
    ],
    ["Logo must be 5 MB or smaller", "يجب ألا يتجاوز حجم اللوجو 5 ميجابايت."],
    ["Unknown error", "Unknown error"],
  ])("maps %s", (message, expected) => {
    expect(settingsErrorMessage(message)).toBe(expected);
  });

  it("validates logo type before size and accepts the exact limit", () => {
    expect(
      validateDashboardLogo({
        type: "image/gif",
        size: maxDashboardLogoSize + 1,
      }),
    ).toEqual({
      valid: false,
      message: "ارفع لوجو صالحًا بصيغة JPG أو JPEG أو PNG أو WEBP.",
    });
    expect(
      validateDashboardLogo({
        type: "image/png",
        size: maxDashboardLogoSize + 1,
      }),
    ).toEqual({
      valid: false,
      message: "يجب ألا يتجاوز حجم اللوجو 5 ميجابايت.",
    });
    expect(
      validateDashboardLogo({
        type: "image/webp",
        size: maxDashboardLogoSize,
      }),
    ).toEqual({ valid: true });
  });
});
