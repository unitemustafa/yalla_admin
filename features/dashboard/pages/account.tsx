"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Camera,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { currentUser } from "@/features/dashboard/profile-data";
import { Button, Card, Input, PageTitle } from "@/features/dashboard/primitives";
import { useSnackbar } from "@/features/dashboard/snackbar";

function displayName(firstName?: string, lastName?: string) {
  return [firstName, lastName].filter(Boolean).join(" ") || currentUser.fullName;
}

function splitDisplayName(value: string) {
  const parts = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  return {
    first_name: parts.shift() ?? "",
    last_name: parts.join(" "),
  };
}

function stripWhitespace(value: string) {
  return value.replace(/\s/g, "");
}

function preventWhitespaceInput(event: KeyboardEvent<HTMLInputElement>) {
  if (/\s/.test(event.key)) {
    event.preventDefault();
  }
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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

function localizedPasswordError(value: unknown, fallback: string) {
  const message = firstApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("invalid verification code")) return "كود التحقق غير صحيح.";
  if (normalized.includes("expired")) return "انتهت صلاحية كود التحقق. اطلب كودًا جديدًا.";
  if (normalized.includes("too many invalid attempts")) {
    return "تم تجاوز عدد المحاولات. اطلب كودًا جديدًا.";
  }
  if (normalized.includes("at least 8 characters")) {
    return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  }
  if (normalized.includes("uppercase")) return "أضف حرفًا إنجليزيًا كبيرًا إلى كلمة المرور.";
  if (normalized.includes("number")) return "أضف رقمًا إلى كلمة المرور.";
  if (normalized.includes("special character")) return "أضف رمزًا خاصًا إلى كلمة المرور.";
  if (normalized.includes("spaces are not allowed")) return "المسافات غير مسموحة في كلمة المرور.";
  if (normalized.includes("passwords do not match")) return "تأكيد كلمة المرور غير مطابق.";
  return message;
}

function validatePassword(password: string, confirmation: string) {
  if (password.length < 8) return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  if (/\s/.test(password)) return "المسافات غير مسموحة في كلمة المرور.";
  if (!/[A-Z]/.test(password)) return "أضف حرفًا إنجليزيًا كبيرًا إلى كلمة المرور.";
  if (!/\d/.test(password)) return "أضف رقمًا إلى كلمة المرور.";
  if (!/[^A-Za-z0-9]/.test(password)) return "أضف رمزًا خاصًا إلى كلمة المرور.";
  if (password !== confirmation) return "تأكيد كلمة المرور غير مطابق.";
  return null;
}

