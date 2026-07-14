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
import { Cookies } from "react-cookie";

import {
  AUTH_COOKIE_NAMES,
  AUTH_STORAGE_KEYS,
  NETWORK_ERROR_MESSAGE,
  type AuthSession,
  type AuthTokens,
  type AuthUser,
  isAbortError,
  isAccessTokenUsable,
  isNetworkError,
  jwtExpiresAt,
} from "@/lib/auth";
import { optimizeImageRequestInit } from "@/lib/image-upload";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");
const REFRESH_BUFFER_MS = 60_000;
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const TEMPORARY_MAX_AGE_SECONDS = 60 * 60 * 8;
const cookies = new Cookies();

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<AuthUser>;
  updateUser: (nextUser: AuthUser) => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
let refreshPromise: Promise<AuthTokens> | null = null;

function cookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
    maxAge: remainingSessionMaxAge(),
  };
}

function removeOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  };
}

function readRemember() {
  return cookies.get(AUTH_COOKIE_NAMES.remember, { doNotParse: true }) === "true";
}

function hasTemporaryTabSession() {
  try {
    return (
      sessionStorage.getItem(AUTH_STORAGE_KEYS.temporarySessionActive) ===
      "true"
    );
  } catch {
    return false;
  }
}

function sessionExpiresAt() {
  try {
    const value = Number(
      localStorage.getItem(AUTH_STORAGE_KEYS.sessionExpiresAt),
    );
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function remainingSessionMaxAge() {
  const expiresAt = sessionExpiresAt();
  return expiresAt && expiresAt > Date.now()
    ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))
    : 0;
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

    sessionStorage.setItem(
      AUTH_STORAGE_KEYS.temporarySessionActive,
      "true",
    );
  } catch {
    // Cookies still enforce the maximum lifetime if storage is unavailable.
  }
}

function clearSessionLifetime(announceExpired: boolean) {
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

function persistTokens(tokens: AuthTokens) {
  const options = cookieOptions();
  cookies.set(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, options);
  cookies.set(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, options);
}

function persistSession(session: AuthSession, remember: boolean) {
  persistSessionLifetime(remember);
  const options = cookieOptions();
  persistTokens(session);
  cookies.set(AUTH_COOKIE_NAMES.user, session.user, options);
  cookies.set(AUTH_COOKIE_NAMES.remember, String(remember), options);
}

function persistUser(user: AuthUser) {
  cookies.set(AUTH_COOKIE_NAMES.user, user, cookieOptions());
}

function clearSessionCookies() {
  const options = removeOptions();
  Object.values(AUTH_COOKIE_NAMES).forEach((name) => {
    cookies.remove(name, options);
  });
}

async function responseData(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function firstApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }
  return null;
}

function localizedAuthError(value: unknown, fallback: string) {
  const message = firstApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("invalid email or password")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
  if (normalized.includes("not been verified")) {
    return "الحساب غير مفعّل. أكّد البريد الإلكتروني أولًا.";
  }
  if (normalized.includes("required")) {
    return "أكمل البريد الإلكتروني وكلمة المرور.";
  }
  return message;
}

function shouldKeepLocalSession(error: unknown) {
  return isNetworkError(error) || isAbortError(error);
}

async function refreshTokens() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = cookies.get(AUTH_COOKIE_NAMES.refreshToken, {
    doNotParse: true,
  }) as string | undefined;
  if (!refreshToken) throw new Error("لا توجد جلسة قابلة للتجديد.");
  const expiresAt = sessionExpiresAt();
  if (!expiresAt || expiresAt <= Date.now()) {
    throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
  }

  refreshPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      if (isNetworkError(error)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw error;
    }
    const data = (await responseData(response)) as Partial<AuthTokens> | null;

    if (
      (response.status === 401 || response.status === 403) ||
      typeof data?.accessToken !== "string" ||
      typeof data.refreshToken !== "string"
    ) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("انتهت الجلسة. سجّل الدخول من جديد.");
      }
      throw new Error(localizedAuthError(data, "تعذر تحديث الجلسة من الخادم."));
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

