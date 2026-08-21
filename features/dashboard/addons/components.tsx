"use client";

import { Plus, X } from "lucide-react";

import type { AddonRow } from "../addons/types";
import { DashboardImage } from "../dashboard-image";
import { AppSelect, Button, Field, Input } from "../primitives";
import { cn } from "@/lib/utils";

export function EmptyStateTable({
  headers,
  minWidth = 980,
}: {
  headers: React.ReactNode[];
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="h-10 border-b bg-muted/40">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-3 text-start text-xs font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={headers.length} className="h-24 text-center font-medium">
              مفيش بيانات
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function MissingAddonCategoriesDialog({
  onClose,
  onCreateCategory,
}: {
  onClose: () => void;
  onCreateCategory: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-addon-categories-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5">
          <div>
            <h2
              id="missing-addon-categories-title"
              className="text-xl font-bold leading-7"
            >
              أنشئ تصنيف إضافة أولًا
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              أنشئ تصنيفًا للإضافات أولًا، مثل الصوصات أو الإضافات الساخنة، قبل إنشاء إضافة جديدة.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" onClick={onCreateCategory}>
            <Plus className="size-4" />
            إضافة تصنيف
          </Button>
        </div>
      </section>
    </div>
  );
}

export function AddonRowIconButton({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-accent",
        tone === "danger" ? "border-destructive/35 text-destructive hover:bg-destructive/10" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function AddonEditPanel({
  draft,
  categoryOptions,
  onChange,
  onImageChange,
  onCancel,
  onSave,
}: {
  draft: AddonRow;
  categoryOptions: string[];
  onChange: (draft: AddonRow) => void;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <form
      className="rounded-md border border-primary/25 bg-primary/5 p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-3 lg:grid-cols-[76px_minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium leading-none">
          الصورة
          <span className="group relative flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
            <input
              accept="image/*"
              className="sr-only"
              onChange={onImageChange}
              type="file"
            />
            <DashboardImage
              alt={draft.nameAr}
              src={draft.image}
              placeholderType="addon"
              width={96}
              height={96}
              sizes="64px"
              className="absolute inset-0 size-full"
              imageClassName="object-contain"
            />
            <span className="absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/30" />
            <span className="relative z-30 rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold opacity-0 shadow-sm transition group-hover:opacity-100">
              تغيير
            </span>
          </span>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="الاسم بالعربي">
            <Input
              value={draft.nameAr}
              className="h-9"
              onChange={(event) =>
                onChange({ ...draft, nameAr: event.target.value })
              }
            />
          </Field>
          <Field label="سعر الإضافة">
            <Input
              dir="ltr"
              value={draft.price}
              className="h-9"
              onChange={(event) => onChange({ ...draft, price: event.target.value })}
            />
          </Field>
          <Field label="تصنيف الإضافة">
            <AppSelect
              value={draft.category}
              onValueChange={(category) => onChange({ ...draft, category })}
              ariaLabel="اختيار تصنيف الإضافة"
              className="h-9 bg-input"
              options={categoryOptions.map((category) => ({
                value: category,
                label: category,
              }))}
            />
          </Field>
        </div>
        <div className="flex gap-2 lg:pb-0">
          <Button type="button" variant="outline" className="h-9" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" className="h-9">
            حفظ
          </Button>
        </div>
      </div>
    </form>
  );
}

function splitAddonPrice(price: string) {
  const normalizedPrice = price.trim();
  const match = normalizedPrice.match(/^(.*?)(?:\s*(EGP|جنيه|جنية))$/i);

  if (!match) {
    return { amount: normalizedPrice, currency: "" };
  }

  return {
    amount: match[1].trim(),
    currency: match[2],
  };
}

export function AddonIdentity({ addon }: { addon: AddonRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1">
      <DashboardImage
        alt={addon.nameAr}
        src={addon.image}
        placeholderType="addon"
        width={52}
        height={52}
        sizes="52px"
        className="size-13 shrink-0 rounded-md border bg-muted/35 shadow-sm"
        imageClassName="object-contain p-1"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[13px] font-black leading-5">{addon.nameAr}</h3>
          <span className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-xs font-bold",
            addon.active !== false
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}>
            {addon.active !== false ? "مفعلة" : "معطلة"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AddonInfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-semibold text-foreground">
      <span className="truncate">{children}</span>
    </span>
  );
}

export function AddonPriceCell({ price }: { price: string }) {
  const { amount, currency } = splitAddonPrice(price);

  return (
    <div className="inline-flex min-w-[78px] items-baseline justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary">
      <span className="text-sm font-black leading-none">{amount}</span>
      {currency ? <span className="currency-text text-[11px] font-bold">{currency}</span> : null}
    </div>
  );
}
