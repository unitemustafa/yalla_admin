import {
  dashboardPalettes,
  defaultDashboardCustomization,
  normalizeDashboardCustomColors,
  type DashboardCustomization,
  type DashboardFontId,
} from "./customization";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

type BackendDashboardSettings = {
  primary_color?: string;
  subtle_color?: string;
  accent_color?: string;
  font_family?: string;
  brand_name?: string;
  brand_tagline?: string;
  logo_url?: string | null;
  updated_at?: string;
};

function fontFromBackend(value: unknown): DashboardFontId {
  if (value === "Tajawal") return "tajawal";
  if (value === "Alexandria") return "alexandria";
  if (value === "System") return "system";
  return "cairo";
}

function fontToBackend(value: DashboardFontId) {
  if (value === "tajawal") return "Tajawal";
  if (value === "alexandria") return "Alexandria";
  if (value === "system") return "System";
  return "Cairo";
}

function firstApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }
  return null;
}

function dashboardSettingsFromBackend(
  value: BackendDashboardSettings,
): DashboardCustomization {
  const customColors = normalizeDashboardCustomColors({
    primary: value.primary_color,
    surface: value.subtle_color,
    accent: value.accent_color,
  });
  const palette = dashboardPalettes.find((item) =>
    item.swatches.every(
      (swatch, index) =>
        swatch.toLowerCase() ===
        [customColors.primary, customColors.surface, customColors.accent][
          index
        ].toLowerCase(),
    ),
  );

  return {
    palette: palette?.id ?? "custom",
    font: fontFromBackend(value.font_family),
    brandName:
      typeof value.brand_name === "string"
        ? value.brand_name
        : defaultDashboardCustomization.brandName,
    branchName:
      typeof value.brand_tagline === "string"
        ? value.brand_tagline
        : defaultDashboardCustomization.branchName,
    logoDataUrl:
      typeof value.logo_url === "string"
        ? value.logo_url
        : defaultDashboardCustomization.logoDataUrl,
    customColors,
  };
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return (await response
    .json()
    .catch(() => null)) as BackendDashboardSettings | null;
}

async function parseSettingsResponse(response: Response, fallback: string) {
  const data = await readResponse(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(firstApiError(data) ?? fallback);
  }

  return dashboardSettingsFromBackend(data);
}

function dashboardSettingsPayload(customization: DashboardCustomization) {
  return {
    primary_color: customization.customColors.primary,
    subtle_color: customization.customColors.surface,
    accent_color: customization.customColors.accent,
    font_family: fontToBackend(customization.font),
    brand_name: customization.brandName,
    brand_tagline: customization.branchName,
  };
}

export async function loadDashboardSettings(apiFetch: ApiFetch) {
  const response = await apiFetch("dashboard/settings/");
  return parseSettingsResponse(
    response,
    "تعذر تحميل إعدادات اللوحة من الخادم.",
  );
}

export async function saveDashboardSettings(
  apiFetch: ApiFetch,
  customization: DashboardCustomization,
  logo?: File | null,
  removeLogo = false,
) {
  const payload = dashboardSettingsPayload(customization);

  if (logo) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.set(key, value);
    });
    formData.set("logo", logo);

    const response = await apiFetch("dashboard/settings/", {
      method: "PATCH",
      body: formData,
    });
    return parseSettingsResponse(response, "تعذر حفظ إعدادات اللوحة.");
  }

  const response = await apiFetch("dashboard/settings/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      ...(removeLogo ? { remove_logo: true } : {}),
    }),
  });

  return parseSettingsResponse(response, "تعذر حفظ إعدادات اللوحة.");
}