export function AccountPage() {
  const router = useRouter();
  const { user, apiFetch, logout, reloadUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [passwordStep, setPasswordStep] = useState<"idle" | "verify">("idle");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [profileName, setProfileName] = useState(() =>
    displayName(user?.first_name, user?.last_name),
  );
  const [avatarUrl, setAvatarUrl] = useState(
    () => user?.avatar_url?.trim() || "/default-user-avatar.svg",
  );
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<"request" | "reset" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const name = displayName(user?.first_name, user?.last_name);
  const email = user?.email ?? currentUser.email;

  useEffect(() => {
    let active = true;

    void reloadUser().then((nextUser) => {
      if (!active) return;
      setProfileName(displayName(nextUser.first_name, nextUser.last_name));
      setAvatarUrl(nextUser.avatar_url?.trim() || "/default-user-avatar.svg");
    }).catch((error: unknown) => {
      if (!active) return;
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "تعذر تحديث بيانات الحساب من الخادم.",
        tone: "danger",
      });
    });

    return () => {
      active = false;
    };
  }, [reloadUser, showSnackbar]);

  async function saveProfile(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (profileSaving) return;

    const nextName = profileName.trim().replace(/\s+/g, " ");
    const nextNameParts = splitDisplayName(nextName);
    if (!nextNameParts.first_name) {
      setProfileError("اكتب الاسم قبل الحفظ.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    try {
      const response = await apiFetch("auth/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextNameParts,
          avatar_url: avatarUrl === "/default-user-avatar.svg" ? "" : avatarUrl,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(firstApiError(data) ?? "تعذر تحديث بيانات الحساب.");
      }

      await reloadUser();
      showSnackbar({ message: "تم تحديث بيانات الحساب." });
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "تعذر تحديث بيانات الحساب.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("اختار ملف صورة صحيح.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("حجم الصورة يجب ألا يزيد عن 2 ميجابايت.");
      return;
    }

    setProfileError("");
    try {
      const nextAvatarUrl = await readImageAsDataUrl(file);
      setAvatarUrl(nextAvatarUrl);
      showSnackbar({ message: "تم اختيار الصورة. اضغط حفظ لتطبيق التغيير." });
    } catch {
      setProfileError("تعذر قراءة الصورة.");
    }
  }

  async function requestResetCode(isResend = false) {
    if (!email || busyAction) return;

    setBusyAction("request");
    setPasswordError("");
    try {
      const response = await apiFetch("auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as {
        dev_otp?: unknown;
      } | null;

      if (!response.ok) {
        throw new Error(
          localizedPasswordError(data, "تعذر إرسال كود التحقق. حاول مرة أخرى."),
        );
      }

      setPasswordStep("verify");
      setOtp("");
      setDevOtp(typeof data?.dev_otp === "string" ? data.dev_otp : null);
      showSnackbar({
        message: isResend ? "تم إرسال كود تحقق جديد." : "تم إرسال كود التحقق إلى بريد الحساب.",
      });
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "تعذر إرسال كود التحقق.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction) return;

    if (!/^\d{6}$/.test(otp)) {
      setPasswordError("أدخل كود التحقق المكوّن من 6 أرقام.");
      return;
    }
    const cleanPassword = stripWhitespace(password);
    const cleanPasswordConfirm = stripWhitespace(passwordConfirm);
    const validationError = validatePassword(cleanPassword, cleanPasswordConfirm);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setBusyAction("reset");
    setPasswordError("");
    try {
      const response = await apiFetch("auth/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          password: cleanPassword,
          password_confirm: cleanPasswordConfirm,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          localizedPasswordError(data, "تعذر تغيير كلمة المرور. حاول مرة أخرى."),
        );
      }

      showSnackbar({ message: "تم تغيير كلمة المرور. سجّل الدخول من جديد." });
      await logout();
      router.replace("/login");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="px-6 py-6">
      <PageTitle
        title="الحساب"
        description="بيانات حساب المدير الحالي وإعدادات الملف الشخصي."
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/20 px-5 py-6 text-center">
            <div className="relative mx-auto size-28 overflow-hidden rounded-xl border bg-background shadow-sm">
              <Image
                alt={name}
                src={avatarUrl}
                fill
                sizes="112px"
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center bg-black/55 text-white transition hover:bg-black/70"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="تغيير الصورة"
                title="تغيير الصورة"
              >
                <Camera className="size-4" />
              </button>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={changeAvatar}
            />
            <h2 className="mt-4 text-xl font-bold">{name}</h2>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" />
              مدير
            </span>
          </div>
          <div className="grid gap-3 p-5 text-sm">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Mail className="size-4 text-primary" />
              <span className="truncate">{email}</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <h3 className="text-lg font-bold">بيانات البروفايل</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              بيانات حساب المدير الحالي متزامنة مع الخادم.
            </p>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
              <label className="grid gap-2 text-sm font-medium">
                الاسم
                <Input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                البريد الإلكتروني
                <Input dir="ltr" className="text-right" value={email} readOnly />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                الصلاحية
                <Input value={user?.role ?? "admin"} readOnly />
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {profileSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
              {profileError ? (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive md:col-span-2"
                >
                  {profileError}
                </p>
              ) : null}
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">الأمان</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              غيّر كلمة المرور باستخدام كود تحقق يُرسل إلى بريد الحساب.
            </p>
            {passwordStep === "idle" ? (
              <Button
                type="button"
                variant="outline"
                className="mt-5"
                disabled={busyAction !== null}
                onClick={() => void requestResetCode()}
              >
                {busyAction === "request" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {busyAction === "request" ? "جارٍ إرسال الكود..." : "تغيير كلمة المرور"}
              </Button>
            ) : (
              <form className="mt-5 grid max-w-xl gap-4" onSubmit={resetPassword}>
                {devOtp ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    كود التطوير المحلي: <code dir="ltr" className="font-bold">{devOtp}</code>
                  </div>
                ) : null}

                <label className="grid gap-2 text-sm font-medium">
                  كود التحقق
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  كلمة المرور الجديدة
                  <Input
                    dir="ltr"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onKeyDown={preventWhitespaceInput}
                    onChange={(event) => setPassword(stripWhitespace(event.target.value))}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  تأكيد كلمة المرور
                  <Input
                    dir="ltr"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onKeyDown={preventWhitespaceInput}
                    onChange={(event) => setPasswordConfirm(stripWhitespace(event.target.value))}
                    required
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  8 أحرف على الأقل، تتضمن حرفًا إنجليزيًا كبيرًا ورقمًا ورمزًا خاصًا، دون مسافات.
                </p>
                {passwordError ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {passwordError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busyAction !== null}>
                    {busyAction === "reset" ? <Loader2 className="size-4 animate-spin" /> : null}
                    {busyAction === "reset" ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyAction !== null}
                    onClick={() => void requestResetCode(true)}
                  >
                    {busyAction === "request" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    إعادة إرسال الكود
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busyAction !== null}
                    onClick={() => {
                      setPasswordStep("idle");
                      setOtp("");
                      setPassword("");
                      setPasswordConfirm("");
                      setDevOtp(null);
                      setPasswordError("");
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            )}
            {passwordStep === "idle" && passwordError ? (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {passwordError}
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
