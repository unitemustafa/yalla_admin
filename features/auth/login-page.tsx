"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  BarChart3,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { logoSrc } from "@/features/dashboard/data";
import { DashboardAutoTranslate } from "@/features/dashboard/auto-translate";
import { DashboardI18nProvider } from "@/features/dashboard/i18n";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  hasLoginSplashBeenSeen,
  LoginSplash,
  markLoginSplashSeen,
} from "@/features/auth/login-splash";
import { useAuth } from "@/features/auth/auth-provider";
import type { LoginDashboardSnapshot } from "@/features/dashboard/static-data";
import { AUTH_STORAGE_KEYS, isSafeNextPath } from "@/lib/auth";

const productImages = [
  "https://bucket.ammenu.com/yalla-market/items/1778576027822-i19a0pn483.webp",
  "https://bucket.ammenu.com/yalla-market/items/1778575947135-br72ie6ml76.webp",
  "https://bucket.ammenu.com/yalla-market/items/1778544634562-e47zuvmo7jt.webp",
  "https://bucket.ammenu.com/yalla-market/items/1778544524971-c0nqlzwbv1m.webp",
];

const supportWhatsAppUrl = "https://web.whatsapp.com/send?phone=201016487371";

function stripWhitespace(value: string) {
  return value.replace(/\s/g, "");
}

function preventWhitespaceInput(event: KeyboardEvent<HTMLInputElement>) {
  if (/\s/.test(event.key)) {
    event.preventDefault();
  }
}

function cleanWhitespaceInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const nextValue = stripWhitespace(input.value);
  if (input.value !== nextValue) {
    input.value = nextValue;
  }
}

