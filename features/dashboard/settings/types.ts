import type { DashboardCustomization } from "@/features/dashboard/customization";

export type ResolvedDashboardTheme = "light" | "dark";

export type SettingsDraftValidation =
  | { valid: true; customization: DashboardCustomization }
  | { valid: false; message: string };

export type LogoValidationResult =
  | { valid: true }
  | { valid: false; message: string };
