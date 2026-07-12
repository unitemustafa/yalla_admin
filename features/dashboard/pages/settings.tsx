"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  Paintbrush,
  Palette,
  RotateCcw,
  Save,
  Store,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  dashboardCustomPaletteVariables,
  dashboardPalettes,
  defaultDashboardCustomization,
  type DashboardCustomization,
  type DashboardCustomColors,
  useDashboardCustomization,
} from "@/features/dashboard/customization";
import {
  loadDashboardSettings,
  saveDashboardSettings,
} from "@/features/dashboard/dashboard-settings-api";
import { DashboardImage } from "@/features/dashboard/dashboard-image";
import { dashboardBrandLogos } from "@/features/dashboard/data";
import { useDashboardI18n } from "@/features/dashboard/i18n";
import {
  Button,
  Card,
  Input,
  PageTitle,
} from "@/features/dashboard/primitives";
import { useSnackbar } from "@/features/dashboard/snackbar";
import { cn } from "@/lib/utils";

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_SERVER_BRAND_NAME = "يلا أدمن";
const DEFAULT_SERVER_TAGLINE = "أول أونلاين ماركت في التل الكبير";
const THEME_CHANGE_EVENT = "yalla-theme-change";

function SettingBlock({
  icon,
  title,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentVisible = !collapsible || open;

  return (
    <Card className="p-5">
      <button
        aria-expanded={contentVisible}
        className={cn(
          "flex w-full items-center gap-2 text-start text-base font-bold",
          contentVisible && "mb-4",
          !collapsible && "pointer-events-none",
        )}
        disabled={!collapsible}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="flex-1">{title}</span>
        {collapsible ? (
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
      </button>
      {contentVisible ? children : null}
    </Card>
  );
}

function settingsErrorMessage(message: string) {
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

function withServerDefaults(
  customization: DashboardCustomization,
): DashboardCustomization {
  return {
    ...customization,
    brandName: customization.brandName || DEFAULT_SERVER_BRAND_NAME,
    branchName: customization.branchName || DEFAULT_SERVER_TAGLINE,
  };
}

export function SettingsPage() {
  const { apiFetch } = useAuth();
  const { t } = useDashboardI18n();
  const { showSnackbar } = useSnackbar();
  const { customization, setCustomization } = useDashboardCustomization();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

  const brandName = draft.brandName || t("brand.name");
  const branchName = draft.branchName || t("branch.default");
  const logo =
    logoPreviewUrl || draft.logoDataUrl || dashboardBrandLogos[resolvedTheme];
  const selectedSwatches =
    draft.palette === "custom"
      ? dashboardCustomPaletteVariables(draft.customColors).swatches
      : (dashboardPalettes.find((palette) => palette.id === draft.palette)
          ?.swatches ?? dashboardPalettes[0].swatches);

  useEffect(() => {
    function syncResolvedTheme() {
      setResolvedTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    }

    syncResolvedTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncResolvedTheme);
    return () =>
      window.removeEventListener(THEME_CHANGE_EVENT, syncResolvedTheme);
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
      customColors: {
        ...draft.customColors,
        [colorKey]: value,
      },
    });
  }

  function handleLogoSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showSnackbar({
        message: "ارفع لوجو صالحًا بصيغة JPG أو JPEG أو PNG أو WEBP.",
        tone: "danger",
      });
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      showSnackbar({
        message: "يجب ألا يتجاوز حجم اللوجو 5 ميجابايت.",
        tone: "danger",
      });
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

  async function handleSave() {
    if (isSavingSettings) return;

    const nextDraft = {
      ...draft,
      brandName: draft.brandName.trim(),
      branchName: draft.branchName.trim(),
    };
    if (!nextDraft.brandName) {
      showSnackbar({ message: "اسم البراند مطلوب.", tone: "danger" });
      return;
    }
    if (!nextDraft.branchName) {
      showSnackbar({ message: "وصف البراند مطلوب.", tone: "danger" });
      return;
    }

    setIsSavingSettings(true);
    setStatus(null);
    try {
      const savedCustomization = await saveDashboardSettings(
        apiFetch,
        nextDraft,
        selectedLogo,
        shouldRemoveLogo,
      );
      const nextCustomization = withServerDefaults(savedCustomization);
      setDraft(nextCustomization);
      setCustomization(nextCustomization);
      setSelectedLogo(null);
      setShouldRemoveLogo(false);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setLogoPreviewUrl("");
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

  async function handleReset() {
    if (isSavingSettings) return;

    const defaults = {
      ...defaultDashboardCustomization,
      brandName: DEFAULT_SERVER_BRAND_NAME,
      branchName: DEFAULT_SERVER_TAGLINE,
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
      setSelectedLogo(null);
      setShouldRemoveLogo(false);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setLogoPreviewUrl("");
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

  return (
    <div className="px-6 py-6">
      <PageTitle
        title="الإعدادات"
        description="تخصيص ألوان اللوحة وبيانات البراند الظاهرة في القائمة."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isLoadingSettings || isSavingSettings}
              onClick={() => void handleReset()}
              type="button"
              variant="outline"
            >
              <RotateCcw className="size-4" />
              رجوع للافتراضي
            </Button>
            <Button
              data-testid="save-dashboard-settings"
              disabled={isLoadingSettings || isSavingSettings}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSavingSettings ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSavingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/20 px-5 py-6">
            <div className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-background">
              <DashboardImage
                alt={brandName}
                className="size-full"
                height={80}
                src={logo}
                unoptimized={logo.startsWith("blob:")}
                width={80}
              />
            </div>
            <div className="mt-4 text-center text-xl font-bold">
              {brandName}
            </div>
            <div className="mt-1 text-center text-sm text-muted-foreground">
              {branchName}
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="rounded-lg border bg-background p-3">
              <div className="text-xs text-muted-foreground">اللون الحالي</div>
              <div className="mt-2 flex gap-2">
                {selectedSwatches.map((swatch) => (
                  <span
                    key={swatch}
                    className="size-8 rounded-md border"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>
            {status ? (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {status}
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-4">
          <SettingBlock
            collapsible
            icon={<Paintbrush className="size-4" />}
            title="ألوان اللوحة"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {dashboardPalettes.map((palette) => {
                const selected = palette.id === draft.palette;

                return (
                  <button
                    key={palette.id}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-20 items-center justify-between gap-3 rounded-lg border bg-background p-4 text-start transition-colors hover:bg-accent",
                      selected && "border-primary bg-primary/10 text-primary",
                    )}
                    onClick={() =>
                      updateDraft({
                        palette: palette.id,
                        customColors: {
                          primary: palette.swatches[0],
                          surface: palette.swatches[1],
                          accent: palette.swatches[2],
                        },
                      })
                    }
                    type="button"
                  >
                    <span className="font-semibold">{palette.name}</span>
                    <span className="flex items-center gap-2">
                      {palette.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="size-7 rounded-md border shadow-sm"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                      {selected ? <Check className="size-4" /> : null}
                    </span>
                  </button>
                );
              })}
              <button
                aria-pressed={draft.palette === "custom"}
                className={cn(
                  "flex min-h-20 items-center justify-between gap-3 rounded-lg border bg-background p-4 text-start transition-colors hover:bg-accent",
                  draft.palette === "custom" &&
                    "border-primary bg-primary/10 text-primary",
                )}
                onClick={() => updateDraft({ palette: "custom" })}
                type="button"
              >
                <span className="font-semibold">مخصص</span>
                <span className="flex items-center gap-2">
                  {dashboardCustomPaletteVariables(
                    draft.customColors,
                  ).swatches.map((swatch) => (
                    <span
                      key={swatch}
                      className="size-7 rounded-md border shadow-sm"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                  {draft.palette === "custom" ? (
                    <Check className="size-4" />
                  ) : null}
                </span>
              </button>
            </div>

            <div className="mt-4 rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Palette className="size-4 text-primary" />
                تخصيص الألوان
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["primary", "اللون الأساسي"],
                  ["surface", "لون التحديد الخفيف"],
                  ["accent", "لون مساعد"],
                ].map(([colorKey, label]) => (
                  <label
                    key={colorKey}
                    className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm font-medium"
                  >
                    {label}
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={label}
                        className="h-10 w-12 cursor-pointer p-1"
                        onChange={(event) =>
                          updateCustomColor(
                            colorKey as keyof DashboardCustomColors,
                            event.target.value,
                          )
                        }
                        type="color"
                        value={
                          draft.customColors[
                            colorKey as keyof DashboardCustomColors
                          ]
                        }
                      />
                      <Input
                        className="h-10 font-mono text-xs"
                        dir="ltr"
                        onChange={(event) =>
                          updateCustomColor(
                            colorKey as keyof DashboardCustomColors,
                            event.target.value,
                          )
                        }
                        value={
                          draft.customColors[
                            colorKey as keyof DashboardCustomColors
                          ]
                        }
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </SettingBlock>

          <SettingBlock
            icon={<Store className="size-4" />}
            title="اللوجو واسم البراند"
          >
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                اسم البراند
                <Input
                  data-testid="dashboard-brand-name-input"
                  onChange={(event) =>
                    updateDraft({ brandName: event.target.value })
                  }
                  placeholder={t("brand.name")}
                  value={draft.brandName}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                الوصف الظاهر تحت اللوجو
                <Input
                  data-testid="dashboard-brand-tagline-input"
                  onChange={(event) =>
                    updateDraft({ branchName: event.target.value })
                  }
                  placeholder={t("branch.default")}
                  value={draft.branchName}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleLogoSelection}
                  type="file"
                />
                <Button
                  disabled={isSavingSettings}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="outline"
                >
                  <ImagePlus className="size-4" />
                  تغيير اللوجو
                </Button>
                {draft.logoDataUrl ? (
                  <Button
                    disabled={isSavingSettings}
                    onClick={() => void removeLogo()}
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                  >
                    حذف اللوجو
                  </Button>
                ) : null}
              </div>
            </div>
          </SettingBlock>
        </div>
      </div>
    </div>
  );
}
