"use client";

import type { KeyboardEvent } from "react";
import { KeyRound, Loader2, RefreshCw } from "lucide-react";

import { Button, Card, Input } from "@/features/dashboard/primitives";
import type { PasswordResetController } from "./use-password-reset";

function preventWhitespaceInput(event: KeyboardEvent<HTMLInputElement>) {
  if (/\s/.test(event.key)) event.preventDefault();
}

export function AccountSecurityCard({
  passwordReset,
}: {
  passwordReset: PasswordResetController;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">الأمان</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        غير كلمة المرور باستخدام كود تحقق يرسل إلى بريد الحساب.
      </p>
      {passwordReset.step === "idle" ? (
        <Button
          className="mt-5"
          data-testid="change-password-button"
          disabled={!passwordReset.enabled || passwordReset.busyAction !== null}
          onClick={() => void passwordReset.requestResetCode()}
          title={passwordReset.enabled ? undefined : "غير متاح حالياً"}
          type="button"
          variant="outline"
        >
          {passwordReset.busyAction === "request" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {passwordReset.busyAction === "request"
            ? "جاري إرسال الكود..."
            : "تغيير كلمة المرور"}
        </Button>
      ) : (
        <form
          className="mt-5 grid max-w-xl gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void passwordReset.resetPassword();
          }}
        >
          <label className="grid gap-2 text-sm font-medium">
            كود التحقق
            <Input
              autoComplete="one-time-code"
              data-testid="password-otp-input"
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => passwordReset.setOtp(event.target.value)}
              pattern="[0-9]{6}"
              required
              value={passwordReset.otp}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            كلمة المرور الجديدة
            <Input
              autoComplete="new-password"
              data-testid="new-password-input"
              dir="ltr"
              onChange={(event) => passwordReset.setPassword(event.target.value)}
              onKeyDown={preventWhitespaceInput}
              required
              type="password"
              value={passwordReset.password}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            تأكيد كلمة المرور
            <Input
              autoComplete="new-password"
              data-testid="confirm-password-input"
              dir="ltr"
              onChange={(event) =>
                passwordReset.setPasswordConfirm(event.target.value)
              }
              onKeyDown={preventWhitespaceInput}
              required
              type="password"
              value={passwordReset.passwordConfirm}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            8 أحرف على الأقل، تتضمن حرفًا إنجليزيًا كبيرًا ورقمًا ورمزًا خاصًا،
            دون مسافات.
          </p>
          {passwordReset.error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {passwordReset.error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="save-password-button"
              disabled={passwordReset.busyAction !== null}
              type="submit"
            >
              {passwordReset.busyAction === "reset" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {passwordReset.busyAction === "reset"
                ? "جاري الحفظ..."
                : "حفظ كلمة المرور"}
            </Button>
            <Button
              disabled={
                passwordReset.busyAction !== null ||
                passwordReset.resendCooldown > 0
              }
              onClick={() => void passwordReset.requestResetCode()}
              type="button"
              variant="outline"
            >
              {passwordReset.busyAction === "request" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {passwordReset.resendCooldown > 0
                ? `إعادة الإرسال خلال ${passwordReset.resendCooldown}s`
                : "إعادة إرسال الكود"}
            </Button>
            <Button
              disabled={passwordReset.busyAction !== null}
              onClick={passwordReset.cancel}
              type="button"
              variant="ghost"
            >
              إلغاء
            </Button>
          </div>
        </form>
      )}
      {passwordReset.step === "idle" && passwordReset.error ? (
        <p
          className="mt-3 text-sm font-medium text-destructive"
          role="alert"
        >
          {passwordReset.error}
        </p>
      ) : null}
    </Card>
  );
}
