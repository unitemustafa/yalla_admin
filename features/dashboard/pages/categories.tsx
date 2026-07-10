"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Edit,
  Eye,
  ImagePlus,
  Layers3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  AdminApiError,
  createProductCategory,
  deleteProductCategory,
  getProductCategory,
  listCategoryClassifications,
  listProductCategories,
  updateProductCategory,
  type CategoryClassification,
  type NormalizedProductCategory,
  type ProductCategoryWritePayload,
} from "../admin-api";
import { DashboardImage } from "../dashboard-image";
import {
  ActionMenu,
  AppSelect,
  Button,
  Card,
  DataTable,
  Input,
  Pagination,
} from "../primitives";
import { useItemTableState } from "../hooks";
import { useSnackbar } from "../snackbar";
import { cn } from "@/lib/utils";

const categoriesPageSize = 10;

const categoryTypeOptions = [
  { value: "فئات عادية", label: "فئة عادية" },
  { value: "فئات مميزة", label: "فئة مميزة" },
  { value: "فئات شائعة", label: "فئة شائعة" },
] as const;

type CategoryFormState = {
  id?: number;
  mode: "create" | "edit";
  name: string;
  classificationId: string;
  type: string;
  description: string;
  imagePreview: string | null;
  imageFile: File | null;
  imageRemovedLocally: boolean;
};

function emptyFormState(): CategoryFormState {
  return {
    mode: "create",
    name: "",
    classificationId: "",
    type: categoryTypeOptions[0].value,
    description: "",
    imagePreview: null,
    imageFile: null,
    imageRemovedLocally: false,
  };
}

function classificationName(value: NormalizedProductCategory) {
  return typeof value.classification?.name === "string" && value.classification.name.trim()
    ? value.classification.name.trim()
    : "-";
}

function categoryTypeLabel(value: string) {
  return categoryTypeOptions.find((option) => option.value === value)?.label || value || "-";
}

function productCategoryPayload(
  form: CategoryFormState,
): ProductCategoryWritePayload {
  return {
    classification_id: Number(form.classificationId),
    name: form.name.trim(),
    type: form.type.trim(),
    description: form.description.trim(),
  };
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function fieldErrors(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) return value.flatMap(fieldErrors);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      fieldErrors(entry).map((message) =>
        key === "detail" ? message : `${key}: ${message}`,
      ),
    );
  }
  return [];
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [locked]);
}

function TypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const known = categoryTypeOptions.some((option) => option.value === value);

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {categoryTypeOptions.map((option) => {
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
              {option.label}
            </button>
          );
        })}
      </div>
      {!known && value ? (
        <p className="text-xs leading-5 text-muted-foreground">
          القيمة الحالية من الباك: {value}
        </p>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-md bg-muted/35 px-3 py-2 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 font-semibold">{value}</span>
    </div>
  );
}

