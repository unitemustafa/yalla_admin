"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { apiResponseData } from "./users/api-users";

const unreadCountPollMs = 30_000;

type DashboardNotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<number>;
  setUnreadCount: Dispatch<SetStateAction<number>>;
};

const DashboardNotificationsContext =
  createContext<DashboardNotificationsContextValue | null>(null);

function unreadCountFromApi(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;

  const count = (value as { unread_count?: unknown }).unread_count;
  if (typeof count === "number" && Number.isFinite(count)) return Math.max(0, count);
  if (typeof count === "string") {
    const parsed = Number(count);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
}

export function DashboardNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { apiFetch, status, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const inFlightRef = useRef<Promise<number> | null>(null);
  const shouldRun = status === "authenticated" && user?.role === "admin";

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    if (!shouldRun) return unreadCountRef.current;
    if (inFlightRef.current) return inFlightRef.current;

    const request = (async () => {
      const response = await apiFetch("notifications/unread-count/");
      const data = await apiResponseData(response);
      if (!response.ok) return unreadCountRef.current;

      const nextCount = unreadCountFromApi(data);
      setUnreadCount(nextCount);
      return nextCount;
    })();

    inFlightRef.current = request;

    try {
      return await request;
    } finally {
      inFlightRef.current = null;
    }
  }, [apiFetch, shouldRun]);

  useEffect(() => {
    if (!shouldRun) return;

    const initialTimer = window.setTimeout(() => {
      void refreshUnreadCount();
    }, 0);
    const pollTimer = window.setInterval(() => {
      void refreshUnreadCount();
    }, unreadCountPollMs);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
    };
  }, [refreshUnreadCount, shouldRun]);

  useEffect(() => {
    if (shouldRun) return;

    const timer = window.setTimeout(() => setUnreadCount(0), 0);
    return () => window.clearTimeout(timer);
  }, [shouldRun]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount, setUnreadCount }),
    [refreshUnreadCount, unreadCount],
  );

  return (
    <DashboardNotificationsContext.Provider value={value}>
      {children}
    </DashboardNotificationsContext.Provider>
  );
}

export function useDashboardNotifications() {
  const context = useContext(DashboardNotificationsContext);

  if (!context) {
    throw new Error(
      "useDashboardNotifications must be used inside DashboardNotificationsProvider",
    );
  }

  return context;
}
