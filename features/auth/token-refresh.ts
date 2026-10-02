import { API_BASE_URL } from "@/lib/api-config";
import { isAccessTokenUsable, type AuthTokens } from "@/lib/auth";

import { AuthServerError } from "./auth-errors";
import {
  fetchWithNetworkError, rateLimitError, responseData,
  throwIfRateLimited, waitForRateLimit,
} from "./auth-http";
import {
  assertSessionIdentity, persistTokens, readAccessToken, readRefreshToken,
  readSessionExpiresAt, readSessionIdentity,
} from "./session-storage";

let refreshPromise: { identity: string | null; promise: Promise<AuthTokens> } | null = null;

function rotatedTokens(original: string, identity: string | null) {
  assertSessionIdentity(identity);
  const refreshToken = readRefreshToken();
  const accessToken = readAccessToken();
  return refreshToken && refreshToken !== original && accessToken && isAccessTokenUsable(accessToken)
    ? { refreshToken, accessToken } : null;
}

async function performRefresh(original: string, identity: string | null) {
  assertSessionIdentity(identity);
  const existing = rotatedTokens(original, identity);
  if (existing) return existing;
  const expiresAt = readSessionExpiresAt();
  if (!expiresAt || expiresAt <= Date.now()) throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");

  const send = () => fetchWithNetworkError(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: original }),
  });
  let response = await send();
  let data = await responseData(response) as Partial<AuthTokens> | null;
  assertSessionIdentity(identity);
  if (response.status === 429) {
    await waitForRateLimit(rateLimitError(response, data).retryAfterSeconds);
    assertSessionIdentity(identity);
    const recovered = rotatedTokens(original, identity);
    if (recovered) return recovered;
    const expiry = readSessionExpiresAt();
    if (!expiry || expiry <= Date.now()) throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
    response = await send();
    data = await responseData(response) as Partial<AuthTokens> | null;
    assertSessionIdentity(identity);
  }
  await throwIfRateLimited(response, data);
  if (response.status >= 500) throw new AuthServerError();

  const recovered = rotatedTokens(original, identity);
  if (recovered) return recovered;
  if (response.status === 401 || response.status === 403) {
    // Browsers without Web Locks may race a tab that is finishing rotation.
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      const tokens = rotatedTokens(original, identity);
      if (tokens) return tokens;
    }
    if (typeof navigator === "undefined" || !navigator.locks) {
      // A slower tab may still be rotating the shared cookie. Keeping the local
      // session cannot grant API access, and avoids erasing that tab's login.
      throw new AuthServerError();
    }
    throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
  }
  if (!response.ok || typeof data?.accessToken !== "string" || typeof data.refreshToken !== "string") {
    throw new AuthServerError();
  }
  assertSessionIdentity(identity);
  const nextTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  persistTokens(nextTokens);
  return nextTokens;
}

export async function refreshTokens() {
  const identity = readSessionIdentity();
  if (refreshPromise?.identity === identity) return refreshPromise.promise;
  const original = readRefreshToken();
  if (!original) throw new Error("لا توجد جلسة قابلة للتجديد.");
  const promise = (async () => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request("yalla-admin-auth-refresh", () => performRefresh(original, identity));
    }
    return performRefresh(original, identity);
  })();
  const current = { identity, promise };
  refreshPromise = current;
  try {
    return await promise;
  } catch (error) {
    // An old response must never clear a newly signed-in account in its caller.
    assertSessionIdentity(identity);
    throw error;
  } finally {
    if (refreshPromise === current) refreshPromise = null;
  }
}
