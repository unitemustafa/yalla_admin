import { API_BASE_URL } from "@/lib/api-config";
import { optimizeImageRequestInit } from "@/lib/image-upload";
import type { AuthSession, AuthUser } from "@/lib/auth";

import { localizedAuthError } from "./auth-errors";
import {
  fetchWithNetworkError,
  responseData,
  throwIfRateLimited,
} from "./auth-http";
import { clearSessionCookies } from "./session-storage";

export type LoginInput = {
  email: string;
  password: string;
  remember: boolean;
};

export async function loginAdmin(input: LoginInput) {
  const response = await fetchWithNetworkError(
    `${API_BASE_URL}/auth/login/admin/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        remember: input.remember,
      }),
    },
  );
  const data = (await responseData(response)) as Partial<AuthSession> | null;
  await throwIfRateLimited(response, data);

  if (!response.ok) {
    throw new Error(
      localizedAuthError(data, "تعذر تسجيل الدخول. حاول مرة أخرى."),
    );
  }
  if (
    typeof data?.accessToken !== "string" ||
    typeof data.refreshToken !== "string" ||
    !data.user
  ) {
    throw new Error("استجابة تسجيل الدخول غير مكتملة.");
  }
  if (data.user.role !== "admin") {
    clearSessionCookies();
    throw new Error("هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.");
  }

  return data as AuthSession;
}

export async function logoutAdmin(
  accessToken: string | undefined,
  refreshToken: string | undefined,
) {
  if (!accessToken || !refreshToken) return;

  await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

export async function currentUserFromResponse(
  response: Response,
  requireAdmin: boolean,
) {
  const data = await responseData(response);
  await throwIfRateLimited(response, data);

  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(
      localizedAuthError(data, "تعذر تحديث بيانات الحساب من الخادم."),
    );
  }

  const nextUser = data as AuthUser;
  if (requireAdmin && nextUser.role !== "admin") {
    throw new Error("هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.");
  }

  return nextUser;
}

export async function fetchCurrentAdminUser(accessToken: string) {
  const response = await fetchWithNetworkError(`${API_BASE_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return currentUserFromResponse(response, true);
}

export async function prepareAuthenticatedRequest(init: RequestInit) {
  return optimizeImageRequestInit(init);
}

export async function requestWithAccessToken(
  path: string,
  init: RequestInit,
  accessToken: string,
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetchWithNetworkError(
    path.startsWith("http")
      ? path
      : `${API_BASE_URL}/${path.replace(/^\/+/, "")}`,
    { ...init, headers },
  );
}
