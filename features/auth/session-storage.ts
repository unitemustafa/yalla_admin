import { Cookies } from "react-cookie";

import {
  AUTH_COOKIE_NAMES,
  AUTH_STORAGE_KEYS,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
} from "@/lib/auth";

import {
  parseSessionExpiresAt,
  remainingSessionMaxAge,
  REMEMBER_MAX_AGE_SECONDS,
  sessionExpiredNoticeState,
  TEMPORARY_MAX_AGE_SECONDS,
} from "./session-domain";

const cookies = new Cookies();

function sessionExpiresAt() {
  try {
    return parseSessionExpiresAt(
      localStorage.getItem(AUTH_STORAGE_KEYS.sessionExpiresAt),
    );
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
    maxAge: remainingSessionMaxAge(sessionExpiresAt(), Date.now()),
  };
}

function removeOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
  };
}

export function readRemember() {
  return cookies.get(AUTH_COOKIE_NAMES.remember, { doNotParse: true }) === "true";
}

export function hasTemporaryTabSession() {
  try {
    return (
      sessionStorage.getItem(AUTH_STORAGE_KEYS.temporarySessionActive) ===
      "true"
    );
  } catch {
    return false;
  }
}

export function readSessionExpiresAt() {
  return sessionExpiresAt();
}

function persistSessionLifetime(remember: boolean) {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiredNotice);
    localStorage.setItem(
      AUTH_STORAGE_KEYS.sessionExpiresAt,
      String(
        Date.now() +
          (remember
            ? REMEMBER_MAX_AGE_SECONDS
            : TEMPORARY_MAX_AGE_SECONDS) *
            1000,
      ),
    );
    if (remember) {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.temporarySessionActive);
      return;
    }

    sessionStorage.setItem(AUTH_STORAGE_KEYS.temporarySessionActive, "true");
  } catch {
    // Cookies still enforce the maximum lifetime if storage is unavailable.
  }
}

export function clearSessionLifetime(announceExpired: boolean) {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.temporarySessionActive);
    localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiresAt);
    if (announceExpired) {
      localStorage.setItem(AUTH_STORAGE_KEYS.sessionExpiredNotice, "true");
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiredNotice);
    }
  } catch {
    // Storage failures must not block logout or session cleanup.
  }
}

export function persistTokens(tokens: AuthTokens) {
  const options = cookieOptions();
  cookies.set(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, options);
  cookies.set(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, options);
}

export function persistSession(session: AuthSession, remember: boolean) {
  persistSessionLifetime(remember);
  const options = cookieOptions();
  persistTokens(session);
  cookies.set(AUTH_COOKIE_NAMES.user, session.user, options);
  cookies.set(AUTH_COOKIE_NAMES.remember, String(remember), options);
}

export function persistUser(user: AuthUser) {
  cookies.set(AUTH_COOKIE_NAMES.user, user, cookieOptions());
}

export function clearSessionCookies() {
  const options = removeOptions();
  Object.values(AUTH_COOKIE_NAMES).forEach((name) => {
    cookies.remove(name, options);
  });
}

export function readAccessToken() {
  return cookies.get(AUTH_COOKIE_NAMES.accessToken, {
    doNotParse: true,
  }) as string | undefined;
}

export function readRefreshToken() {
  return cookies.get(AUTH_COOKIE_NAMES.refreshToken, {
    doNotParse: true,
  }) as string | undefined;
}

export function readSavedUser() {
  return cookies.get(AUTH_COOKIE_NAMES.user) as AuthUser | undefined;
}

export function consumeSessionExpiredNotice(queryExpired: boolean) {
  try {
    const state = sessionExpiredNoticeState({
      queryExpired,
      storedExpiry: localStorage.getItem(AUTH_STORAGE_KEYS.sessionExpiresAt),
      storedNotice: localStorage.getItem(
        AUTH_STORAGE_KEYS.sessionExpiredNotice,
      ),
      now: Date.now(),
    });

    localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiredNotice);
    if (state.shouldRemoveExpiry) {
      localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiresAt);
    }

    return state.shouldShow;
  } catch {
    return queryExpired;
  }
}
