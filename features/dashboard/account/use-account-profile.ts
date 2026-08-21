"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  DASHBOARD_PLACEHOLDERS,
  imageOrPlaceholder,
} from "@/features/dashboard/placeholders";
import { useSnackbar } from "@/features/dashboard/snackbar";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/lib/auth";
import {
  removeAccountAvatarRequest,
  saveAccountProfileRequest,
} from "./api";
import {
  accountDisplayName,
  accountNamePayload,
  validateAvatarFile,
} from "./domain";

const defaultAvatarSrc = DASHBOARD_PLACEHOLDERS.user;

export type AccountProfileController = {
  name: string;
  email: string;
  profileName: string;
  profileEmail: string;
  avatarUrl: string;
  avatarPreviewUrl: string;
  profileError: string;
  profileSaving: boolean;
  canRemoveAvatar: boolean;
  setProfileName: (value: string) => void;
  selectAvatar: (file: File | null) => void;
  saveProfile: () => Promise<void>;
  removeAvatar: () => Promise<void>;
};

function accountAvatarSrc(
  user?: { avatar_url?: string | null } | null,
) {
  return imageOrPlaceholder(user?.avatar_url, "user");
}

export function useAccountProfile(): AccountProfileController {
  const { user, apiFetch, reloadUser, updateUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const objectUrlRef = useRef<string | null>(null);
  const [profileName, setProfileName] = useState(() =>
    accountDisplayName(user?.first_name, user?.last_name, user?.username),
  );
  const [profileEmail, setProfileEmail] = useState(() => user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(() => accountAvatarSrc(user));
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const name = accountDisplayName(
    user?.first_name,
    user?.last_name,
    user?.username,
  );
  const email = profileEmail || user?.email || "—";

  useEffect(() => {
    let active = true;
    void reloadUser()
      .then((nextUser) => {
        if (!active) return;
        setProfileName(
          accountDisplayName(
            nextUser.first_name,
            nextUser.last_name,
            nextUser.username,
          ),
        );
        setProfileEmail(nextUser.email);
        setAvatarUrl(accountAvatarSrc(nextUser));
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

  function selectAvatar(file: File | null) {
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setProfileError(validation.message);
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextPreviewUrl;
    setSelectedAvatar(file);
    setAvatarPreviewUrl(nextPreviewUrl);
    setProfileError("");
    showSnackbar({
      message: "تم اختيار الصورة. اضغط حفظ لتطبيق التغيير.",
    });
  }

  async function saveProfile() {
    if (profileSaving) return;
    const nextNameParts = accountNamePayload(profileName, user);
    if (!nextNameParts.first_name) {
      setProfileError("اكتب الاسم قبل الحفظ.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    try {
      const returnedUser = await saveAccountProfileRequest(
        apiFetch,
        nextNameParts,
        selectedAvatar,
      );
      updateUser(returnedUser);

      try {
        const refreshedUser = await reloadUser();
        setProfileName(
          accountDisplayName(
            refreshedUser.first_name,
            refreshedUser.last_name,
            refreshedUser.username,
          ),
        );
        setProfileEmail(refreshedUser.email);
        setAvatarUrl(accountAvatarSrc(refreshedUser));
        showSnackbar({ message: "تم تحديث بيانات الحساب." });
      } catch {
        setProfileName(
          accountDisplayName(
            returnedUser.first_name,
            returnedUser.last_name,
            returnedUser.username,
          ),
        );
        setProfileEmail(returnedUser.email);
        setAvatarUrl(accountAvatarSrc(returnedUser));
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
      const returnedUser = await removeAccountAvatarRequest(apiFetch);
      updateUser(returnedUser);
      setAvatarUrl(defaultAvatarSrc);
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

  return {
    name,
    email,
    profileName,
    profileEmail,
    avatarUrl,
    avatarPreviewUrl,
    profileError,
    profileSaving,
    canRemoveAvatar: avatarUrl !== defaultAvatarSrc || selectedAvatar !== null,
    setProfileName,
    selectAvatar,
    saveProfile,
    removeAvatar,
  };
}
