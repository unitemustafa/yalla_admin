"use client";

import { Trash2 } from "lucide-react";

import { Button } from "../primitives";
import type { MarketClassification } from "./types";
import { useLockedPageScroll } from "./use-locked-page-scroll";

export function DeleteClassificationDialog({
  classification,
  deleting,
  onCancel,
  onConfirm,
}: {
  classification: MarketClassification;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useLockedPageScroll(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-market-classification-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="border-b bg-muted/20 px-6 py-5">
          <h2
            id="delete-market-classification-title"
            className="text-xl font-bold leading-7"
          >
            حذف فئة المحل
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            هل تريد حذف فئة &quot;{classification.name}&quot;؟ إذا كانت مستخدمة
            في محلات فسيتم أرشفتها وتعطيلها بدل حذفها نهائيًا.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
            {deleting ? "جاري الحذف..." : "حذف"}
          </Button>
        </div>
      </section>
    </div>
  );
}
