"use client";

import { useCallback, useEffect, useState } from "react";

import {
  parseThemeChoice,
  resolveThemeChoice,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "./theme-domain";

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  const resolvedTheme =
    theme === "system"
      ? resolveThemeChoice(
          theme,
          window.matchMedia("(prefers-color-scheme: dark)").matches,
        )
      : resolveThemeChoice(theme, false);

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useSidebarTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") return "dark";
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

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

  const selectTheme = useCallback((nextTheme: ThemeChoice) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  return { theme, resolvedTheme, selectTheme };
}
