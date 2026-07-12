"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type SnackbarTone = "success" | "danger" | "info";

type Snackbar = {
  id: number;
  message: string;
  tone: SnackbarTone;
  actionLabel?: string;
  durationMs: number;
  onAction?: () => void;
};

type SnackbarInput = {
  message: string;
  tone?: SnackbarTone;
  actionLabel?: string;
  durationMs?: number;
  onAction?: () => void;
};

type SnackbarContextValue = {
  showSnackbar: (snackbar: SnackbarInput) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]);

  const removeSnackbar = useCallback((id: number) => {
    setSnackbars((currentSnackbars) =>
      currentSnackbars.filter((snackbar) => snackbar.id !== id),
    );
  }, []);

  const showSnackbar = useCallback(
    ({
      message,
      tone = "success",
      actionLabel,
      durationMs = actionLabel ? 5000 : 3600,
      onAction,
    }: SnackbarInput) => {
      const id = Date.now() + Math.random();

      setSnackbars([{ id, message, tone, actionLabel, durationMs, onAction }]);
    },
    [],
  );

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2"
      >
        {snackbars.map((snackbar) => (
          <SnackbarItem
            key={snackbar.id}
            snackbar={snackbar}
            onClose={() => removeSnackbar(snackbar.id)}
          />
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

function SnackbarItem({
  snackbar,
  onClose,
}: {
  snackbar: Snackbar;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, snackbar.durationMs);
    return () => window.clearTimeout(timer);
  }, [onClose, snackbar.durationMs]);

  const Icon =
    snackbar.tone === "danger"
      ? AlertTriangle
      : snackbar.tone === "info"
        ? Info
        : CheckCircle2;

  return (
    <div
      dir="rtl"
      role={snackbar.tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex min-h-12 w-full max-w-full items-start gap-3 rounded-lg border px-4 py-3 text-right text-sm font-medium shadow-lg backdrop-blur sm:max-w-xl",
        snackbar.tone === "success" &&
          "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100",
        snackbar.tone === "danger" &&
          "border-red-300 bg-red-50 text-red-900 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100",
        snackbar.tone === "info" &&
          "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 leading-5">{snackbar.message}</div>
      {snackbar.actionLabel && snackbar.onAction ? (
        <button
          className={cn(
            "shrink-0 rounded-md border px-3 py-1 text-xs font-bold transition",
            snackbar.tone === "danger"
              ? "border-red-200 bg-red-100 text-red-900 hover:bg-red-200 dark:border-red-300/40 dark:bg-red-400/20 dark:text-red-50 dark:hover:bg-red-400/30"
              : "border-current/30 bg-background/70 hover:bg-background",
          )}
          onClick={() => {
            onClose();
            snackbar.onAction?.();
          }}
          type="button"
        >
          {snackbar.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);

  if (!context) {
    throw new Error("useSnackbar must be used inside SnackbarProvider");
  }

  return context;
}
