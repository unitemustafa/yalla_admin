"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardAutoTranslate } from "@/features/dashboard/auto-translate";
import { applyDashboardCustomization } from "@/features/dashboard/customization";
import { DashboardI18nProvider } from "@/features/dashboard/i18n";
import { dashboardBrandLogos } from "@/features/dashboard/shared/branding";
import { THEME_CHANGE_EVENT } from "@/features/dashboard/sidebar/theme-domain";
import type { LoginDashboardSnapshot } from "@/features/dashboard/static-data";
import { isSafeNextPath } from "@/lib/auth";

import { useAuth } from "./auth-provider";
import { LoginDashboardPreview } from "./login-dashboard-snapshot";
import { LoginForm } from "./login-form";
import {
  hasLoginSplashBeenSeen,
  LoginSplash,
  markLoginSplashSeen,
} from "./login-splash";
import { MobileLoginBrand, SessionExpiredDialog } from "./login-visuals";
import { consumeSessionExpiredNotice } from "./session-storage";

function LoginPageContent({ snapshot }: { snapshot: LoginDashboardSnapshot }) {
  const router = useRouter();
  const { login } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });
  const loginBrandName = snapshot.branding.brandName || "يلا ماركت";
  const loginBrandTagline = snapshot.branding.brandTagline || "لوحة التحكم";
  const serverLogo = snapshot.branding.logoUrl?.trim() ?? "";
  const loginLogo = serverLogo || dashboardBrandLogos[resolvedTheme];

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
    const font = {
      Cairo: "cairo",
      Tajawal: "tajawal",
      Alexandria: "alexandria",
      System: "system",
    } as const;
    applyDashboardCustomization({
      palette: "custom",
      font: font[snapshot.branding.fontFamily],
      brandName: loginBrandName,
      branchName: loginBrandTagline,
      logoDataUrl: serverLogo,
      customColors: {
        primary: snapshot.branding.primaryColor,
        surface: snapshot.branding.subtleColor,
        accent: snapshot.branding.accentColor,
      },
    });
  }, [
    loginBrandName,
    loginBrandTagline,
    resolvedTheme,
    serverLogo,
    snapshot.branding,
  ]);

  const finishSplash = useCallback(() => {
    markLoginSplashSeen();
    setShowSplash(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasLoginSplashBeenSeen()) {
        setShowSplash(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shouldShow = consumeSessionExpiredNotice(
      searchParams.get("session") === "expired",
    );
    const timer = window.setTimeout(() => setSessionExpired(shouldShow), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const finishLogin = useCallback(() => {
    const nextPath = new URLSearchParams(window.location.search).get("next");
    const destination = isSafeNextPath(nextPath) ? nextPath : "/dashboard";

    router.replace(destination ?? "/dashboard");
    router.refresh();
  }, [router]);

  return (
    <main className="relative h-dvh overflow-hidden bg-background text-foreground">
      {showSplash ? (
        <LoginSplash
          brandName={loginBrandName}
          brandTagline={loginBrandTagline}
          logoUrl={loginLogo}
          onDone={finishSplash}
        />
      ) : null}
      {sessionExpired ? (
        <SessionExpiredDialog onClose={() => setSessionExpired(false)} />
      ) : null}

      <div className="absolute left-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="grid h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)]">
        <LoginDashboardPreview
          snapshot={snapshot}
          brandName={loginBrandName}
          brandTagline={loginBrandTagline}
          logoUrl={loginLogo}
        />

        <section className="flex h-dvh items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <MobileLoginBrand
              brandName={loginBrandName}
              brandTagline={loginBrandTagline}
              logoUrl={loginLogo}
            />

            <div className="mb-8">
              <p className="mb-3 inline-flex rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                دخول المدير
              </p>
              <h2 className="text-3xl font-extrabold leading-tight">
                أهلا بيك، كمّل إدارة متجرك
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                ادخل بياناتك للوصول للطلبات، المنتجات، الفروڡ والتقارير من لوحة
                واحدة.
              </p>
            </div>

            <LoginForm login={login} onSuccess={finishLogin} />
          </div>
        </section>
      </div>
    </main>
  );
}

export function LoginPage({ snapshot }: { snapshot: LoginDashboardSnapshot }) {
  return (
    <DashboardI18nProvider>
      <DashboardAutoTranslate>
        <LoginPageContent snapshot={snapshot} />
      </DashboardAutoTranslate>
    </DashboardI18nProvider>
  );
}
