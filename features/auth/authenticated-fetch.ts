import { isAccessTokenUsable } from "@/lib/auth";

import { shouldKeepLocalSession } from "./auth-errors";
import {
  prepareAuthenticatedRequest,
  requestWithAccessToken,
} from "./auth-api";
import { throwIfRateLimited } from "./auth-http";
import { assertSessionIdentity, readAccessToken, readSessionIdentity } from "./session-storage";
import { refreshTokens } from "./token-refresh";

type AuthenticatedFetchOptions = {
  path: string;
  init?: RequestInit;
  scheduleRefresh: (accessToken: string) => void;
  clearSession: (announceExpired?: boolean) => void;
};

export async function authenticatedFetch({
  path,
  init = {},
  scheduleRefresh,
  clearSession,
}: AuthenticatedFetchOptions) {
  const identity = readSessionIdentity();
  const optimizedInit = await prepareAuthenticatedRequest(init);
  assertSessionIdentity(identity);
  const storedAccessToken = readAccessToken();
  let accessToken: string;

  if (
    typeof storedAccessToken === "string" &&
    isAccessTokenUsable(storedAccessToken)
  ) {
    accessToken = storedAccessToken;
  } else {
    try {
      accessToken = (await refreshTokens()).accessToken;
      assertSessionIdentity(identity);
      scheduleRefresh(accessToken);
    } catch (error) {
      assertSessionIdentity(identity);
      if (!shouldKeepLocalSession(error)) clearSession(true);
      throw error;
    }
  }

  let response = await requestWithAccessToken(path, optimizedInit, accessToken);
  assertSessionIdentity(identity);
  await throwIfRateLimited(response);
  if (response.status !== 401) return response;

  try {
    accessToken = (await refreshTokens()).accessToken;
    assertSessionIdentity(identity);
    scheduleRefresh(accessToken);
    response = await requestWithAccessToken(path, optimizedInit, accessToken);
    assertSessionIdentity(identity);
    await throwIfRateLimited(response);
    return response;
  } catch (error) {
    assertSessionIdentity(identity);
    if (!shouldKeepLocalSession(error)) clearSession(true);
    throw error;
  }
}
