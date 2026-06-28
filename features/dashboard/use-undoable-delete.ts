"use client";

import { useCallback, useEffect, useRef } from "react";

import { useSnackbar } from "./snackbar";

type UndoableDeleteOptions = {
  message: string;
  onDelete: () => void;
  onUndo: () => void;
  onCommit?: () => Promise<void> | void;
  onCommitError?: (error: unknown) => void;
  durationMs?: number;
};

export function useUndoableDelete() {
  const { showSnackbar } = useSnackbar();
  const timersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return useCallback(
    ({
      message,
      onDelete,
      onUndo,
      onCommit,
      onCommitError,
      durationMs = 6500,
    }: UndoableDeleteOptions) => {
      let undone = false;
      let timer = 0;

      const undo = () => {
        if (undone) return;
        undone = true;
        window.clearTimeout(timer);
        timersRef.current.delete(timer);
        onUndo();
      };

      const commit = async () => {
        timersRef.current.delete(timer);
        if (undone || !onCommit) return;

        try {
          await onCommit();
        } catch (error) {
          if (!undone) {
            undone = true;
            onUndo();
            onCommitError?.(error);
          }
        }
      };

      onDelete();
      timer = window.setTimeout(() => {
        void commit();
      }, durationMs);
      timersRef.current.add(timer);

      showSnackbar({
        message,
        tone: "danger",
        actionLabel: "تراجع",
        durationMs,
        onAction: undo,
      });
    },
    [showSnackbar],
  );
}
