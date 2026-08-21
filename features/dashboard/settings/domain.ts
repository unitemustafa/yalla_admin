import {
  dashboardCustomPaletteVariables,
  dashboardPalettes,
  type DashboardCustomization,
} from "@/features/dashboard/customization";
import type {
  LogoValidationResult,
  SettingsDraftValidation,
} from "./types";

export const maxDashboardLogoSize = 5 * 1024 * 1024;
const allowedDashboardLogoTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const defaultServerBrandName = "يلا أدمن";
export const defaultServerTagline = "أول أونلاين ماركت في التل الكبير";
export const dashboardThemeChangeEvent = "yalla-theme-change";

export function settingsErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("color must be a hex")) {
    return "استخدم لونًا بصيغة #RRGGBB.";
  }
  if (normalized.includes("brand name is required")) {
    return "اسم البراند مطلوب.";
  }
  if (normalized.includes("brand tagline is required")) {
    return "وصف البراند مطلوب.";
  }
  if (normalized.includes("valid dashboard logo")) {
    return "ارفع لوجو صالحًا بصيغة JPG أو JPEG أو PNG أو WEBP.";
  }
  if (normalized.includes("5 mb")) {
    return "يجب ألا يتجاوز حجم اللوجو 5 ميجابايت.";
  }
  return message;
}

export function withServerDefaults(
  customization: DashboardCustomization,
): DashboardCustomization {
  return {
    ...customization,
    brandName: customization.brandName || defaultServerBrandName,
    branchName: customization.branchName || defaultServerTagline,
  };
}

export function validateSettingsDraft(
  draft: DashboardCustomization,
): SettingsDraftValidation {
  const customization = {
    ...draft,
    brandName: draft.brandName.trim(),
    branchName: draft.branchName.trim(),
  };
  if (!customization.brandName) {
    return { valid: false, message: "اسم البراند مطلوب." };
  }
  if (!customization.branchName) {
    return { valid: false, message: "وصف البراند مطلوب." };
  }
  return { valid: true, customization };
}

export function validateDashboardLogo(file: {
  type: string;
  size: number;
}): LogoValidationResult {
  if (!allowedDashboardLogoTypes.includes(file.type)) {
    return {
      valid: false,
      message: "ارفع لوجو صالحًا بصيغة JPG أو JPEG أو PNG أو WEBP.",
    };
  }
  if (file.size > maxDashboardLogoSize) {
    return {
      valid: false,
      message: "يجب ألا يتجاوز حجم اللوجو 5 ميجابايت.",
    };
  }
  return { valid: true };
}

export function selectedSettingsSwatches(draft: DashboardCustomization) {
  return draft.palette === "custom"
    ? dashboardCustomPaletteVariables(draft.customColors).swatches
    : (dashboardPalettes.find((palette) => palette.id === draft.palette)
        ?.swatches ?? dashboardPalettes[0].swatches);
}