function LoginPageContent({
  snapshot,
}: {
  snapshot: LoginDashboardSnapshot;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const stats = [
    { label: "طلبات اليوم", value: String(snapshot.todayOrders), icon: PackageCheck },
    { label: "مدن متاحة", value: String(snapshot.availableCities), icon: MapPin },
    { label: "مناطق توصيل", value: String(snapshot.deliveryZones), icon: Truck },
  ];

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
    let shouldShow = searchParams.get("session") === "expired";

    try {
      const expiresAt = Number(
        localStorage.getItem(
          AUTH_STORAGE_KEYS.temporarySessionExpiresAt,
        ),
      );
      shouldShow =
        shouldShow ||
        localStorage.getItem(AUTH_STORAGE_KEYS.sessionExpiredNotice) ===
          "true" ||
        (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= Date.now());
      localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiredNotice);
      if (expiresAt <= Date.now()) {
        localStorage.removeItem(
          AUTH_STORAGE_KEYS.temporarySessionExpiresAt,
        );
      }
    } catch {
      // The login screen remains usable when browser storage is unavailable.
    }

    const timer = window.setTimeout(() => setSessionExpired(shouldShow), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    try {
      await login({
        email: stripWhitespace(String(formData.get("email") ?? "")),
        password: stripWhitespace(String(formData.get("password") ?? "")),
        remember: formData.get("remember") === "on",
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تسجيل الدخول. حاول مرة أخرى.",
      );
      setPending(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next");
    const destination = isSafeNextPath(nextPath) ? nextPath! : "/dashboard";

    router.replace(destination);
    router.refresh();
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-background text-foreground">
      {showSplash ? <LoginSplash onDone={finishSplash} /> : null}
      {sessionExpired ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 px-5 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-expired-title"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center text-card-foreground shadow-2xl"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LockKeyhole className="size-7" />
            </span>
            <h2
              aria-hidden="true"
              className="mt-4 hidden text-2xl font-extrabold"
            >
              انتهت الجلسة
            </h2>
            <h2 id="session-expired-title" className="mt-4 text-2xl font-extrabold">
              انتهت الجلسة
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              انتهت جلستك. سجل الدخول من جديد للمتابعة، ويمكنك تفعيل
              &quot;افتكرني&quot; للاحتفاظ بتسجيل الدخول لمدة أطول.
            </p>
            <p className="hidden">
              سجّل الدخول من جديد للمتابعة. فعّل «افتكرني» للاحتفاظ
              بتسجيل الدخول لمدة 30 يومًا حتى بعد غلق التاب.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              onClick={() => setSessionExpired(false)}
            >
              <span>تسجيل الدخول</span>
              <span className="hidden">
              تسجيل الدخول
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="absolute left-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="grid h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)]">
        <section className="relative hidden overflow-hidden bg-primary px-10 py-8 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:px-14">
          <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_left,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:54px_54px]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,hsl(190_88%_8%/0.28),transparent)]" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                alt="Yalla Market"
                src={logoSrc}
                width={56}
                height={56}
                priority
                className="size-14 rounded-xl border border-white/20 object-cover shadow-lg"
              />
              <div>
                <p className="text-xl font-bold leading-6">يلا ماركت</p>
                <p className="text-sm text-white/75">لوحة التحكم</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80">
              <ShieldCheck className="size-4" />
              آمن وسريع
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
            <div className="mb-8 grid grid-cols-3 gap-3">
              {stats.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur"
                  >
                    <Icon className="mb-5 size-5 text-amber-200" />
                    <p className="text-3xl font-extrabold leading-none">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs font-medium text-white/75">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/15 backdrop-blur">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70">نظرة سريعة</p>
                  <h1 className="mt-1 text-3xl font-extrabold leading-tight xl:text-4xl">
                    إدارة الطلبات والمنتجات والفروع من مكان واحد
                  </h1>
                </div>
                <BarChart3 className="size-9 shrink-0 text-amber-200" />
              </div>

              <div>
                <div className="grid grid-cols-4 gap-3">
                  {productImages.map((src, index) => (
                    <Image
                      key={src}
                      alt={`منتج من يلا ماركت ${index + 1}`}
                      src={src}
                      width={240}
                      height={170}
                      quality={95}
                      sizes="(min-width: 1280px) 180px, 22vw"
                      className="aspect-[4/3] w-full rounded-lg border border-white/20 bg-white object-cover shadow-lg shadow-black/10"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </section>

        <section className="flex h-dvh items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <Image
                alt="Yalla Market"
                src={logoSrc}
                width={52}
                height={52}
                priority
                className="size-12 rounded-xl object-cover shadow"
              />
              <div>
                <p className="text-xl font-bold">يلا ماركت</p>
                <p className="text-sm text-muted-foreground">لوحة التحكم</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 inline-flex rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                دخول المدير
              </p>
              <h2 className="text-3xl font-extrabold leading-tight">
                أهلا بيك، كمّل إدارة متجرك
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                ادخل بياناتك للوصول للطلبات، المنتجات، الفروڡ والتقارير من لوحة واحدة.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block text-sm font-bold">
                البريد الإلكتروني
                <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-border bg-card px-3 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                  <Mail className="size-5 text-muted-foreground" />
                  <input
                    name="email"
                    type="email"
                    placeholder="البريد الإلكتروني"
                    required
                    dir="ltr"
                    className="h-full min-w-0 flex-1 bg-transparent text-right text-base outline-none placeholder:text-sm placeholder:font-bold placeholder:text-muted-foreground"
                    autoComplete="email"
                    onKeyDown={preventWhitespaceInput}
                    onInput={cleanWhitespaceInput}
                  />
                </span>
              </label>

              <label className="block text-sm font-bold">
                كلمة المرور
                <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-border bg-card px-3 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                  <LockKeyhole className="size-5 text-muted-foreground" />
                  <input
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="كلمة المرور"
                    required
                    className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-sm placeholder:font-bold placeholder:text-muted-foreground"
                    autoComplete="current-password"
                    onKeyDown={preventWhitespaceInput}
                    onInput={cleanWhitespaceInput}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                    title={
                      passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                  >
                    {passwordVisible ? (
                      <Eye className="size-5" />
                    ) : (
                      <EyeOff className="size-5" />
                    )}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <label className="flex cursor-pointer items-center gap-2 font-bold">
                  <input
                    name="remember"
                    type="checkbox"
                    defaultChecked
                    className="size-4 rounded border-border accent-primary"
                  />
                  افتكرني
                </label>
                <a
                  href={supportWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 font-bold text-primary transition hover:text-primary/80"
                >
                  <MessageCircle className="size-4" />
                  الدعم الفني
                </a>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "جاري الدخول..." : "دخول"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export function LoginPage({
  snapshot,
}: {
  snapshot: LoginDashboardSnapshot;
}) {
  return (
    <DashboardI18nProvider>
      <DashboardAutoTranslate>
        <LoginPageContent snapshot={snapshot} />
      </DashboardAutoTranslate>
    </DashboardI18nProvider>
  );
}
