"use client";

import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Layers3,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { DashboardImage } from "../dashboard-image";
import type { MarketType } from "../market-types-api";
import { AppSelect, Button } from "../primitives";

type Classification = { id: number; name: string };

export type MarketTypeGroup = {
  classification: Classification;
  items: MarketType[];
};

export function MarketTypesList({
  groups,
  totalCount,
  selectedClassificationId,
  reorderingClassificationId,
  busy,
  error,
  onFilterChange,
  onEdit,
  onRemove,
  onMove,
}: {
  groups: MarketTypeGroup[];
  totalCount: number;
  selectedClassificationId: number | "all";
  reorderingClassificationId: number | null;
  busy: boolean;
  error: string;
  onFilterChange: (value: number | "all") => void;
  onEdit: (item: MarketType) => void;
  onRemove: (item: MarketType) => void;
  onMove: (group: MarketTypeGroup, index: number, offset: -1 | 1) => void;
}) {
  const filterOptions = [
    { value: "all", label: `عرض الكل (${totalCount} فئة ثانوية)` },
    ...groups.map((group) => ({
      value: String(group.classification.id),
      label: `${group.classification.name} (${group.items.length})`,
    })),
  ];
  const visibleGroups =
    selectedClassificationId === "all"
      ? groups
      : groups.filter(
          (group) => group.classification.id === selectedClassificationId,
        );

  return (
    <div className="min-w-0 p-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers3 className="size-5 text-primary" />
            <h3 className="font-bold">الفئات الموجودة</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalCount} فئة ثانوية — استخدم الأسهم لتغيير ترتيب الظهور.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            تصفية حسب الفئة الأساسية
          </span>
          <AppSelect
            value={String(selectedClassificationId)}
            onValueChange={(value) =>
              onFilterChange(value === "all" ? "all" : Number(value))
            }
            options={filterOptions}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5">
        {visibleGroups.map((group) => {
          const isReordering =
            reorderingClassificationId === group.classification.id;
          return (
            <section
              key={group.classification.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <header className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <div>
                  <h4 className="font-bold">{group.classification.name}</h4>
                  <p className="text-xs text-muted-foreground">فئة أساسية</p>
                </div>
                <div className="flex items-center gap-2">
                  {isReordering ? (
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                  ) : null}
                  <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                    {group.items.length} فئة
                  </span>
                </div>
              </header>

              {group.items.length ? (
                <div className="grid gap-3 p-3 xl:grid-cols-2">
                  {group.items.map((item, index) => (
                    <article
                      key={item.id}
                      className="flex min-w-0 items-center gap-3 rounded-lg border bg-background p-3 shadow-sm"
                    >
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={busy || isReordering || index === 0}
                          onClick={() => onMove(group, index, -1)}
                          aria-label={`تحريك ${item.name_ar} للأعلى`}
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <span className="min-w-7 rounded-md bg-primary/10 px-1.5 py-1 text-center text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={
                            busy ||
                            isReordering ||
                            index === group.items.length - 1
                          }
                          onClick={() => onMove(group, index, 1)}
                          aria-label={`تحريك ${item.name_ar} للأسفل`}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </div>

                      <DashboardImage
                        src={item.image}
                        alt=""
                        width={64}
                        height={64}
                        className="size-16 shrink-0 rounded-full bg-muted"
                        imageClassName="object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{item.name_ar}</p>
                        <p
                          dir="ltr"
                          className="truncate text-xs text-muted-foreground"
                        >
                          {item.name_en}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {item.market_count} محل
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-medium",
                              item.is_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.is_active ? "نشطة" : "معطلة"}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={busy || isReordering}
                          onClick={() => onEdit(item)}
                          aria-label={`تعديل ${item.name_ar}`}
                        >
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={busy || isReordering}
                          onClick={() => onRemove(item)}
                          aria-label={`حذف ${item.name_ar}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-muted-foreground">
                  لا توجد فئات ثانوية تحت هذه الفئة الأساسية حتى الآن.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
