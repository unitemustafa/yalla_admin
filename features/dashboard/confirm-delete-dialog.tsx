"use client";

import { useEffect } from "react";
import { AlertCircle, Archive, Loader2, Trash2 } from "lucide-react";

import { Button } from "./primitives";

export function ConfirmDeleteDialog({
  title,
  description,
  busy,
  action = "delete",
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  busy: boolean;
  action?: "delete" | "archive";
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ActionIcon = action === "archive" ? Archive : Trash2;
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h2 id="confirm-delete-title" className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ActionIcon className="size-4" />}
            {busy ? "جار التنفيذ..." : confirmLabel ?? (action === "archive" ? "أرشفة" : "حذف نهائي")}
          </Button>
        </div>
      </section>
    </div>
  );
}
