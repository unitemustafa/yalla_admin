export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "yalla-theme";
export const THEME_CHANGE_EVENT = "yalla-theme-change";

export function parseThemeChoice(value: string | null): ThemeChoice {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "dark";
}

export function resolveThemeChoice(
  theme: ThemeChoice,
  prefersDark: boolean,
): "light" | "dark" {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}