function CategoryDetailDialog({
  category,
  error,
  loading,
  onClose,
}: {
  category: NormalizedProductCategory | null;
  error: string;
  loading: boolean;
  onClose: () => void;
}) {
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/35 p-4 backdrop-blur-[1px]">
      <div
        aria-labelledby="category-detail-title"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="category-detail-title" className="text-lg font-semibold">
              بيانات الفئة
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              تفاصيل الفئة من الباك مباشرة.
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
              جاري تحميل بيانات الفئة...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : category ? (
            <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
              <DashboardImage
                alt={category.name}
                src={category.image}
                placeholderType="category"
                width={180}
                height={180}
                sizes="180px"
                className="h-44 w-full rounded-md border bg-muted/30 md:w-44"
                imageClassName="object-contain p-2"
              />
              <div className="grid gap-3">
                <div>
                  <h3 className="text-xl font-black">{category.name || "-"}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {category.description || "-"}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <DetailRow label="رقم الفئة" value={`#${category.id}`} />
                  <DetailRow label="النوع" value={categoryTypeLabel(category.type)} />
                  <DetailRow label="تصنيف الفئة" value={classificationName(category)} />
                  <DetailRow
                    label="رقم التصنيف"
                    value={category.classificationId === null ? "-" : `#${category.classificationId}`}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryFormDialog({
  classifications,
  error,
  form,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  classifications: CategoryClassification[];
  error: string;
  form: CategoryFormState;
  loading: boolean;
  onChange: (nextForm: CategoryFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const imageObjectUrlRef = useRef<string | null>(null);
  useBodyScrollLock(true);

  useEffect(
    () => () => {
      if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    },
    [],
  );

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = previewUrl;
    onChange({
      ...form,
      imagePreview: previewUrl,
      imageFile: file,
      imageRemovedLocally: false,
    });
    event.target.value = "";
  }

  function clearLocalPreview() {
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
    onChange({
      ...form,
      imagePreview: null,
      imageFile: null,
      imageRemovedLocally: true,
    });
  }

  const classificationOptions = classifications.map((classification) => ({
    value: String(classification.id),
    label: classification.name,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/35 p-4 backdrop-blur-[1px]">
      <form
        aria-labelledby="category-form-title"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-lg border bg-background p-6 shadow-2xl"
        onSubmit={onSubmit}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="category-form-title" className="text-lg font-semibold">
              {form.mode === "edit" ? "تعديل الفئة" : "إضافة فئة جديدة"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.mode === "edit"
                ? "عدّل بيانات الفئة وصورتها."
                : "أنشئ فئة منتجات جديدة من بيانات الباك."}
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
            {error.split("\n").map((line) => (
              <div key={line}>{line}</div>
            ))}
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
                      placeholderType="category"
                      alt="معاينة صورة الفئة"
                      width={360}
                      height={225}
                      sizes="360px"
                      className="absolute inset-0 size-full"
                      imageClassName="object-cover"
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
                  {form.imageFile
                    ? form.imageFile.name
                    : form.imagePreview
                      ? "الصورة الحالية مستخدمة"
                      : "لم يتم اختيار صورة"}
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
              {form.imageRemovedLocally && form.mode === "edit" ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  إزالة الصورة من الباك غير موثقة؛ الحفظ بدون صورة جديدة سيحافظ على صورة الباك الحالية.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              اسم الفئة
              <Input
                className="h-11"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder="اسم الفئة مطلوب"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              تصنيف الفئة
              <AppSelect
                value={form.classificationId}
                onValueChange={(classificationId) =>
                  onChange({ ...form, classificationId })
                }
                options={classificationOptions}
                disabled={!classificationOptions.length}
                icon={<Layers3 className="size-4" />}
                placeholder="اختر التصنيف"
                className="h-11"
                ariaLabel="تصنيف الفئة"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              نوع الفئة
              <TypeSelector
                value={form.type}
                onChange={(type) => onChange({ ...form, type })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              وصف الفئة
              <textarea
                value={form.description}
                onChange={(event) =>
                  onChange({ ...form, description: event.target.value })
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
          <Button disabled={loading} type="submit">
            {loading ? "جاري الحفظ..." : form.mode === "edit" ? "حفظ التعديلات" : "إنشاء"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CategoryActionsMenu({
  name,
  open,
  onToggle,
  onView,
  onEdit,
  onDelete,
}: {
  name: string;
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-center">
      <ActionMenu
        open={open}
        onToggle={onToggle}
        align="center"
        label={`إجراءات ${name}`}
        title="بيانات الفئة"
        triggerClassName="h-8 w-12"
        menuClassName="w-48"
        items={[
          { label: "بيانات الفئة", icon: Eye, onClick: onView },
          { label: "تعديل", icon: Edit, onClick: onEdit },
          { label: "حذف", icon: Trash2, onClick: onDelete, tone: "danger" },
        ]}
      />
    </div>
  );
}

export function CategoriesPage() {
  const { apiFetch } = useAuth();
  const { openRow, toggleRow } = useItemTableState();
  const { showSnackbar } = useSnackbar();
  const [categories, setCategories] = useState<NormalizedProductCategory[]>([]);
  const [classifications, setClassifications] = useState<CategoryClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<CategoryFormState | null>(null);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [detailCategory, setDetailCategory] = useState<NormalizedProductCategory | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      setLoading(true);
      setError("");

      try {
        const [nextCategories, nextClassifications] = await Promise.all([
          listProductCategories(apiFetch),
          listCategoryClassifications(apiFetch),
        ]);

        if (!active) return;
        setCategories(nextCategories);
        setClassifications(nextClassifications);
      } catch (loadError) {
        if (active) setError(normalizeError(loadError, "تعذر تحميل الفئات"));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [apiFetch]);

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...categoryTypeOptions.map((option) => option.value),
          ...categories.map((category) => category.type).filter(Boolean),
        ]),
      ),
    [categories],
  );

  const visibleRows = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase("ar-EG");

    return categories.filter((category) => {
      const matchesSearch =
        !search ||
        [
          category.name,
          category.type,
          category.description,
          classificationName(category),
        ]
          .join(" ")
          .toLocaleLowerCase("ar-EG")
          .includes(search);
      const matchesType = typeFilter === "all" || category.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [categories, searchTerm, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / categoriesPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * categoriesPageSize;
  const pagedRows = visibleRows.slice(pageStartIndex, pageStartIndex + categoriesPageSize);
  const detailDialogOpen = detailLoading || Boolean(detailError) || Boolean(detailCategory);

  function resetToFirstPage() {
    setCurrentPage(1);
  }

  function openCreateForm() {
    setFormError("");
    setForm({
      ...emptyFormState(),
      classificationId: classifications[0] ? String(classifications[0].id) : "",
    });
    toggleRow("");
  }

  async function openEditForm(category: NormalizedProductCategory) {
    setOpenDetailClosed();
    setFormError("");
    setFormSaving(false);

    try {
      const detail = await getProductCategory(apiFetch, category.id);
      const fallbackClassification =
        detail.classificationId !== null &&
        !classifications.some((item) => item.id === detail.classificationId)
          ? {
              id: detail.classificationId,
              name: classificationName(detail),
            }
          : null;

      if (fallbackClassification) {
        setClassifications((current) => [...current, fallbackClassification]);
      }
      setForm({
        id: detail.id,
        mode: "edit",
        name: detail.name,
        classificationId: detail.classificationId === null ? "" : String(detail.classificationId),
        type: detail.type || categoryTypeOptions[0].value,
        description: detail.description,
        imagePreview: detail.image,
        imageFile: null,
        imageRemovedLocally: false,
      });
    } catch (editError) {
      showSnackbar({
        message:
          editError instanceof AdminApiError && editError.status === 404
            ? "تعذر العثور على الفئة"
            : normalizeError(editError, "تعذر تحميل بيانات الفئة"),
        tone: "danger",
      });
    }
  }

  function closeForm() {
    setForm(null);
    setFormError("");
    setFormSaving(false);
  }

  function validateForm(currentForm: CategoryFormState) {
    if (!currentForm.name.trim()) return "اسم الفئة مطلوب";
    if (!currentForm.classificationId || !Number.isFinite(Number(currentForm.classificationId))) {
      return "تصنيف الفئة مطلوب";
    }
    if (!currentForm.type.trim()) return "نوع الفئة مطلوب";
    return "";
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || formSaving) return;

    const validationError = validateForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = productCategoryPayload(form);
    setFormSaving(true);
    setFormError("");

    try {
      const savedCategory =
        form.mode === "edit" && form.id !== undefined
          ? await updateProductCategory(apiFetch, form.id, payload, form.imageFile)
          : await createProductCategory(apiFetch, payload, form.imageFile);

      setCategories((current) =>
        form.mode === "edit"
          ? current.map((category) =>
              category.id === savedCategory.id ? savedCategory : category,
            )
          : [savedCategory, ...current],
      );
      closeForm();
      showSnackbar({
        message:
          form.mode === "edit"
            ? "تم حفظ تعديلات الفئة في الباك."
            : "تم إنشاء الفئة في الباك.",
      });
    } catch (saveError) {
      if (saveError instanceof AdminApiError) {
        const messages = fieldErrors(saveError.data);
        setFormError(messages.length ? messages.join("\n") : saveError.message);
      } else {
        setFormError(normalizeError(saveError, "تعذر حفظ الفئة"));
      }
    } finally {
      setFormSaving(false);
    }
  }

  async function openDetail(category: NormalizedProductCategory) {
    setDetailCategory(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const detail = await getProductCategory(apiFetch, category.id);
      setDetailCategory(detail);
    } catch (detailLoadError) {
      setDetailError(
        detailLoadError instanceof AdminApiError && detailLoadError.status === 404
          ? "تعذر العثور على الفئة"
          : normalizeError(detailLoadError, "تعذر تحميل بيانات الفئة"),
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function setOpenDetailClosed() {
    setDetailCategory(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function deleteCategory(category: NormalizedProductCategory) {
    try {
      await deleteProductCategory(apiFetch, category.id);
      setCategories((current) =>
        current.filter((currentCategory) => currentCategory.id !== category.id),
      );
      showSnackbar({
        message: `تم حذف ${category.name} من الباك.`,
        tone: "danger",
      });
    } catch (deleteError) {
      showSnackbar({
        message: normalizeError(deleteError, "تعذر حذف الفئة"),
        tone: "danger",
      });
    }
  }

  const tableRows = (loading ? [] : pagedRows).map((row, rowPosition) => [
    <span
      key={`order-${row.id}`}
      className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
    >
      {pageStartIndex + rowPosition + 1}
    </span>,
    <div key={`image-${row.id}`} className="flex justify-center">
      <DashboardImage
        alt={row.name}
        src={row.image}
        placeholderType="category"
        width={48}
        height={48}
        sizes="48px"
        className="size-12 rounded-sm border bg-muted/30"
        imageClassName="object-contain p-1"
      />
    </div>,
    <div key={`name-${row.id}`} className="min-w-0">
      <p className="truncate font-semibold">{row.name || "-"}</p>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
        {row.description || "-"}
      </p>
    </div>,
    <span
      key={`type-${row.id}`}
      className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground"
    >
      {categoryTypeLabel(row.type)}
    </span>,
    <span key={`classification-${row.id}`} className="text-sm font-medium">
      {classificationName(row)}
    </span>,
    <CategoryActionsMenu
      key={`actions-${row.id}`}
      name={row.name}
      open={openRow === String(row.id)}
      onToggle={() => toggleRow(String(row.id))}
      onView={() => {
        toggleRow(String(row.id));
        void openDetail(row);
      }}
      onEdit={() => {
        toggleRow(String(row.id));
        void openEditForm(row);
      }}
      onDelete={() => {
        toggleRow(String(row.id));
        void deleteCategory(row);
      }}
    />,
  ]);

  return (
    <div className="px-6 py-6">
      <div className="flex min-h-[57px] items-start">
        <div>
          <h1 className="text-2xl font-semibold leading-8">الفئات</h1>
          <p className="mt-1 text-sm leading-[21px] text-muted-foreground">
            إدارة فئات المنتجات وصورها من باك كتالوج المنتجات.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <div className="flex min-h-[76px] flex-col items-start justify-between gap-4 border-b px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-base font-semibold">كل الفئات</div>
            <div className="mt-1 text-xs text-muted-foreground">
              الصور والبيانات تأتي من /catalog/product-categories/.
            </div>
          </div>
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="size-4" />
            إضافة فئة جديدة
          </Button>
        </div>

        <div className="p-6 pt-4">
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <label className="flex flex-col gap-2 md:flex-1">
              <span className="text-sm leading-5">بحث</span>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="ps-9"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    resetToFirstPage();
                  }}
                  placeholder="ابحث في الفئات..."
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 md:w-[220px]">
              <span className="text-sm leading-5">نوع الفئة</span>
              <AppSelect
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  resetToFirstPage();
                }}
                options={[
                  { value: "all", label: "الكل" },
                  ...typeOptions.map((type) => ({
                    value: type,
                    label: categoryTypeLabel(type),
                  })),
                ]}
                className="h-9"
                ariaLabel="نوع الفئة"
              />
            </label>
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border">
            <DataTable
              minWidth={980}
              rowHeight="tall"
              columnWidths={[90, 110, 310, 150, 220, 110]}
              headers={[
                <span key="order" className="block text-center">
                  #
                </span>,
                <span key="image" className="block text-center">
                  الصورة
                </span>,
                "الاسم",
                "النوع",
                "تصنيف الفئة",
                <span key="actions" className="block text-center">
                  إجراءات
                </span>,
              ]}
              rows={tableRows}
            />
            {loading ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                جاري تحميل الفئات...
              </div>
            ) : !visibleRows.length ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                لا توجد فئات مطابقة.
              </div>
            ) : null}
          </div>

          <Pagination
            text={`عرض ${pagedRows.length} من ${visibleRows.length} نتيجة`}
            pages={`${safeCurrentPage} / ${totalPages}`}
            showPerPage={false}
            previousDisabled={safeCurrentPage === 1}
            nextDisabled={safeCurrentPage === totalPages}
            onPrevious={() =>
              setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
            }
            onNext={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, Math.min(page, totalPages) + 1),
              )
            }
          />
        </div>
      </Card>

      {form ? (
        <CategoryFormDialog
          classifications={classifications}
          error={formError}
          form={form}
          loading={formSaving}
          onChange={setForm}
          onClose={closeForm}
          onSubmit={submitForm}
        />
      ) : null}

      {detailDialogOpen ? (
        <CategoryDetailDialog
          category={detailCategory}
          error={detailError}
          loading={detailLoading}
          onClose={setOpenDetailClosed}
        />
      ) : null}
    </div>
  );
}
