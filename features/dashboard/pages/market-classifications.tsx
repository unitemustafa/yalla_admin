"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Store,
  Tags,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { PageLoadError } from "../load-error-card";
import {
  createMarketClassification,
  deleteMarketClassification,
  loadMarketClassifications,
  updateMarketClassification,
  type MarketClassification,
  type MarketClassificationType,
} from "../market-classifications-api";
import { DashboardImage } from "../dashboard-image";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  PageTitle,
  Pagination,
  Switch,
} from "../primitives";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { cn } from "@/lib/utils";

const pageSize = 10;

const classificationTypeOptions: Array<{
  value: MarketClassificationType;
  label: string;
}> = [
  { value: "normal", label: "عادية" },
  { value: "featured", label: "مميزة" },
  { value: "popular", label: "شائعة" },
];

type ClassificationDialogMode = "create" | "edit";
type ClassificationFormPayload = {
  name: string;
  classification_type: MarketClassificationType;
};

type ClassificationFormState = {
  name: string;
  classificationType: MarketClassificationType;
  description: string;
  imagePreview: string | null;
  imageFile: File | null;
};

function classificationTypeLabel(value: MarketClassificationType) {
  return (
    classificationTypeOptions.find((option) => option.value === value)?.label ??
    "عادية"
  );
}

function translateMarketClassificationError(message: string) {
  if (/cannot delete market classification while markets are using it/i.test(message)) {
    return "لا يمكن حذف الفئة لأنها مستخدمة في محلات حالية.";
  }
  return message;
}

function ClassificationActionButton({
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

function TypeSelector({
  value,
  onChange,
}: {
  value: MarketClassificationType;
  onChange: (value: MarketClassificationType) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {classificationTypeOptions.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-sm font-bold transition",
              selected
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
            )}
          >
            فئة {option.label}
          </button>
        );
      })}
    </div>
  );
}

function useLockedPageScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [active]);
}

