"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
import { cn } from "@/lib/utils";
import { DashboardImage } from "../dashboard-image";
import { Button, Input } from "../primitives";
import {
  classificationNameError,
  classificationTypeOptions,
} from "./domain";
import type {
  ClassificationFormPayload,
  ClassificationFormState,
  MarketClassification,
  MarketClassificationType,
} from "./types";
import { useLockedPageScroll } from "./use-locked-page-scroll";

function TypeSelector({
  value,
  onChange,
  featuredDisabled,
}: {
  value: MarketClassificationType;
  onChange: (value: MarketClassificationType) => void;
  featuredDisabled: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {classificationTypeOptions.map((option) => {
        const selected = option.value === value;
        const disabled =
          option.value === "featured" && featuredDisabled && !selected;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-sm font-bold transition",
              selected
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
              disabled &&
                "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-55 hover:border-border hover:bg-muted/40 hover:text-muted-foreground",
            )}
          >
            فئة {option.label}
            {disabled ? " (4/4)" : ""}
          </button>
        );
      })}
    </div>
  );
}

export function ClassificationDialog({
  classification,
  onClose,
  onSubmit,
  featuredOptionDisabled,
}: {
  classification?: MarketClassification;
  onClose: () => void;
  onSubmit: (payload: ClassificationFormPayload) => Promise<void>;
  featuredOptionDisabled: boolean;
}) {
  const editing = Boolean(classification);
  const [form, setForm] = useState<ClassificationFormState>({
    name: classification?.name ?? "",
    classificationType: classification?.classification_type ?? "normal",
    description: classification?.description ?? "",
    imagePreview: classification?.image ?? null,
    imageFile: null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useLockedPageScroll(true);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const validationError = await validateImageUpload(file, mediaSpecs.classification);
    if (validationError) {
      setError(validationError);
      return;
    }

    setForm((current) => {
      if (current.imagePreview) URL.revokeObjectURL(current.imagePreview);
      return {
        ...current,
        imagePreview: URL.createObjectURL(file),
        imageFile: file,
      };
    });
    setError("");
  }

  function clearLocalPreview() {
    setForm((current) => {
      if (current.imagePreview) URL.revokeObjectURL(current.imagePreview);
      return {
        ...current,
        imagePreview: null,
        imageFile: null,
      };
    });
  }

  useEffect(
    () => () => {
      if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    },
    [form.imagePreview],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = classificationNameError(form.name);

    if (nameError) {
      setError(nameError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        imageFile: form.imageFile,
        classification_type: form.classificationType,
      });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/30 p-4 backdrop-blur-[1px]">
      <form
        dir="rtl"
        aria-labelledby="market-classification-dialog-title"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-245 flex-col overflow-hidden rounded-lg border bg-background p-6 shadow-2xl"
        onSubmit={submit}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="market-classification-dialog-title"
              className="text-lg font-semibold"
            >
              {editing ? "تعديل الفئة" : "إضافة فئة جديدة"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {editing ? "عدّل بيانات الفئة." : "أنشئ فئة جديدة من بيانات الباك."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border p-2 hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-3 text-sm font-medium lg:sticky lg:top-0">
            <div className="text-sm font-medium leading-5">صورة الفئة</div>
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3">
              <label className="group relative flex aspect-square min-h-[190px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => void handleImageChange(event)}
                  type="file"
                />
                {form.imagePreview ? (
                  <>
                    <DashboardImage
                      src={form.imagePreview}
                      alt="معاينة صورة الفئة"
                      width={360}
                      height={360}
                      sizes="360px"
                      className="absolute inset-0 size-full"
                      imageClassName="object-contain p-3"
                      unoptimized
                    />
                    <span className="absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/35" />
                    <span className="relative z-30 rounded-md bg-background/95 px-3 py-2 text-sm font-semibold opacity-0 shadow-sm transition group-hover:opacity-100">
                      تغيير الصورة
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground">
                    <span className="flex size-10 items-center justify-center rounded-md bg-muted/50">
                      <ImagePlus className="size-5 text-primary" />
                    </span>
                    <span className="font-semibold text-foreground">
                      اختيار صورة
                    </span>
                  </span>
                )}
              </label>
              <p className="text-xs text-muted-foreground">{mediaSpecHint(mediaSpecs.classification)}</p>
              <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">
                  {form.imageFile ? form.imageFile.name : "لم يتم اختيار صورة"}
                </span>
                {form.imagePreview ? (
                  <button
                    type="button"
                    onClick={clearLocalPreview}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 px-3 py-1.5 font-semibold text-destructive transition hover:bg-destructive/10"
                  >
                    <X className="size-3.5" />
                    حذف الصورة
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              اسم الفئة
              <Input
                autoFocus
                className="h-11"
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                  if (error) setError("");
                }}
                placeholder="اسم الفئة مطلوب"
                dir="rtl"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              نوع الفئة
              <TypeSelector
                value={form.classificationType}
                featuredDisabled={featuredOptionDisabled}
                onChange={(classificationType) =>
                  setForm((current) => ({
                    ...current,
                    classificationType,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              وصف الفئة
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-24 resize-none rounded-md border border-border bg-input px-3 py-2 text-sm leading-6 text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                placeholder="الوصف اختياري"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-border/70 pt-4">
          <Button variant="outline" onClick={onClose} type="button">
            إلغاء
          </Button>
          <Button disabled={saving} type="submit">
            {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء"}
          </Button>
        </div>
      </form>
    </div>
  );
}
