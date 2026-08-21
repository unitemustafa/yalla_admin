import { isAccessTokenUsable } from "@/lib/auth";

import { shouldKeepLocalSession } from "./auth-errors";
import {
  prepareAuthenticatedRequest,
  requestWithAccessToken,
} from "./auth-api";
import { throwIfRateLimited } from "./auth-http";
import { readAccessToken } from "./session-storage";
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
  const optimizedInit = await prepareAuthenticatedRequest(init);
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
      scheduleRefresh(accessToken);
    } catch (error) {
      if (!shouldKeepLocalSession(error)) clearSession(true);
      throw error;
    }
  }

  let response = await requestWithAccessToken(path, optimizedInit, accessToken);
  await throwIfRateLimited(response);
  if (response.status !== 401) return response;

  try {
    accessToken = (await refreshTokens()).accessToken;
    scheduleRefresh(accessToken);
    response = await requestWithAccessToken(path, optimizedInit, accessToken);
    await throwIfRateLimited(response);
    return response;
  } catch (error) {
    if (!shouldKeepLocalSession(error)) clearSession(true);
    throw error;
  }
}