async function fetchCurrentAdminUser(accessToken: string) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (isNetworkError(error)) throw new Error(NETWORK_ERROR_MESSAGE);
    throw error;
  }
  const data = await responseData(response);

  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(
      localizedAuthError(
        data,
        "تعذر تحديث بيانات الحساب من الخادم.",
      ),
    );
  }

  const nextUser = data as AuthUser;
  if (nextUser.role !== "admin") {
    throw new Error("هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.");
  }

  return nextUser;
}

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

  const scheduleSessionExpiry = useCallback(
    () => {
      if (sessionExpiryTimer.current) {
        clearTimeout(sessionExpiryTimer.current);
        sessionExpiryTimer.current = null;
      }
      const expiresAt = sessionExpiresAt();
      if (expiresAt === null) {
        clearSession(true);
        return;
      }
      if (expiresAt <= Date.now()) {
        clearSession(true);
        return;
      }

      sessionExpiryTimer.current = setTimeout(
        () => clearSession(true),
        expiresAt - Date.now(),
      );
    },
    [clearSession],
  );

  const scheduleRefresh = useCallback(
    function schedule(accessToken: string) {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const expiresAt = jwtExpiresAt(accessToken);
      if (!expiresAt) {
        clearSession();
        return;
      }

      const delay = Math.max(0, expiresAt - Date.now() - REFRESH_BUFFER_MS);
      refreshTimer.current = setTimeout(() => {
        void refreshTokens()
          .then((tokens) => schedule(tokens.accessToken))
          .catch((error) => {
            if (!shouldKeepLocalSession(error)) clearSession(true);
          });
      }, delay);
    },
    [clearSession],
  );

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(async () => {
      const accessToken = cookies.get(AUTH_COOKIE_NAMES.accessToken, {
        doNotParse: true,
      }) as string | undefined;
      const refreshToken = cookies.get(AUTH_COOKIE_NAMES.refreshToken, {
        doNotParse: true,
      }) as string | undefined;
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
      const expiresAt = sessionExpiresAt();
      if (!expiresAt || expiresAt <= Date.now()) {
        clearSession(true);
        return;
      }

      scheduleSessionExpiry();

      try {
        const usableAccessToken = isAccessTokenUsable(accessToken)
          ? accessToken!
          : (await refreshTokens()).accessToken;
        if (!active) return;

        const nextUser = await fetchCurrentAdminUser(usableAccessToken);
        if (!active) return;
        persistUser(nextUser);
        setUser(nextUser);
        setStatus("authenticated");
        scheduleRefresh(usableAccessToken);
      } catch (error) {
        if (active && !shouldKeepLocalSession(error)) clearSession(true);
        if (active && shouldKeepLocalSession(error)) {
          const savedUser = cookies.get(AUTH_COOKIE_NAMES.user) as AuthUser | undefined;
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

  const login = useCallback(
    async (input: { email: string; password: string; remember: boolean }) => {
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/login/admin/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            remember: input.remember,
          }),
        });
      } catch (error) {
        if (isNetworkError(error)) throw new Error(NETWORK_ERROR_MESSAGE);
        throw error;
      }
      const data = (await responseData(response)) as Partial<AuthSession> | null;

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

      const session = data as AuthSession;
      persistSession(session, input.remember);
      setUser(session.user);
      setStatus("authenticated");
      scheduleSessionExpiry();
      scheduleRefresh(session.accessToken);
    },
    [scheduleRefresh, scheduleSessionExpiry],
  );

  const logout = useCallback(async () => {
    const accessToken = cookies.get(AUTH_COOKIE_NAMES.accessToken, {
      doNotParse: true,
    }) as string | undefined;
    const refreshToken = cookies.get(AUTH_COOKIE_NAMES.refreshToken, {
      doNotParse: true,
    }) as string | undefined;

    try {
      if (accessToken && refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch {
      // Local logout must succeed even when Django is unavailable.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const optimizedInit = await optimizeImageRequestInit(init);

      async function request(accessToken: string) {
        const headers = new Headers(optimizedInit.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);
        try {
          return await fetch(
            path.startsWith("http") ? path : `${API_BASE_URL}/${path.replace(/^\/+/, "")}`,
            { ...optimizedInit, headers },
          );
        } catch (error) {
          if (isNetworkError(error)) throw new Error(NETWORK_ERROR_MESSAGE);
          throw error;
        }
      }

      let accessToken = cookies.get(AUTH_COOKIE_NAMES.accessToken, {
        doNotParse: true,
      }) as string | undefined;

      if (!isAccessTokenUsable(accessToken)) {
        try {
          accessToken = (await refreshTokens()).accessToken;
          scheduleRefresh(accessToken);
        } catch (error) {
          if (!shouldKeepLocalSession(error)) clearSession(true);
          throw error;
        }
      }

      let response = await request(accessToken!);
      if (response.status !== 401) return response;

      try {
        accessToken = (await refreshTokens()).accessToken;
        scheduleRefresh(accessToken);
        response = await request(accessToken);
        return response;
      } catch (error) {
        if (!shouldKeepLocalSession(error)) clearSession(true);
        throw error;
      }
    },
    [clearSession, scheduleRefresh],
  );

  const reloadUser = useCallback(async () => {
    const response = await apiFetch("auth/me/");
    const data = await responseData(response);

    if (!response.ok || !data || typeof data !== "object") {
      throw new Error(
        localizedAuthError(data, "تعذر تحديث بيانات الحساب من الخادم."),
      );
    }

    const nextUser = data as AuthUser;
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
