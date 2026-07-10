"use client";

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
import { DashboardImage } from "@/features/dashboard/dashboard-image";
import { DASHBOARD_PLACEHOLDERS, imageOrPlaceholder } from "@/features/dashboard/placeholders";
import { useSnackbar } from "@/features/dashboard/snackbar";
import {
  isNetworkError,
  NETWORK_ERROR_MESSAGE,
  type AuthUser,
} from "@/lib/auth";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCOUNT_PASSWORD_CHANGE_ENABLED = true;
const DEFAULT_AVATAR_SRC = DASHBOARD_PLACEHOLDERS.user;
const AVATAR_UPLOAD_FIELD = "avatar";

function displayName(firstName?: string, lastName?: string, username?: string) {
  return [firstName, lastName].filter(Boolean).join(" ") || username || currentUser.fullName;
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

function avatarSrc(user?: Pick<AuthUser, "avatar_url"> | null) {
  return imageOrPlaceholder(user?.avatar_url, "user");
}

async function responseData(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return (await response.json().catch(() => null)) as unknown;
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

function localizedProfileError(value: unknown, fallback: string) {
  const message = firstApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase().replace(/\.$/, "");
  if (
    normalized === "user with this email already exists" ||
    normalized === "an account with this email already exists"
  ) {
    return "البريد الإلكتروني مسجل بالفعل.";
  }
  if (message === "Upload a valid profile photo: JPG, JPEG, PNG, or WEBP.") {
    return "ارفع صورة صالحة بصيغة JPG أو JPEG أو PNG أو WEBP.";
  }
  if (message === "Profile photo must be 5 MB or smaller.") {
    return "يجب ألا يتجاوز حجم الصورة الشخصية 5 ميجابايت.";
  }
  return message;
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
  const { user, apiFetch, logout, reloadUser, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [passwordStep, setPasswordStep] = useState<"idle" | "verify">("idle");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [profileName, setProfileName] = useState(() =>
    displayName(user?.first_name, user?.last_name, user?.username),
  );
  const [profileEmail, setProfileEmail] = useState(() => user?.email ?? currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(() => avatarSrc(user));
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<"request" | "reset" | null>(null);
  const name = displayName(user?.first_name, user?.last_name, user?.username);
  const email = profileEmail || user?.email || currentUser.email;

  useEffect(() => {
    let active = true;

    void reloadUser()
      .then((nextUser) => {
        if (!active) return;
        setProfileName(displayName(nextUser.first_name, nextUser.last_name, nextUser.username));
        setProfileEmail(nextUser.email);
        setAvatarUrl(avatarSrc(nextUser));
      })
      .catch((error: unknown) => {
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function clearAvatarSelection() {
    setSelectedAvatar(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAvatarPreviewUrl("");
  }

  async function saveProfile(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (profileSaving) return;

    const nextName = profileName.trim().replace(/\s+/g, " ");
    const nextNameParts =
      nextName === displayName(user?.first_name, user?.last_name, user?.username)
        ? {
            first_name: user?.first_name ?? "",
            last_name: user?.last_name ?? "",
          }
        : splitDisplayName(nextName);
    if (!nextNameParts.first_name) {
      setProfileError("اكتب الاسم قبل الحفظ.");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    try {
      const textPayload = {
        ...nextNameParts,
      };
      const response = selectedAvatar
        ? await apiFetch("auth/me/", {
            method: "PATCH",
            body: (() => {
              const formData = new FormData();
              formData.append(AVATAR_UPLOAD_FIELD, selectedAvatar);
              formData.set("first_name", textPayload.first_name);
              formData.set("last_name", textPayload.last_name);
              return formData;
            })(),
          })
        : await apiFetch("auth/me/", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(textPayload),
          });
      const data = await responseData(response);

      if (!response.ok || !data || typeof data !== "object") {
        throw new Error(
          localizedProfileError(data, "تعذر تحديث بيانات الحساب."),
        );
      }

      const returnedUser = data as AuthUser;
      updateUser(returnedUser);

      try {
        const refreshedUser = await reloadUser();
        setProfileName(
          displayName(refreshedUser.first_name, refreshedUser.last_name, refreshedUser.username),
        );
        setProfileEmail(refreshedUser.email);
        setAvatarUrl(avatarSrc(refreshedUser));
        showSnackbar({ message: "تم تحديث بيانات الحساب." });
      } catch {
        setProfileName(
          displayName(returnedUser.first_name, returnedUser.last_name, returnedUser.username),
        );
        setProfileEmail(returnedUser.email);
        setAvatarUrl(avatarSrc(returnedUser));
        showSnackbar({
          message: "تم حفظ البيانات، لكن تعذر إعادة تحميل حالة الحساب الآن.",
          tone: "info",
        });
      }

      clearAvatarSelection();
    } catch (error) {
      clearAvatarSelection();
      setProfileError(
        isNetworkError(error)
          ? NETWORK_ERROR_MESSAGE
          : error instanceof Error
            ? error.message
            : "تعذر تحديث بيانات الحساب.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function removeAvatar() {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileError("");
    try {
      const response = await apiFetch("auth/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove_avatar: true }),
      });
      const data = await responseData(response);
      if (!response.ok || !data || typeof data !== "object") {
        throw new Error(localizedProfileError(data, "تعذر حذف صورة الحساب."));
      }
      updateUser(data as AuthUser);
      setAvatarUrl(DEFAULT_AVATAR_SRC);
      clearAvatarSelection();
      showSnackbar({ message: "تم حذف صورة الحساب." });
    } catch (error) {
      setProfileError(
        isNetworkError(error)
          ? NETWORK_ERROR_MESSAGE
          : error instanceof Error
            ? error.message
            : "تعذر حذف صورة الحساب.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setProfileError("ارفع صورة صالحة بصيغة JPG أو JPEG أو PNG أو WEBP.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setProfileError("يجب ألا يتجاوز حجم الصورة الشخصية 5 ميجابايت.");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextPreviewUrl;
    setSelectedAvatar(file);
    setAvatarPreviewUrl(nextPreviewUrl);
    setProfileError("");
    showSnackbar({ message: "تم اختيار الصورة. اضغط حفظ لتطبيق التغيير." });
  }

  async function requestResetCode() {
    if (!ACCOUNT_PASSWORD_CHANGE_ENABLED) return;
    if (!email || busyAction || resendCooldown > 0) return;

    setBusyAction("request");
    setPasswordError("");
    try {
      const response = await apiFetch("auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await responseData(response)) as {
        resend_after_seconds?: unknown;
        retry_after_seconds?: unknown;
      } | null;

      if (!response.ok) {
        throw new Error(
          localizedPasswordError(data, "تعذر إرسال كود التحقق. حاول مرة أخرى."),
        );
      }

      setPasswordStep("verify");
      setOtp("");
      const cooldown =
        typeof data?.resend_after_seconds === "number"
          ? data.resend_after_seconds
          : typeof data?.retry_after_seconds === "number"
            ? data.retry_after_seconds
            : 30;
      setResendCooldown(cooldown);
      showSnackbar({
        message: "تم إرسال كود التحقق إلى بريد الحساب.",
      });
    } catch (error) {
      setPasswordError(
        isNetworkError(error)
          ? NETWORK_ERROR_MESSAGE
          : error instanceof Error
            ? error.message
            : "تعذر إرسال كود التحقق.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction) return;

    if (!/^\d{6}$/.test(otp)) {
      setPasswordError("أدخل كود التحقق المكون من 6 أرقام.");
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
      const data = await responseData(response);

      if (!response.ok) {
        throw new Error(
          localizedPasswordError(data, "تعذر تغيير كلمة المرور. حاول مرة أخرى."),
        );
      }

      setPasswordStep("idle");
      setOtp("");
      setPassword("");
      setPasswordConfirm("");
      showSnackbar({ message: "تم تغيير كلمة المرور. سجل الدخول من جديد." });
      await logout();
      router.replace("/login");
    } catch (error) {
      setPasswordError(
        isNetworkError(error)
          ? NETWORK_ERROR_MESSAGE
          : error instanceof Error
            ? error.message
            : "تعذر تغيير كلمة المرور.",
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
              <DashboardImage
                alt={name}
                src={avatarPreviewUrl || avatarUrl}
                placeholderType="user"
                width={112}
                height={112}
                sizes="112px"
                className="size-full"
                imageClassName="object-cover"
              />
              <button
                type="button"
                className="absolute inset-x-0 bottom-0 z-20 flex h-9 items-center justify-center bg-black/55 text-white transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={changeAvatar}
            />
            {avatarUrl !== DEFAULT_AVATAR_SRC || selectedAvatar ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 text-destructive hover:text-destructive"
                disabled={profileSaving}
                onClick={() => void removeAvatar()}
              >
                حذف الصورة
              </Button>
            ) : null}
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
              إدارة بيانات حساب المدير الحالي
            </p>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
              <label className="grid gap-2 text-sm font-medium">
                الاسم
                <Input
                  data-testid="account-name-input"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                البريد الإلكتروني
                <Input
                  data-testid="account-email-input"
                  dir="ltr"
                  className="text-right"
                  value={profileEmail}
                  readOnly
                />
              </label>
              <div className="flex items-end gap-2 md:col-span-2">
                <Button type="submit" disabled={profileSaving} className="w-full">
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
              غير كلمة المرور باستخدام كود تحقق يرسل إلى بريد الحساب.
            </p>
            {passwordStep === "idle" ? (
              <Button
                data-testid="change-password-button"
                type="button"
                variant="outline"
                className="mt-5"
                title={ACCOUNT_PASSWORD_CHANGE_ENABLED ? undefined : "غير متاح حالياً"}
                disabled={!ACCOUNT_PASSWORD_CHANGE_ENABLED || busyAction !== null}
                onClick={() => void requestResetCode()}
              >
                {busyAction === "request" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {busyAction === "request" ? "جاري إرسال الكود..." : "تغيير كلمة المرور"}
              </Button>
            ) : (
              <form className="mt-5 grid max-w-xl gap-4" onSubmit={resetPassword}>
                <label className="grid gap-2 text-sm font-medium">
                  كود التحقق
                  <Input
                    data-testid="password-otp-input"
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
                    data-testid="new-password-input"
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
                    data-testid="confirm-password-input"
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
                  <Button
                    data-testid="save-password-button"
                    type="submit"
                    disabled={busyAction !== null}
                  >
                    {busyAction === "reset" ? <Loader2 className="size-4 animate-spin" /> : null}
                    {busyAction === "reset" ? "جاري الحفظ..." : "حفظ كلمة المرور"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyAction !== null || resendCooldown > 0}
                    onClick={() => void requestResetCode()}
                  >
                    {busyAction === "request" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {resendCooldown > 0
                      ? `إعادة الإرسال خلال ${resendCooldown}s`
                      : "إعادة إرسال الكود"}
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
