import type { AuthUser } from "@/lib/auth";
import { localizedPasswordError, localizedProfileError } from "./domain";
import type { AccountNameParts, ResetCodeResponse } from "./types";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

const avatarUploadField = "avatar";

async function accountResponseData(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return (await response.json().catch(() => null)) as unknown;
}

export async function saveAccountProfileRequest(
  apiFetch: ApiFetch,
  name: AccountNameParts,
  avatar: File | null,
) {
  const response = avatar
    ? await apiFetch("auth/me/", {
        method: "PATCH",
        body: (() => {
          const formData = new FormData();
          formData.append(avatarUploadField, avatar);
          formData.set("first_name", name.first_name);
          formData.set("last_name", name.last_name);
          return formData;
        })(),
      })
    : await apiFetch("auth/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name),
      });
  const data = await accountResponseData(response);

  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(localizedProfileError(data, "تعذر تحديث بيانات الحساب."));
  }
  return data as AuthUser;
}

export async function removeAccountAvatarRequest(apiFetch: ApiFetch) {
  const response = await apiFetch("auth/me/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remove_avatar: true }),
  });
  const data = await accountResponseData(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(localizedProfileError(data, "تعذر حذف صورة الحساب."));
  }
  return data as AuthUser;
}

export async function requestAccountResetCode(
  apiFetch: ApiFetch,
  email: string,
) {
  const response = await apiFetch("auth/forgot-password/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = (await accountResponseData(response)) as ResetCodeResponse;
  if (!response.ok) {
    throw new Error(
      localizedPasswordError(data, "تعذر إرسال كود التحقق. حاول مرة أخرى."),
    );
  }
  return data;
}

export async function resetAccountPasswordRequest(
  apiFetch: ApiFetch,
  payload: {
    email: string;
    otp: string;
    password: string;
    password_confirm: string;
  },
) {
  const response = await apiFetch("auth/reset-password/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await accountResponseData(response);
  if (!response.ok) {
    throw new Error(
      localizedPasswordError(data, "تعذر تغيير كلمة المرور. حاول مرة أخرى."),
    );
  }
}
