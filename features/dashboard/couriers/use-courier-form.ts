"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import type { ServiceCity } from "../cities/types";
import { useSnackbar } from "../snackbar";
import {
  availabilityMessage,
  useAvailabilityCheck,
  type AvailabilityField,
  type AvailabilityState,
} from "../users/account-fields";
import type { BackendDashboardUser } from "../users/api-users";
import { removeCourierAvatar, saveCourier } from "./api";
import {
  allowedCourierAvatarTypes,
  courierPayload,
  draftFromCourier,
  maxCourierAvatarSize,
  normalizeCourierDraftField,
  validateCourierDraft,
} from "./domain";
import type { CourierDraft } from "./types";

export function useCourierForm({ cities, courier, onSaved }: {
  cities: ServiceCity[];
  courier: BackendDashboardUser | null;
  onSaved: (user: BackendDashboardUser) => void;
}) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isEditing = Boolean(courier);
  const [draft, setDraft] = useState(() => draftFromCourier(courier, cities));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(draft.avatarUrl);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [focusedAvailabilityField, setFocusedAvailabilityField] = useState<AvailabilityField | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const errors = useMemo(() => validateCourierDraft(draft, isEditing), [draft, isEditing]);
  const deliveryHasErrors = Boolean(errors.vehicleType || errors.plateNumber || errors.serviceCity || errors.maxActiveOrders);
  const usernameAvailability = useAvailabilityCheck({ apiFetch, field: "username", value: draft.username, originalValue: courier?.username ?? null, excludeUserId: courier?.id ?? null });
  const emailAvailability = useAvailabilityCheck({ apiFetch, field: "email", value: draft.email, originalValue: courier?.email ?? null, excludeUserId: courier?.id ?? null });
  const phoneAvailability = useAvailabilityCheck({ apiFetch, field: "phone", value: draft.phone, originalValue: courier?.phone ?? null, excludeUserId: courier?.id ?? null });
  const availabilityStates = {
    username: usernameAvailability.state,
    email: emailAvailability.state,
    phone: phoneAvailability.state,
  } satisfies Record<AvailabilityField, AvailabilityState>;
  const availabilityBlocksSubmit = Object.values(availabilityStates).some((state) =>
    ["invalid", "checking", "taken", "request_error"].includes(state),
  );

  function update(key: keyof CourierDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: normalizeCourierDraftField(key, value) }));
    setError(null);
    setSubmitted(false);
  }

  function errorFor(key: keyof CourierDraft) {
    if (key === "username" || key === "email" || key === "phone") {
      const state = availabilityStates[key];
      if (state === "invalid" || state === "taken" || state === "request_error") {
        return availabilityMessage(key, state);
      }
    }
    return submitted ? errors[key] : undefined;
  }

  function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (!allowedCourierAvatarTypes.has(file.type)) {
      setAvatarFile(null);
      setAvatarPreviewUrl(draft.avatarUrl);
      setAvatarError("ارفع صورة صالحة بصيغة JPG أو JPEG أو PNG أو WEBP.");
      return;
    }
    if (file.size > maxCourierAvatarSize) {
      setAvatarFile(null);
      setAvatarPreviewUrl(draft.avatarUrl);
      setAvatarError("يجب ألا يتجاوز حجم صورة المندوب 5 ميجابايت.");
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function removeAvatar() {
    setAvatarError(null);
    if (!courier) {
      setAvatarFile(null);
      setAvatarPreviewUrl("");
      setDraft((current) => ({ ...current, avatarUrl: "" }));
      return;
    }
    setSaving(true);
    try {
      const saved = await removeCourierAvatar(apiFetch, courier.id);
      setAvatarFile(null);
      setAvatarPreviewUrl("");
      setDraft((current) => ({ ...current, avatarUrl: "" }));
      onSaved(saved);
      showSnackbar({ message: "تم حذف صورة المندوب." });
    } catch (reason) {
      setAvatarError(reason instanceof Error ? reason.message : "تعذر حذف صورة المندوب.");
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || availabilityBlocksSubmit || avatarError) {
      if (deliveryHasErrors) {
        setDeliveryOpen(true);
        setError("بيانات التوصيل مطلوبة.");
      } else if (avatarError) setError("راجع صورة المندوب ثم حاول مرة أخرى.");
      else setError("راجع البيانات المطلوبة ثم حاول مرة أخرى.");
      return;
    }
    setSaving(true);
    setError(null);
    setAvatarError(null);
    try {
      onSaved(await saveCourier(apiFetch, courier, courierPayload(draft, courier), avatarFile));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ بيانات المندوب.");
    } finally {
      setSaving(false);
    }
  }

  return {
    draft,
    isEditing,
    saving,
    error,
    avatarError,
    submitted,
    showPassword,
    setShowPassword,
    avatarFile,
    avatarPreviewUrl,
    deliveryOpen,
    setDeliveryOpen,
    focusedAvailabilityField,
    setFocusedAvailabilityField,
    passwordFocused,
    setPasswordFocused,
    usernameAvailability,
    emailAvailability,
    phoneAvailability,
    availabilityBlocksSubmit,
    deliveryHasErrors,
    update,
    errorFor,
    uploadAvatar,
    removeAvatar,
    submit,
  };
}
