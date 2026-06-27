import {
  defaultDashboardCustomization,
  normalizeDashboardCustomColors,
  type DashboardCustomization,
  type DashboardFontId,
  type DashboardPaletteId,
} from "./customization";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

type BackendDashboardSettings = {
  palette?: string;
  font?: string;
  brand_name?: string;
  branch_name?: string;
  logo?: string | null;
  custom_colors?: unknown;
};

function isPalette(value: unknown): value is DashboardPaletteId {
  return (
    value === "teal" ||
    value === "emerald" ||
    value === "indigo" ||
    value === "rose" ||
    value === "custom"
  );
}

function isFont(value: unknown): value is DashboardFontId {
  return (
    value === "cairo" ||
    value === "tajawal" ||
    value === "alexandria" ||
    value === "system"
  );
}

function dashboardSettingsFromBackend(
  value: BackendDashboardSettings,
): DashboardCustomization {
  return {
    palette: isPalette(value.palette)
      ? value.palette
      : defaultDashboardCustomization.palette,
    font: isFont(value.font) ? value.font : defaultDashboardCustomization.font,
    brandName:
      typeof value.brand_name === "string"
        ? value.brand_name
        : defaultDashboardCustomization.brandName,
    branchName:
      typeof value.branch_name === "string"
        ? value.branch_name
        : defaultDashboardCustomization.branchName,
    logoDataUrl:
      typeof value.logo === "string" ? value.logo : defaultDashboardCustomization.logoDataUrl,
    customColors: normalizeDashboardCustomColors(value.custom_colors),
  };
}

async function readResponse(response: Response) {
  return (await response.json().catch(() => null)) as BackendDashboardSettings | null;
}

async function parseSettingsResponse(response: Response, fallback: string) {
  const data = await readResponse(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(fallback);
  }

  return dashboardSettingsFromBackend(data);
}

function dashboardSettingsPayload(customization: DashboardCustomization) {
  return {
    palette: customization.palette,
    font: customization.font,
    brand_name: customization.brandName,
    branch_name: customization.branchName,
    custom_colors: customization.customColors,
  };
}

export async function loadDashboardSettings(apiFetch: ApiFetch) {
  const response = await apiFetch("home/dashboard-settings/");
  return parseSettingsResponse(response, "تعذر تحميل إعدادات اللوحة.");
}

export async function saveDashboardSettings(
  apiFetch: ApiFetch,
  customization: DashboardCustomization,
) {
  const response = await apiFetch("home/dashboard-settings/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dashboardSettingsPayload(customization)),
  });

  return parseSettingsResponse(response, "تعذر حفظ إعدادات اللوحة.");
}

export async function uploadDashboardLogo(apiFetch: ApiFetch, file: File) {
  const formData = new FormData();
  formData.set("logo", file);

  const response = await apiFetch("home/dashboard-settings/", {
    method: "PATCH",
    body: formData,
  });

  return parseSettingsResponse(response, "تعذر رفع اللوجو.");
}

export async function clearDashboardLogo(apiFetch: ApiFetch) {
  const response = await apiFetch("home/dashboard-settings/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clear_logo: true }),
  });

  return parseSettingsResponse(response, "تعذر حذف اللوجو.");
}

export async function resetDashboardSettings(apiFetch: ApiFetch) {
  const response = await apiFetch("home/dashboard-settings/", {
    method: "DELETE",
  });

  return parseSettingsResponse(response, "تعذر الرجوع للإعدادات الافتراضية.");
}
