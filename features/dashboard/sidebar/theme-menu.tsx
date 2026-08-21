import { Check, Languages, Monitor, Moon, Palette, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ThemeChoice } from "./theme-domain";

const appearanceOptions = [
  { value: "system", labelKey: "appearance.system", icon: Monitor },
  { value: "dark", labelKey: "appearance.dark", icon: Moon },
  { value: "light", labelKey: "appearance.light", icon: Sun },
] as const;

const languageOptions = [
  { value: "ar", labelKey: "language.ar" },
  { value: "en", labelKey: "language.en" },
] as const;

export function SidebarThemeMenu({
  theme,
  language,
  onSelectTheme,
  t,
}: {
  theme: ThemeChoice;
  language: "ar" | "en";
  onSelectTheme: (theme: ThemeChoice) => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="rounded-md px-2 py-2">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sidebar-foreground/70">
          <Palette className="size-3.5" />
          <span>{t("profile.appearance")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {appearanceOptions.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectTheme(option.value)}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-md border text-xs transition-colors",
                  selected
                    ? "border-sidebar-ring bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-sidebar-border text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span className="truncate">{t(option.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-md px-2 py-2">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-sidebar-foreground/70">
          <Languages className="size-3.5" />
          <span>{t("profile.language")}</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {languageOptions.map((option) => {
            const selected = language === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                disabled
                className={cn(
                  "flex h-8 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border px-2 text-xs opacity-60 transition-colors",
                  selected
                    ? "border-sidebar-ring bg-sidebar-accent text-sidebar-accent-foreground"
                    : "border-sidebar-border text-sidebar-foreground/75",
                )}
              >
                <span className="truncate">{t(option.labelKey)}</span>
                {selected ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
