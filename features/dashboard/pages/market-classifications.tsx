"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Search,
  Store,
  Tags,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  createMarketClassification,
  deleteMarketClassification,
  loadMarketClassifications,
  updateMarketClassification,
  type MarketClassification,
} from "../market-classifications-api";
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  Input,
  PageTitle,
  Pagination,
} from "../primitives";
import { useSnackbar } from "../snackbar";
import { cn } from "@/lib/utils";

const pageSize = 10;

type ClassificationDialogMode = "create" | "edit";

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
  onSubmit: (name: string) => Promise<void>;
}) {
  const mode: ClassificationDialogMode = classification ? "edit" : "create";
  const [name, setName] = useState(classification?.name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useLockedPageScroll(true);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("اسم التصنيف مطلوب.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit(trimmedName);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60 px-4 py-6 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-classification-dialog-title"
        className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5">
          <div>
            <h2
              id="market-classification-dialog-title"
              className="text-xl font-bold leading-7"
            >
              {mode === "edit" ? "تعديل تصنيف محل" : "إضافة تصنيف محل"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اكتب اسم التصنيف كما سيظهر داخل لوحة الإدارة.
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

        <form onSubmit={submit}>
          <div className="grid gap-4 p-6">
            <Field label="اسم التصنيف *">
              <Input
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
                placeholder="مثلًا: مطاعم"
                dir="rtl"
              />
            </Field>
            {error ? (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="size-4" />
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="size-4" />
              {saving ? "جاري الحفظ..." : "حفظ التصنيف"}
            </Button>
          </div>
        </form>
      </section>
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
            حذف تصنيف المحل
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            هل تريد حذف تصنيف &quot;{classification.name}&quot;؟ لا يمكن التراجع
            عن هذا الإجراء.
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
          className="grid h-[53px] animate-pulse grid-cols-[64px_minmax(0,1fr)_120px] items-center gap-4 rounded-md border bg-muted/20 px-4"
        >
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
  const [classifications, setClassifications] = useState<MarketClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [dialogClassification, setDialogClassification] = useState<
    MarketClassification | null | undefined
  >();
  const [deleteClassification, setDeleteClassification] =
    useState<MarketClassification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setOpenActionMenu(null);

    try {
      setClassifications(await loadMarketClassifications(apiFetch));
    } catch {
      setClassifications([]);
      setLoadError("تعذر تحميل تصنيفات المحلات.");
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
      classification.name.toLocaleLowerCase("ar-EG").includes(normalizedQuery),
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

  async function saveClassification(name: string) {
    try {
      if (dialogClassification) {
        const updated = await updateMarketClassification(
          apiFetch,
          dialogClassification.id,
          { name },
        );
        setClassifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        showSnackbar({
          message: "تم تحديث التصنيف بنجاح.",
          tone: "success",
        });
      } else {
        const created = await createMarketClassification(apiFetch, { name });
        setClassifications((current) => [created, ...current]);
        setCurrentPage(1);
        showSnackbar({
          message: "تمت إضافة التصنيف بنجاح.",
          tone: "success",
        });
      }

      setDialogClassification(undefined);
    } catch {
      showSnackbar({
        message: "تعذر حفظ التصنيف.",
        tone: "danger",
      });
      throw new Error("تعذر حفظ التصنيف.");
    }
  }

  async function confirmDelete() {
    if (!deleteClassification || deleting) return;

    setDeleting(true);

    try {
      await deleteMarketClassification(apiFetch, deleteClassification.id);
      setClassifications((current) =>
        current.filter((item) => item.id !== deleteClassification.id),
      );
      setDeleteClassification(null);
      showSnackbar({
        message: "تم حذف التصنيف بنجاح.",
        tone: "success",
      });
    } catch {
      showSnackbar({
        message: "تعذر حذف التصنيف.",
        tone: "danger",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div dir="rtl" className="px-6 py-6">
      <PageTitle
        title="تصنيفات المحلات"
        description="إدارة تصنيفات المحلات مثل مطاعم، سوبرماركت، صيدليات وغيرها."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              تحديث
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setDialogClassification(null)}
            >
              <Plus className="size-4" />
              إضافة تصنيف
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
              <p className="text-xs text-muted-foreground">إجمالي التصنيفات</p>
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
            <h2 className="font-semibold">كل تصنيفات المحلات</h2>
            <p className="text-xs text-muted-foreground">
              استخدم التصنيفات لتنظيم المحلات في لوحة الإدارة.
            </p>
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              className="pr-9"
              placeholder="ابحث عن تصنيف..."
            />
          </div>
        </div>

        {loading ? (
          <LoadingRows />
        ) : loadError ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm font-medium">تعذر تحميل تصنيفات المحلات.</p>
            <Button variant="outline" onClick={() => void load()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : filteredClassifications.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center">
            <Tags className="size-9 text-muted-foreground" />
            <p className="font-semibold">لا توجد تصنيفات محلات</p>
            <p className="text-sm text-muted-foreground">
              أضف أول تصنيف مثل مطاعم أو سوبرماركت.
            </p>
          </div>
        ) : (
          <>
            <DataTable
              minWidth={620}
              columnWidths={[80, 360, 160]}
              headers={[
                "#",
                "اسم التصنيف",
                <span key="actions" className="block text-center">
                  الإجراءات
                </span>,
              ]}
              rows={pagedClassifications.map((classification, index) => [
                <span key="index" className="block px-3">
                  {pageStartIndex + index + 1}
                </span>,
                <div key="name" className="flex items-center gap-2 px-2">
                  <Badge tone="secondary">{classification.id}</Badge>
                  <span className="font-semibold">{classification.name}</span>
                </div>,
                <div key="actions" className="flex justify-center">
                  <ActionMenu
                    open={openActionMenu === classification.id}
                    onToggle={() =>
                      setOpenActionMenu((current) =>
                        current === classification.id ? null : classification.id,
                      )
                    }
                    label={`إجراءات ${classification.name}`}
                    align="end"
                    menuClassName="w-36"
                    items={[
                      {
                        label: "تعديل",
                        icon: Edit3,
                        onClick: () => {
                          setOpenActionMenu(null);
                          setDialogClassification(classification);
                        },
                      },
                      {
                        label: "حذف",
                        icon: Trash2,
                        tone: "danger",
                        onClick: () => {
                          setOpenActionMenu(null);
                          setDeleteClassification(classification);
                        },
                      },
                    ]}
                  />
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
          deleting={deleting}
          onCancel={() => setDeleteClassification(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}
