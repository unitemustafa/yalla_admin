"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  defaultDashboardCustomization,
  type DashboardCustomization,
  type DashboardCustomColors,
  useDashboardCustomization,
} from "@/features/dashboard/customization";
import {
  loadDashboardSettings,
  saveDashboardSettings,
} from "@/features/dashboard/dashboard-settings-api";
import { dashboardBrandLogos } from "@/features/dashboard/shared/branding";
import { useDashboardI18n } from "@/features/dashboard/i18n";
import { useSnackbar } from "@/features/dashboard/snackbar";
import {
  dashboardThemeChangeEvent,
  defaultServerBrandName,
  defaultServerTagline,
  selectedSettingsSwatches,
  settingsErrorMessage,
  validateDashboardLogo,
  validateSettingsDraft,
  withServerDefaults,
} from "./domain";
import type { ResolvedDashboardTheme } from "./types";

export type SettingsPageController = {
  draft: DashboardCustomization;
  brandName: string;
  branchName: string;
  logo: string;
  logoPreviewUrl: string;
  selectedSwatches: string[];
  status: string | null;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  hasServerLogo: boolean;
  updateDraft: (next: Partial<DashboardCustomization>) => void;
  updateCustomColor: (key: keyof DashboardCustomColors, value: string) => void;
  selectLogo: (file: File | null) => void;
  save: () => Promise<void>;
  reset: () => Promise<void>;
  removeLogo: () => Promise<void>;
};

export function useSettingsPage(): SettingsPageController {
  const { apiFetch } = useAuth();
  const { t } = useDashboardI18n();
  const { showSnackbar } = useSnackbar();
  const { customization, setCustomization } = useDashboardCustomization();
  const objectUrlRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<DashboardCustomization>(() =>
    withServerDefaults(customization),
  );
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [shouldRemoveLogo, setShouldRemoveLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedDashboardTheme>(() => {
      if (typeof window === "undefined") return "dark";
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    });

  const brandName = draft.brandName || t("brand.name");
  const branchName = draft.branchName || t("branch.default");
  const logo =
    logoPreviewUrl || draft.logoDataUrl || dashboardBrandLogos[resolvedTheme];

  useEffect(() => {
    function syncResolvedTheme() {
      setResolvedTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    }

    syncResolvedTheme();
    window.addEventListener(dashboardThemeChangeEvent, syncResolvedTheme);
    return () =>
      window.removeEventListener(dashboardThemeChangeEvent, syncResolvedTheme);
  }, []);

  useEffect(() => {
    let active = true;
    void loadDashboardSettings(apiFetch)
      .then((serverCustomization) => {
        if (!active) return;
        const nextCustomization = withServerDefaults(serverCustomization);
        setDraft(nextCustomization);
        setCustomization(nextCustomization);
        setStatus(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? settingsErrorMessage(error.message)
            : "تعذر تحميل إعدادات اللوحة من الخادم.";
        setStatus("تعذر تحميل إعدادات اللوحة من الخادم.");
        showSnackbar({ message, tone: "danger" });
      })
      .finally(() => {
        if (active) setIsLoadingSettings(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, setCustomization, showSnackbar]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function updateDraft(next: Partial<DashboardCustomization>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function updateCustomColor(
    colorKey: keyof DashboardCustomColors,
    value: string,
  ) {
    updateDraft({
      palette: "custom",
      customColors: { ...draft.customColors, [colorKey]: value },
    });
  }

  function selectLogo(file: File | null) {
    if (!file) return;
    const validation = validateDashboardLogo(file);
    if (!validation.valid) {
      showSnackbar({ message: validation.message, tone: "danger" });
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextPreview = URL.createObjectURL(file);
    objectUrlRef.current = nextPreview;
    setSelectedLogo(file);
    setShouldRemoveLogo(false);
    setLogoPreviewUrl(nextPreview);
    setStatus("تم اختيار اللوجو. احفظ لتطبيق التغيير.");
  }

  function clearSavedLogoSelection() {
    setSelectedLogo(null);
    setShouldRemoveLogo(false);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLogoPreviewUrl("");
  }

  async function save() {
    if (isSavingSettings) return;
    const validation = validateSettingsDraft(draft);
    if (!validation.valid) {
      showSnackbar({ message: validation.message, tone: "danger" });
      return;
    }

    setIsSavingSettings(true);
    setStatus(null);
    try {
      const savedCustomization = await saveDashboardSettings(
        apiFetch,
        validation.customization,
        selectedLogo,
        shouldRemoveLogo,
      );
      const nextCustomization = withServerDefaults(savedCustomization);
      setDraft(nextCustomization);
      setCustomization(nextCustomization);
      clearSavedLogoSelection();
      setStatus("تم حفظ إعدادات اللوحة.");
      showSnackbar({ message: "تم حفظ إعدادات اللوحة." });
    } catch (error) {
      const message =
        error instanceof Error
          ? settingsErrorMessage(error.message)
          : "تعذر حفظ إعدادات اللوحة.";
      setStatus("تعذر حفظ إعدادات اللوحة.");
      showSnackbar({ message, tone: "danger" });
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function reset() {
    if (isSavingSettings) return;
    const defaults = {
      ...defaultDashboardCustomization,
      brandName: defaultServerBrandName,
      branchName: defaultServerTagline,
    };

    setIsSavingSettings(true);
    setStatus(null);
    try {
      const savedCustomization = await saveDashboardSettings(
        apiFetch,
        defaults,
        null,
        true,
      );
      const nextCustomization = withServerDefaults(savedCustomization);
      setDraft(nextCustomization);
      setCustomization(nextCustomization);
      clearSavedLogoSelection();
      setStatus("تم الرجوع إلى الإعدادات الافتراضية.");
      showSnackbar({ message: "تم الرجوع إلى الإعدادات الافتراضية." });
    } catch (error) {
      const message =
        error instanceof Error
          ? settingsErrorMessage(error.message)
          : "تعذر الرجوع إلى الإعدادات الافتراضية.";
      setStatus("تعذر الرجوع إلى الإعدادات الافتراضية.");
      showSnackbar({ message, tone: "danger" });
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function removeLogo() {
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      const savedCustomization = await saveDashboardSettings(
        apiFetch,
        draft,
        null,
        true,
      );
      const nextCustomization = withServerDefaults(savedCustomization);
      setDraft(nextCustomization);
      setCustomization(nextCustomization);
      setSelectedLogo(null);
      setLogoPreviewUrl("");
      showSnackbar({ message: "تم حذف اللوجو." });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? settingsErrorMessage(error.message)
            : "تعذر حذف اللوجو.",
        tone: "danger",
      });
    } finally {
      setIsSavingSettings(false);
    }
  }

  return {
    draft,
    brandName,
    branchName,
    logo,
    logoPreviewUrl,
    selectedSwatches: selectedSettingsSwatches(draft),
    status,
    isLoadingSettings,
    isSavingSettings,
    hasServerLogo: Boolean(draft.logoDataUrl),
    updateDraft,
    updateCustomColor,
    selectLogo,
    save,
    reset,
    removeLogo,
  };
}
