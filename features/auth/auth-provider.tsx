"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type AuthUser,
  AUTH_STORAGE_KEYS,
  isAccessTokenUsable,
  jwtExpiresAt,
} from "@/lib/auth";

import {
  currentUserFromResponse,
  fetchCurrentAdminUser,
  loginAdmin,
  type LoginInput,
  logoutAdmin,
} from "./auth-api";
import { shouldKeepLocalSession } from "./auth-errors";
import { authenticatedFetch } from "./authenticated-fetch";
import {
  clearSessionCookies,
  assertSessionIdentity,
  clearSessionLifetime,
  hasTemporaryTabSession,
  persistSession,
  persistUser,
  readAccessToken,
  readRefreshToken,
  readRemember,
  readSavedUser,
  readSessionExpiresAt,
  readSessionIdentity,
} from "./session-storage";
import { refreshTokens } from "./token-refresh";

const REFRESH_BUFFER_MS = 60_000;

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<AuthUser>;
  updateUser: (nextUser: AuthUser) => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionExpiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = useCallback((announceExpired = false) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (sessionExpiryTimer.current) {
      clearTimeout(sessionExpiryTimer.current);
      sessionExpiryTimer.current = null;
    }
    clearSessionLifetime(announceExpired);
    clearSessionCookies();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const scheduleSessionExpiry = useCallback(() => {
    if (sessionExpiryTimer.current) {
      clearTimeout(sessionExpiryTimer.current);
      sessionExpiryTimer.current = null;
    }
    const expiresAt = readSessionExpiresAt();
    if (expiresAt === null || expiresAt <= Date.now()) {
      clearSession(true);
      return;
    }

    const identity = readSessionIdentity();
    sessionExpiryTimer.current = setTimeout(
      () => { if (readSessionIdentity() === identity) clearSession(true); },
      expiresAt - Date.now(),
    );
  }, [clearSession]);

  const scheduleRefresh = useCallback(
    function schedule(accessToken: string) {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const expiresAt = jwtExpiresAt(accessToken);
      if (!expiresAt) {
        clearSession();
        return;
      }

      const delay = Math.max(0, expiresAt - Date.now() - REFRESH_BUFFER_MS);
      const identity = readSessionIdentity();
      refreshTimer.current = setTimeout(() => {
        if (readSessionIdentity() !== identity) return;
        void refreshTokens()
          .then((tokens) => { if (readSessionIdentity() === identity) schedule(tokens.accessToken); })
          .catch((error) => {
            if (readSessionIdentity() === identity && !shouldKeepLocalSession(error)) clearSession(true);
          });
      }, delay);
    },
    [clearSession],
  );

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(async () => {
      const identity = readSessionIdentity();
      const accessToken = readAccessToken();
      const refreshToken = readRefreshToken();
      const remember = readRemember();

      if (!active) return;
      if (!refreshToken) {
        clearSession();
        return;
      }
      if (!remember && !hasTemporaryTabSession()) {
        clearSession(true);
        return;
      }
      const expiresAt = readSessionExpiresAt();
      if (!expiresAt || expiresAt <= Date.now()) {
        clearSession(true);
        return;
      }

      scheduleSessionExpiry();

      try {
        const usableAccessToken =
          typeof accessToken === "string" && isAccessTokenUsable(accessToken)
            ? accessToken
            : (await refreshTokens()).accessToken;
        if (!active) return;
        assertSessionIdentity(identity);

        const nextUser = await fetchCurrentAdminUser(usableAccessToken);
        if (!active) return;
        assertSessionIdentity(identity);
        persistUser(nextUser);
        setUser(nextUser);
        setStatus("authenticated");
        scheduleRefresh(usableAccessToken);
      } catch (error) {
        if (readSessionIdentity() !== identity) return;
        if (active && !shouldKeepLocalSession(error)) clearSession(true);
        if (active && shouldKeepLocalSession(error)) {
          const savedUser = readSavedUser();
          if (savedUser?.role === "admin") setUser(savedUser);
          setStatus("authenticated");
        }
      }
    });

    return () => {
      active = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (sessionExpiryTimer.current) clearTimeout(sessionExpiryTimer.current);
    };
  }, [clearSession, scheduleRefresh, scheduleSessionExpiry]);

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEYS.sessionIdentity || event.key === AUTH_STORAGE_KEYS.sessionExpiresAt) {
        window.location.reload();
      }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await loginAdmin(input);
      persistSession(session, input.remember);
      setUser(session.user);
      setStatus("authenticated");
      scheduleSessionExpiry();
      scheduleRefresh(session.accessToken);
    },
    [scheduleRefresh, scheduleSessionExpiry],
  );

  const logout = useCallback(async () => {
    const identity = readSessionIdentity();
    const accessToken = readAccessToken();
    const refreshToken = readRefreshToken();

    try {
      await logoutAdmin(accessToken, refreshToken);
    } catch {
      // Local logout must succeed even when Django is unavailable.
    } finally {
      if (readSessionIdentity() === identity) clearSession();
    }
  }, [clearSession]);

  const apiFetch = useCallback(
    (path: string, init: RequestInit = {}) =>
      authenticatedFetch({
        path,
        init,
        scheduleRefresh,
        clearSession,
      }),
    [clearSession, scheduleRefresh],
  );

  const reloadUser = useCallback(async () => {
    const identity = readSessionIdentity();
    const nextUser = await currentUserFromResponse(
      await apiFetch("auth/me/"),
      false,
    );
    assertSessionIdentity(identity);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, [apiFetch]);

  const updateUser = useCallback((nextUser: AuthUser) => {
    persistUser(nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({ status, user, login, logout, reloadUser, updateUser, apiFetch }),
    [apiFetch, login, logout, reloadUser, status, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
