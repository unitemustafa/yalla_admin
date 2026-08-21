"use client";

import type { ReactNode } from "react";
import { Edit3, Plus, Search, Tags, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { DashboardImage } from "../dashboard-image";
import { PageLoadError } from "../load-error-card";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Pagination,
  Switch,
} from "../primitives";
import { classificationTypeLabel } from "./domain";
import type { MarketClassification } from "./types";

function ClassificationActionButton({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-accent",
        tone === "danger"
          ? "border-destructive/35 text-destructive hover:bg-destructive/10"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-2 p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid h-[53px] animate-pulse grid-cols-[64px_minmax(0,1fr)_140px_120px] items-center gap-4 rounded-md border bg-muted/20 px-4"
        >
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-8 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ClassificationsList({
  classifications,
  filteredCount,
  loading,
  loadError,
  query,
  currentPage,
  totalPages,
  pageStartIndex,
  onQueryChange,
  onPageChange,
  onReload,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
}: {
  classifications: MarketClassification[];
  filteredCount: number;
  loading: boolean;
  loadError: string;
  query: string;
  currentPage: number;
  totalPages: number;
  pageStartIndex: number;
  onQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onReload: () => void;
  onCreate: () => void;
  onEdit: (classification: MarketClassification) => void;
  onDelete: (classification: MarketClassification) => void;
  onToggle: (classification: MarketClassification, checked: boolean) => void;
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">كل الفئات الأساسية</h2>
          <p className="text-xs text-muted-foreground">
            يختار المحل فئة أساسية واحدة، ثم يختار الفئات الثانوية التابعة لها.
          </p>
        </div>
        <div className="relative w-full sm:w-175">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-11 ps-9"
            placeholder="ابحث عن فئة..."
          />
        </div>
      </div>

      {loading ? (
        <LoadingRows />
      ) : loadError ? (
        <PageLoadError onRetry={onReload} />
      ) : filteredCount === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center">
          <Tags className="size-9 text-muted-foreground" />
          <p className="font-semibold">لا توجد فئات محلات</p>
          <p className="text-sm text-muted-foreground">
            أضف أول فئة محل مثل مطاعم أو ملابس.
          </p>
          <Button type="button" onClick={onCreate}>
            <Plus className="size-4" />
            إضافة فئة
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            minWidth={820}
            columnWidths={[80, 380, 150, 245]}
            headers={["#", "اسم الفئة", "نوع الفئة", ""]}
            rows={classifications.map((classification, index) => [
              <span
                key="index"
                className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
              >
                {pageStartIndex + index + 1}
              </span>,
              <div
                key="name"
                className="flex min-w-0 items-center gap-2.5 py-1"
              >
                <DashboardImage
                  src={classification.image || "/default-user-avatar.svg"}
                  alt=""
                  width={52}
                  height={52}
                  sizes="52px"
                  className="size-13 shrink-0 rounded-md border bg-muted/35 shadow-sm"
                  imageClassName="object-contain p-1"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{classification.name}</span>
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-bold",
                      classification.is_active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                    )}
                  >
                    {classification.is_active ? "مفعلة" : "معطلة"}
                  </span>
                </div>
              </div>,
              <Badge key="type" tone="blue">
                {classificationTypeLabel(classification.classification_type)}
              </Badge>,
              <div
                key="actions"
                className="flex min-w-[225px] items-center justify-end gap-2"
              >
                <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold">
                  <span>{classification.is_active ? "مفعلة" : "معطلة"}</span>
                  <Switch
                    checked={classification.is_active}
                    onCheckedChange={(checked) =>
                      onToggle(classification, checked)
                    }
                    aria-label={`تفعيل الفئة ${classification.name}`}
                  />
                </div>
                <ClassificationActionButton
                  label={`تعديل ${classification.name}`}
                  onClick={() => onEdit(classification)}
                >
                  <Edit3 className="size-4" />
                </ClassificationActionButton>
                <ClassificationActionButton
                  tone="danger"
                  label={`حذف ${classification.name}`}
                  onClick={() => onDelete(classification)}
                >
                  <Trash2 className="size-4" />
                </ClassificationActionButton>
              </div>,
            ])}
          />
          <Pagination
            text={`عرض ${classifications.length} من ${filteredCount} نتيجة`}
            pages={`${currentPage} / ${totalPages}`}
            previousDisabled={currentPage === 1}
            nextDisabled={currentPage === totalPages}
            onPrevious={() =>
              onPageChange(Math.max(1, Math.min(currentPage, totalPages) - 1))
            }
            onNext={() =>
              onPageChange(
                Math.min(totalPages, Math.min(currentPage, totalPages) + 1),
              )
            }
          />
        </>
      )}
    </Card>
  );
}
