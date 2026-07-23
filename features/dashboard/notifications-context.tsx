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
import { notifyDashboardOrdersChanged } from "./order-display";
import { apiResponseData } from "./users/api-users";
import { useSnackbar } from "./snackbar";

const unreadCountPollMs = 5_000;

type DashboardOrderNotification = {
  id: string;
  type: string;
  event: string;
  title: string;
  message: string;
  orderId: string;
};

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

function textValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function orderNotificationsFromApi(value: unknown): DashboardOrderNotification[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)
      ? (value as { results: unknown[] }).results
      : [];

  return rows.flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const record = row as Record<string, unknown>;
    const data =
      record.data && typeof record.data === "object" && !Array.isArray(record.data)
        ? (record.data as Record<string, unknown>)
        : {};
    const notification = {
      id: textValue(record.id),
      type: textValue(record.type),
      event: textValue(data.event),
      title: textValue(record.title),
      message: textValue(record.message),
      orderId: textValue(record.order_id ?? data.order_id),
    };
    return notification.id ? [notification] : [];
  });
}

function dashboardNotificationMessage(notification: DashboardOrderNotification) {
  const orderLabel = notification.orderId ? ` #${notification.orderId}` : "";
  if (notification.type === "new_order_review") {
    return `تم استلام طلب جديد${orderLabel} ويحتاج إلى مراجعة.`;
  }
  if (notification.type === "new_partner_application") {
    return notification.message || "تم استلام طلب تسجيل شريك جديد.";
  }
  if (notification.event === "courier_order_picked_up") {
    return notification.message || `المندوب استلم الطلب${orderLabel}.`;
  }
  if (notification.event === "courier_order_delivered") {
    return notification.message || `المندوب سلّم الطلب${orderLabel} للعميل.`;
  }
  return notification.message || notification.title;
}

export function DashboardNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { apiFetch, status, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const inFlightRef = useRef<Promise<number> | null>(null);
  const notificationPollRef = useRef<Promise<void> | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationSnapshotReadyRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shouldRun = status === "authenticated" && user?.role === "admin";

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    if (!shouldRun) return unreadCountRef.current;
    if (inFlightRef.current) return inFlightRef.current;

    const request = (async () => {
      try {
        const response = await apiFetch("notifications/unread-count/");
        const data = await apiResponseData(response);
        if (!response.ok) return unreadCountRef.current;

        const nextCount = unreadCountFromApi(data);
        setUnreadCount(nextCount);
        return nextCount;
      } catch {
        return unreadCountRef.current;
      }
    })();

    inFlightRef.current = request;

    try {
      return await request;
    } finally {
      inFlightRef.current = null;
    }
  }, [apiFetch, shouldRun]);

  const playNotificationSound = useCallback(async () => {
    try {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      if (context.state === "suspended") await context.resume();
      const now = context.currentTime;
      [0, 0.16].forEach((offset, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(index === 0 ? 660 : 880, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.32, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.16);
      });
    } catch {
      // Browser autoplay policies can block sound until the first interaction.
    }
  }, []);

  const unlockNotificationSound = useCallback(async () => {
    try {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      if (context.state === "suspended") await context.resume();
      await context.suspend();
    } catch {
      // Sound remains optional when browser audio APIs are unavailable.
    }
  }, []);

  const pollForNewNotifications = useCallback(async () => {
    if (!shouldRun || notificationPollRef.current) return notificationPollRef.current;

    const request = (async () => {
      try {
        const response = await apiFetch("notifications/?unread=true");
        const data = await apiResponseData(response);
        if (!response.ok) return;
        const notifications = orderNotificationsFromApi(data);
        const nextIds = new Set(notifications.map((notification) => notification.id));
        setUnreadCount(notifications.length);

        if (!notificationSnapshotReadyRef.current) {
          seenNotificationIdsRef.current = nextIds;
          notificationSnapshotReadyRef.current = true;
          return;
        }

        const latest = notifications.find(
          (notification) => !seenNotificationIdsRef.current.has(notification.id),
        );
        seenNotificationIdsRef.current = nextIds;
        if (!latest) return;

        if (latest.type === "new_order_review") {
          notifyDashboardOrdersChanged(latest.orderId || null);
        }

        void playNotificationSound();
        showSnackbar({
          message: dashboardNotificationMessage(latest),
          tone: "notification",
          durationMs: 6500,
        });
      } catch {
        // A transient notification poll failure should not interrupt the dashboard.
      }
    })();

    notificationPollRef.current = request;
    try {
      await request;
    } finally {
      notificationPollRef.current = null;
    }
  }, [apiFetch, playNotificationSound, shouldRun, showSnackbar]);

  useEffect(() => {
    if (!shouldRun) return;

    const initialTimer = window.setTimeout(() => {
      void pollForNewNotifications()?.catch(() => undefined);
    }, 0);
    const pollTimer = window.setInterval(() => {
      void pollForNewNotifications()?.catch(() => undefined);
    }, unreadCountPollMs);

    const refreshOnFocus = () => {
      void pollForNewNotifications()?.catch(() => undefined);
    };
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [pollForNewNotifications, shouldRun]);

  useEffect(() => {
    if (!shouldRun) return;
    const unlockAudio = () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      void unlockNotificationSound();
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [shouldRun, unlockNotificationSound]);

  useEffect(() => {
    if (shouldRun) return;

    const timer = window.setTimeout(() => setUnreadCount(0), 0);
    seenNotificationIdsRef.current = new Set();
    notificationSnapshotReadyRef.current = false;
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