function ClassificationDialog({
  classification,
  onClose,
  onSubmit,
}: {
  classification?: MarketClassification;
  onClose: () => void;
  onSubmit: (payload: ClassificationFormPayload) => Promise<void>;
}) {
  const mode: ClassificationDialogMode = classification ? "edit" : "create";
  const [form, setForm] = useState<ClassificationFormState>({
    name: classification?.name ?? "",
    classificationType: classification?.classification_type ?? "normal",
    description: "",
    imagePreview: null,
    imageFile: null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useLockedPageScroll(true);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setForm((current) => {
      if (current.imagePreview) URL.revokeObjectURL(current.imagePreview);
      return {
        ...current,
        imagePreview: URL.createObjectURL(file),
        imageFile: file,
      };
    });
    event.target.value = "";
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setError("اسم الفئة مطلوب.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit({
        name: trimmedName,
        classification_type: form.classificationType,
      });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/35 p-4 backdrop-blur-[1px]">
      <form
        dir="rtl"
        aria-labelledby="market-classification-dialog-title"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-lg border bg-background p-6 shadow-2xl"
        onSubmit={submit}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="market-classification-dialog-title"
              className="text-lg font-semibold"
            >
              {mode === "edit" ? "تعديل الفئة" : "إضافة فئة جديدة"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "edit"
                ? "عدّل بيانات الفئة."
                : "أنشئ فئة جديدة من بيانات الباك."}
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
              <label className="group relative flex aspect-[16/10] min-h-[190px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageChange}
                  type="file"
                />
                {form.imagePreview ? (
                  <>
                    <DashboardImage
                      src={form.imagePreview}
                      alt="معاينة صورة الفئة"
                      width={360}
                      height={225}
                      sizes="360px"
                      className="absolute inset-0 size-full"
                      imageClassName="object-cover"
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
                    <span className="font-semibold text-foreground">اختيار صورة</span>
                  </span>
                )}
              </label>
              <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">
                  {form.imageFile ? form.imageFile.name : "لم يتم اختيار صورة"}
                </span>
                {form.imagePreview ? (
                  <button
                    type="button"
                    onClick={clearLocalPreview}
                    className="inline-flex shrink-0 items-center gap-1 font-semibold text-destructive transition hover:text-destructive/80"
                  >
                    <X className="size-3.5" />
                    إزالة المعاينة
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
            {saving
              ? "جاري الحفظ..."
              : mode === "edit"
                ? "حفظ التعديلات"
                : "إنشاء"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DeleteClassificationDialog({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-4 py-6 backdrop-blur-sm">
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
            في محلات سيعرض الخادم خطأ الحماية ولن يتم حذف المحلات.
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

export function MarketClassificationsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [classifications, setClassifications] = useState<MarketClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogClassification, setDialogClassification] = useState<
    MarketClassification | null | undefined
  >();
  const [deleteClassification, setDeleteClassification] =
    useState<MarketClassification | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      setClassifications(await loadMarketClassifications(apiFetch));
    } catch (reason) {
      setClassifications([]);
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "تعذر تحميل فئات المحلات.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredClassifications = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar-EG");
    if (!normalizedQuery) return classifications;

    return classifications.filter((classification) =>
      [
        classification.name,
        classificationTypeLabel(classification.classification_type),
      ]
        .join(" ")
        .toLocaleLowerCase("ar-EG")
        .includes(normalizedQuery),
    );
  }, [classifications, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClassifications.length / pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pagedClassifications = filteredClassifications.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );

  async function saveClassification(payload: ClassificationFormPayload) {
    try {
      if (dialogClassification) {
        const updated = await updateMarketClassification(
          apiFetch,
          dialogClassification.id,
          payload,
        );
        setClassifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        showSnackbar({
          message: "تم تحديث الفئة بنجاح.",
          tone: "success",
        });
      } else {
        const created = await createMarketClassification(apiFetch, payload);
        setClassifications((current) => [created, ...current]);
        setCurrentPage(1);
        showSnackbar({
          message: "تمت إضافة الفئة بنجاح.",
          tone: "success",
        });
      }

      setDialogClassification(undefined);
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error ? reason.message : "تعذر حفظ فئة المحل.",
        tone: "danger",
      });
      throw new Error("تعذر حفظ فئة المحل.");
    }
  }

  async function toggleClassificationActive(
    classification: MarketClassification,
    nextActive: boolean,
  ) {
    setClassifications((current) =>
      current.map((item) =>
        item.id === classification.id ? { ...item, is_active: nextActive } : item,
      ),
    );

    try {
      const updated = await updateMarketClassification(apiFetch, classification.id, {
        name: classification.name,
        classification_type: classification.classification_type,
        is_active: nextActive,
      });
      setClassifications((current) =>
        current.map((item) => (item.id === classification.id ? updated : item)),
      );
      showSnackbar({
        message: nextActive ? `تم تفعيل الفئة ${classification.name}.` : `تم تعطيل الفئة ${classification.name}.`,
        tone: nextActive ? "success" : "danger",
      });
    } catch (reason) {
      setClassifications((current) =>
        current.map((item) => (item.id === classification.id ? classification : item)),
      );
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحديث حالة الفئة.",
        tone: "danger",
      });
    }
  }

  function confirmDelete() {
    if (!deleteClassification) return;
    const classification = deleteClassification;
    const classificationIndex = classifications.findIndex((item) => item.id === classification.id);
    setDeleteClassification(null);

    queueUndoableDelete({
      message: `تم حذف الفئة ${classification.name}.`,
      onDelete: () => {
        setClassifications((current) => current.filter((item) => item.id !== classification.id));
      },
      onUndo: () => {
        setClassifications((current) => {
          if (current.some((item) => item.id === classification.id)) return current;
          const nextClassifications = [...current];
          nextClassifications.splice(Math.max(0, classificationIndex), 0, classification);
          return nextClassifications;
        });
      },
      onCommit: async () => {
        await deleteMarketClassification(apiFetch, classification.id);
      },
      onCommitError: (reason) => {
        const message = reason instanceof Error ? reason.message : "تعذر حذف فئة المحل.";
        showSnackbar({ message: translateMarketClassificationError(message), tone: "danger" });
      },
    });
  }

  return (
    <div dir="rtl" className="px-6 py-6">
      <PageTitle
        title="الفئات"
        description="إدارة تصنيفات المحلات وربطها بالمحلات."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              تحديث
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-sm"
              onClick={() => setDialogClassification(null)}
            >
              <Plus className="size-4" />
              إضافة فئة
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Card className="h-[80px]">
          <div className="flex h-full items-center gap-3 px-5">
            <span className="rounded-full bg-primary/10 p-3 text-primary">
              <Tags className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الفئات</p>
              <p className="text-xl font-bold">{classifications.length}</p>
            </div>
          </div>
        </Card>
        <Card className="h-[80px]">
          <div className="flex h-full items-center gap-3 px-5">
            <span className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">النتائج المعروضة</p>
              <p className="text-xl font-bold">
                {filteredClassifications.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">كل فئات المحلات</h2>
            <p className="text-xs text-muted-foreground">
              الفئة نفسها هي التصنيف الذي يختاره المحل.
            </p>
          </div>
          <div className="relative w-full sm:w-[700px]">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 ps-9"
              placeholder="ابحث عن فئة..."
            />
          </div>
        </div>

        {loading ? (
          <LoadingRows />
        ) : loadError ? (
          <>
            <PageLoadError onRetry={() => void load()} />
            {/*
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm font-medium">{loadError}</p>
            <Button variant="outline" onClick={() => void load()}>
              إعادة المحاولة
            </Button>
          </div>
            */}
          </>
        ) : filteredClassifications.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center">
            <Tags className="size-9 text-muted-foreground" />
            <p className="font-semibold">لا توجد فئات محلات</p>
            <p className="text-sm text-muted-foreground">
              أضف أول فئة محل مثل مطاعم أو ملابس.
            </p>
            <Button type="button" onClick={() => setDialogClassification(null)}>
              <Plus className="size-4" />
              إضافة فئة
            </Button>
          </div>
        ) : (
          <>
            <DataTable
              minWidth={820}
              columnWidths={[80, 380, 150, 245]}
              headers={[
                "#",
                "اسم الفئة",
                "نوع الفئة",
                "",
              ]}
              rows={pagedClassifications.map((classification, index) => [
                <span key="index" className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                  {pageStartIndex + index + 1}
                </span>,
                <div key="name" className="flex min-w-0 items-center gap-2.5 py-1">
                  <DashboardImage
                    src="/default-user-avatar.svg"
                    alt=""
                    width={52}
                    height={52}
                    sizes="52px"
                    className="size-[52px] shrink-0 rounded-md border bg-muted/35 shadow-sm"
                    imageClassName="object-contain p-1"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{classification.name}</span>
                    <span className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-bold",
                      classification.is_active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                    )}>
                      {classification.is_active ? "مفعلة" : "معطلة"}
                    </span>
                  </div>
                </div>,
                <Badge key="type" tone="blue">
                  {classificationTypeLabel(classification.classification_type)}
                </Badge>,
                <div key="actions" className="flex min-w-[225px] items-center justify-end gap-2">
                  <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold">
                    <span>{classification.is_active ? "مفعلة" : "معطلة"}</span>
                    <Switch
                      checked={classification.is_active}
                      onCheckedChange={(checked) => void toggleClassificationActive(classification, checked)}
                      aria-label={`تفعيل الفئة ${classification.name}`}
                    />
                  </div>
                  <ClassificationActionButton label={`تعديل ${classification.name}`} onClick={() => setDialogClassification(classification)}>
                    <Edit3 className="size-4" />
                  </ClassificationActionButton>
                  <ClassificationActionButton tone="danger" label={`حذف ${classification.name}`} onClick={() => setDeleteClassification(classification)}>
                    <Trash2 className="size-4" />
                  </ClassificationActionButton>
                </div>,
              ])}
            />
            <Pagination
              text={`عرض ${pagedClassifications.length} من ${filteredClassifications.length} نتيجة`}
              pages={`${safeCurrentPage} / ${totalPages}`}
              previousDisabled={safeCurrentPage === 1}
              nextDisabled={safeCurrentPage === totalPages}
              onPrevious={() =>
                setCurrentPage((page) =>
                  Math.max(1, Math.min(page, totalPages) - 1),
                )
              }
              onNext={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, Math.min(page, totalPages) + 1),
                )
              }
            />
          </>
        )}
      </Card>

      {dialogClassification !== undefined ? (
        <ClassificationDialog
          classification={dialogClassification ?? undefined}
          onClose={() => setDialogClassification(undefined)}
          onSubmit={saveClassification}
        />
      ) : null}

      {deleteClassification ? (
        <DeleteClassificationDialog
          classification={deleteClassification}
          deleting={false}
          onCancel={() => setDeleteClassification(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
