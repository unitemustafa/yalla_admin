"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle, Edit, Eye, Package, Trash2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { DashboardImage } from "../../dashboard-image";
import { Button, Card, Switch } from "../../primitives";
import type { ItemRow } from "../types";
import { splitItemPrice } from "./domain";
import { useBodyScrollLock } from "./use-body-scroll-lock";

export function MetricCards({ rows }: { rows: ItemRow[] }) {
  const activeCount = rows.filter((row) => row.active).length;
  const inactiveCount = rows.length - activeCount;
  const cards = [
    {
      label: "إجمالي المنتجات",
      value: String(rows.length),
      detail: "حسب الفلاتر الحالية",
      icon: Package,
      tone: "bg-primary/10 text-primary",
      marker: "bg-primary",
    },
    {
      label: "نشط",
      value: String(activeCount),
      detail: "ظاهر للعملاء",
      icon: CheckCircle,
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      marker: "bg-emerald-500",
    },
    {
      label: "غير نشط",
      value: String(inactiveCount),
      detail: "متوقف مؤقتًا",
      icon: XCircle,
      tone: "bg-red-500/10 text-red-700 dark:text-red-300",
      marker: "bg-destructive",
    },
  ] as const;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label} className="relative min-h-23 overflow-hidden">
            <span className={cn("absolute inset-y-4 end-0 w-1 rounded-s-full", card.marker)} />
            <div className="flex h-full items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-black leading-tight">
                  {card.value}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {card.detail}
                </p>
              </div>
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", card.tone)}>
                <Icon className="size-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function RowActions({
  row,
  onView,
  onDelete,
}: {
  row: ItemRow;
  onView: () => void;
  onDelete: () => void;
}) {
  const deleteLabel = `حذف ${row.name} نهائيًا`;

  return (
    <div className="flex min-w-55 items-center justify-end gap-2">
      <button type="button" aria-label={`بيانات ${row.name}`} title={`بيانات ${row.name}`} onClick={onView} className="inline-flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"><Eye className="size-4" /></button>
      <Link href={`/items/edit/${row.id}?returnTo=%2Fitems%3F`} aria-label={`تعديل ${row.name}`} title={`تعديل ${row.name}`} className="inline-flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"><Edit className="size-4" /></Link>
      {row.deletionMode === "delete" ? <button type="button" aria-label={deleteLabel} title={deleteLabel} onClick={onDelete} className="inline-flex size-10 items-center justify-center rounded-md border border-destructive/35 text-destructive transition hover:bg-destructive/10"><Trash2 className="size-4" /></button> : null}
    </div>
  );
}

export function ProductIdentity({ row, compact = false }: { row: ItemRow; compact?: boolean }) {
  const imageSize = compact ? 48 : 52;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <DashboardImage
        alt={row.name}
        src={row.image}
        placeholderType="product"
        width={imageSize}
        height={imageSize}
        sizes={`${imageSize}px`}
        className={cn(
          "shrink-0 rounded-md border bg-muted/35 shadow-sm",
          compact ? "size-12" : "size-13",
        )}
        imageClassName="object-contain p-1"
      />
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-black leading-5">{row.name}</h3>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-bold",
              row.active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300",
            )}
          >
            {row.active ? "نشط" : "متوقف"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-semibold text-foreground">
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PriceCell({ price }: { price: string }) {
  const { amount, currency } = splitItemPrice(price);
  const compactText = !currency && (amount === "بدون سعر" || amount.includes(" - "));

  return (
    <div className="inline-flex min-w-[78px] items-baseline justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary">
      <span className={cn(compactText ? "text-xs font-bold leading-4" : "text-sm font-black leading-none")}>
        {amount}
      </span>
      {currency ? <span className="currency-text text-[11px] font-bold">{currency}</span> : null}
    </div>
  );
}

export function ActiveToggleButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: (active: boolean) => void;
}) {
  return (
    <Switch
      checked={active}
      aria-label={active ? "إلغاء تنشيط المنتج" : "تنشيط المنتج"}
      onCheckedChange={onToggle}
    />
  );
}

export function DeleteDialog({
  itemName,
  onClose,
  onConfirm,
}: {
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden overscroll-none bg-foreground/30 px-4 backdrop-blur-[1px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-item-title"
        className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg"
      >
        <h2 id="delete-item-title" className="text-lg font-semibold">
          حذف المنتج نهائيًا
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <>متأكد إنك عايز تحذف <span className="font-semibold">{itemName}</span> نهائيًا؟ لا يمكن التراجع بعد تنفيذ الحذف.</>
        </p>
        <div className="mt-4 flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            تأكيد الحذف
          </Button>
        </div>
      </div>
    </div>
  );
}
