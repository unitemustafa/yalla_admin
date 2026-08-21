"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "@/features/dashboard/snackbar";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/lib/auth";
import {
  requestAccountResetCode,
  resetAccountPasswordRequest,
} from "./api";
import {
  resetCodeCooldown,
  stripAccountWhitespace,
  validateAccountOtp,
  validateAccountPassword,
} from "./domain";
import type { PasswordBusyAction, PasswordStep } from "./types";

const accountPasswordChangeEnabled = true;

export type PasswordResetController = {
  enabled: boolean;
  step: PasswordStep;
  otp: string;
  password: string;
  passwordConfirm: string;
  error: string;
  resendCooldown: number;
  busyAction: PasswordBusyAction;
  setOtp: (value: string) => void;
  setPassword: (value: string) => void;
  setPasswordConfirm: (value: string) => void;
  requestResetCode: () => Promise<void>;
  resetPassword: () => Promise<void>;
  cancel: () => void;
};

export function usePasswordReset(email: string): PasswordResetController {
  const router = useRouter();
  const { apiFetch, logout } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [step, setStep] = useState<PasswordStep>("idle");
  const [otp, setOtpState] = useState("");
  const [password, setPasswordState] = useState("");
  const [passwordConfirm, setPasswordConfirmState] = useState("");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [busyAction, setBusyAction] = useState<PasswordBusyAction>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function requestResetCode() {
    if (!accountPasswordChangeEnabled) return;
    if (!email || busyAction || resendCooldown > 0) return;

    setBusyAction("request");
    setError("");
    try {
      const data = await requestAccountResetCode(apiFetch, email);
      setStep("verify");
      setOtpState("");
      setResendCooldown(resetCodeCooldown(data));
      showSnackbar({ message: "تم إرسال كود التحقق إلى بريد الحساب." });
    } catch (reason) {
      setError(
        isNetworkError(reason)
          ? NETWORK_ERROR_MESSAGE
          : reason instanceof Error
            ? reason.message
            : "تعذر إرسال كود التحقق.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function resetPassword() {
    if (busyAction) return;

    const otpError = validateAccountOtp(otp);
    if (otpError) {
      setError(otpError);
      return;
    }
    const cleanPassword = stripAccountWhitespace(password);
    const cleanPasswordConfirm = stripAccountWhitespace(passwordConfirm);
    const validationError = validateAccountPassword(
      cleanPassword,
      cleanPasswordConfirm,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusyAction("reset");
    setError("");
    try {
      await resetAccountPasswordRequest(apiFetch, {
        email,
        otp,
        password: cleanPassword,
        password_confirm: cleanPasswordConfirm,
      });
      setStep("idle");
      setOtpState("");
      setPasswordState("");
      setPasswordConfirmState("");
      showSnackbar({
        message: "تم تغيير كلمة المرور. سجل الدخول من جديد.",
      });
      await logout();
      router.replace("/login");
    } catch (reason) {
      setError(
        isNetworkError(reason)
          ? NETWORK_ERROR_MESSAGE
          : reason instanceof Error
            ? reason.message
            : "تعذر تغيير كلمة المرور.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return {
    enabled: accountPasswordChangeEnabled,
    step,
    otp,
    password,
    passwordConfirm,
    error,
    resendCooldown,
    busyAction,
    setOtp(value) {
      setOtpState(value.replace(/\D/g, "").slice(0, 6));
    },
    setPassword(value) {
      setPasswordState(stripAccountWhitespace(value));
    },
    setPasswordConfirm(value) {
      setPasswordConfirmState(stripAccountWhitespace(value));
    },
    requestResetCode,
    resetPassword,
    cancel() {
      setStep("idle");
      setOtpState("");
      setPasswordState("");
      setPasswordConfirmState("");
      setError("");
    },
  };
}
