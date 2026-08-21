import { API_BASE_URL } from "@/lib/api-config";
import type { AuthTokens } from "@/lib/auth";

import { localizedAuthError } from "./auth-errors";
import {
  fetchWithNetworkError,
  rateLimitError,
  responseData,
  throwIfRateLimited,
  waitForRateLimit,
} from "./auth-http";
import {
  persistTokens,
  readRefreshToken,
  readSessionExpiresAt,
} from "./session-storage";

let refreshPromise: Promise<AuthTokens> | null = null;

export async function refreshTokens() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = readRefreshToken();
  if (!refreshToken) throw new Error("لا توجد جلسة قابلة للتجديد.");
  const expiresAt = readSessionExpiresAt();
  if (!expiresAt || expiresAt <= Date.now()) {
    throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
  }

  refreshPromise = (async () => {
    async function sendRefresh() {
      return fetchWithNetworkError(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }

    let response = await sendRefresh();
    let data = (await responseData(response)) as Partial<AuthTokens> | null;
    if (response.status === 429) {
      const error = rateLimitError(response, data);
      await waitForRateLimit(error.retryAfterSeconds);
      const currentExpiry = readSessionExpiresAt();
      if (!currentExpiry || currentExpiry <= Date.now()) {
        throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
      }
      response = await sendRefresh();
      data = (await responseData(response)) as Partial<AuthTokens> | null;
    }
    await throwIfRateLimited(response, data);

    if (
      response.status === 401 ||
      response.status === 403 ||
      typeof data?.accessToken !== "string" ||
      typeof data.refreshToken !== "string"
    ) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
      }
      throw new Error(
        localizedAuthError(data, "تعذر تحديث الجلسة من الخادم."),
      );
    }

    const nextTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    persistTokens(nextTokens);
    return nextTokens;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
