"use client";

import { useEffect, useRef, useState } from "react";
import {
  Edit,
  GripVertical,
  Pencil,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  adminApiPaths,
  apiList,
  categoryRowFromApi,
  fetchAdminRows,
  readApiData,
  sendAdminJson,
  type BackendRecord,
} from "../admin-api";
import { categoryRows, type CategoryRow } from "../data";
import { DashboardImage } from "../dashboard-image";
import {
  ActionMenu,
  AppSelect,
  Button,
  Card,
  DataTable,
  Field,
  Input,
  Pagination,
  Switch,
} from "../primitives";
import { useDisclosure } from "../hooks";
import { useSnackbar } from "../snackbar";

type CategoryStatusFilter = "all" | "active" | "inactive";
type CategoryTypeFilter = "all" | "popular";
type CategorySectionFilter = string;

const initialCategorySectionOptions: CategorySectionFilter[] = [
  "all",
  "الطازج",
  "الأكل",
  "التسوق",
  "البيت",
  "الموضة",
  "الخدمات",
];

const categoriesPageSize = 10;

function CategoryDrawer({
  category,
  onClose,
  onSubmit,
}: {
  category?: CategoryRow | null;
  onClose: () => void;
  onSubmit: (draft: {
    name: string;
    classificationName: string;
    type: string;
    description: string;
  }) => void;
}) {
  const isEditing = Boolean(category);
  const selectedSection = category?.sections[0] ?? "الطازج";
  const categoryImageObjectUrlRef = useRef<string | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState(category?.image ?? "");
  const [categoryImageName, setCategoryImageName] = useState("");
  const [name, setName] = useState(category?.name ?? "");
  const [isPopular, setIsPopular] = useState(category?.featured !== "نعم");
  const [description, setDescription] = useState("");

  function revokeCategoryImageObjectUrl() {
    if (categoryImageObjectUrlRef.current) {
      URL.revokeObjectURL(categoryImageObjectUrlRef.current);
      categoryImageObjectUrlRef.current = null;
    }
  }

  function handleCategoryImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    revokeCategoryImageObjectUrl();
    const nextPreview = URL.createObjectURL(file);
    categoryImageObjectUrlRef.current = nextPreview;
    setCategoryImagePreview(nextPreview);
    setCategoryImageName(file.name);
    event.target.value = "";
  }

  function resetCategoryImage() {
    revokeCategoryImageObjectUrl();
    setCategoryImagePreview(category?.image ?? "");
    setCategoryImageName("");
  }

  useEffect(() => {
    const objectUrlRef = categoryImageObjectUrlRef;

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-foreground/30 p-4 backdrop-blur-[1px]"
    >
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-[980px] flex-col rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-category-title" className="text-lg font-semibold">
              {isEditing ? "تعديل الفئة" : "إضافة فئة جديدة"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEditing
                ? "عدّل بيانات الفئة وحالة ظهورها الشائعة."
                : "أنشئ فئة جديدة تظهر داخل القسم المناسب في تطبيق العملاء."}
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

        <div className="mt-5 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-3 text-sm font-medium lg:sticky lg:top-0">
            <div className="text-sm font-medium leading-5">صورة الفئة</div>
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3">
              <label className="group relative flex aspect-[16/10] min-h-[190px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCategoryImageChange}
                  type="file"
                />
                {categoryImagePreview ? (
                  <>
                    <DashboardImage
                      src={categoryImagePreview}
                      alt="معاينة صورة الفئة"
                      width={300}
                      height={300}
                      sizes="150px"
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
              <div className="flex min-w-0 flex-col gap-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  استخدم صورة مربعة وواضحة. الصيغ المدعومة PNG, JPG, WEBP.
                </p>
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {categoryImageName ||
                      (category?.image ? "الصورة الحالية مستخدمة" : "لم يتم اختيار صورة")}
                  </span>
                  {categoryImagePreview && categoryImageName ? (
                    <button
                      type="button"
                      onClick={resetCategoryImage}
                      className="inline-flex shrink-0 items-center gap-1 font-semibold text-destructive transition hover:text-destructive/80"
                    >
                      <X className="size-3.5" />
                      حذف
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex h-[76px] flex-col gap-3 text-sm font-medium sm:col-span-2">
              <span className="leading-5">اسم الفئة</span>
              <Input
                className="h-11"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="مثلاً: طيور، أسماك، لحوم فريش..."
              />
            </label>
            <div className="flex h-[76px] items-center justify-between gap-4 rounded-md border bg-muted/15 px-4 text-sm font-medium sm:col-span-2">
              <span className="leading-5">تصنيف الفئة</span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </div>
            <label className="flex min-h-[124px] flex-col gap-3 text-sm font-medium sm:col-span-2">
              <span className="leading-5">وصف الفئة</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-24 resize-none rounded-md border border-border bg-input px-3 py-2 text-sm font-normal leading-6 text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                placeholder="اكتب وصف مختصر للفئة..."
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-border/70 pt-4">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                name,
                classificationName: selectedSection,
                type: isPopular ? "popular" : "featured",
                description,
              })
            }
          >
            {isEditing ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {isEditing ? "حفظ التعديلات" : "إنشاء"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryActionsMenu({
  name,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  name: string;
  open: boolean;
  onToggle: () => void;
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
        menuClassName="w-40"
        items={[
          { label: "تعديل", icon: Edit, onClick: onEdit },
          { label: "حذف", icon: Trash2, onClick: onDelete, tone: "danger" },
        ]}
      />
    </div>
  );
}

function CategoryInlineEditPanel({
  category,
  onCancel,
  onSave,
}: {
  category: CategoryRow;
  onCancel: () => void;
  onSave: (draft: {
    name: string;
    classificationName: string;
    type: string;
    description: string;
  }) => void;
}) {
  const [name, setName] = useState(category.name);
  const [isPopular, setIsPopular] = useState(category.featured !== "نعم");
  const categoryImageObjectUrlRef = useRef<string | null>(null);
  const [imagePreview, setImagePreview] = useState(category.image);

  function revokeCategoryImageObjectUrl() {
    if (categoryImageObjectUrlRef.current) {
      URL.revokeObjectURL(categoryImageObjectUrlRef.current);
      categoryImageObjectUrlRef.current = null;
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    revokeCategoryImageObjectUrl();
    const nextPreview = URL.createObjectURL(file);
    categoryImageObjectUrlRef.current = nextPreview;
    setImagePreview(nextPreview);
    event.target.value = "";
  }

  useEffect(() => revokeCategoryImageObjectUrl, []);

  return (
    <form
      className="rounded-md border border-primary/25 bg-primary/5 p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name,
          classificationName: category.sections[0] ?? "الطازج",
          type: isPopular ? "popular" : "featured",
          description: "",
        });
      }}
    >
      <div className="grid gap-3 lg:grid-cols-[76px_minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium leading-none">
          الصورة
          <span className="group relative flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
            <input
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
              type="file"
            />
            <DashboardImage
              alt={category.name}
              src={imagePreview}
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
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="اسم الفئة">
            <Input
              value={name}
              className="h-9"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="تصنيف الفئة">
            <div className="flex h-9 items-center justify-between gap-3 rounded-md border bg-input px-3 text-sm font-medium">
              <span>{isPopular ? "فئة شائعة" : "الكل"}</span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </div>
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

export function CategoriesPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const categoryDrawer = useDisclosure(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [orderedRows, setOrderedRows] = useState(() => categoryRows);
  const [categorySectionOptions, setCategorySectionOptions] = useState(
    () => initialCategorySectionOptions,
  );
  const [categoryClassificationIds, setCategoryClassificationIds] = useState<
    Record<string, string | number>
  >({});
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(
    null,
  );
  const [inlineEditingCategory, setInlineEditingCategory] = useState<CategoryRow | null>(null);
  const [draggingRowIndex, setDraggingRowIndex] = useState<string | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CategoryStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadCategoryData() {
      try {
        const [categories, classificationsResponse] = await Promise.all([
          fetchAdminRows(
            apiFetch,
            adminApiPaths.productCategories,
            categoryRowFromApi,
          ),
          apiFetch(adminApiPaths.categoryClassifications),
        ]);
        const classificationsData = await readApiData(classificationsResponse);

        if (!active) return;
        setOrderedRows(categories);

        if (classificationsResponse.ok) {
          const nextSections = apiList(classificationsData)
            .map((item) => String(item.name ?? "").trim())
            .filter(Boolean);
          const nextSectionIds = Object.fromEntries(
            apiList(classificationsData)
              .map((item) => [String(item.name ?? "").trim(), item.id])
              .filter(([name, id]) => Boolean(name) && (typeof id === "string" || typeof id === "number")),
          ) as Record<string, string | number>;

          if (nextSections.length) {
            setCategorySectionOptions(["all", ...nextSections]);
            setCategoryClassificationIds(nextSectionIds);
          }
        }
      } catch (error) {
        if (!active) return;
        showSnackbar({
          message:
            error instanceof Error
              ? error.message
              : "تعذر تحميل الفئات من الباك.",
          tone: "danger",
        });
      }
    }

    void loadCategoryData();

    return () => {
      active = false;
    };
  }, [apiFetch, showSnackbar]);

  const visibleRows = orderedRows.filter((row) => {
    const matchesSearch = row.name
      .toLocaleLowerCase("ar-EG")
      .includes(searchTerm.trim().toLocaleLowerCase("ar-EG"));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? row.active : !row.active);
    const matchesType = typeFilter === "all" || row.featured !== "نعم";

    return matchesSearch && matchesStatus && matchesType;
  });
  const totalPages = Math.max(
    1,
    Math.ceil(visibleRows.length / categoriesPageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * categoriesPageSize;
  const pagedRows = visibleRows.slice(
    pageStartIndex,
    pageStartIndex + categoriesPageSize,
  );

  function moveCategoryTo(rowIndex: string, targetRowIndex: string) {
    if (rowIndex === targetRowIndex) return;

    const sourceVisibleIndex = visibleRows.findIndex(
      (row) => row.index === rowIndex,
    );
    const targetVisibleIndex = visibleRows.findIndex(
      (row) => row.index === targetRowIndex,
    );

    if (sourceVisibleIndex === -1 || targetVisibleIndex === -1) return;

    setOrderedRows((currentRows) => {
      const sourceIndex = currentRows.findIndex((row) => row.index === rowIndex);
      const targetIndex = currentRows.findIndex(
        (row) => row.index === targetRowIndex,
      );

      if (sourceIndex === -1 || targetIndex === -1) return currentRows;

      const [sourceRow] = currentRows.slice(sourceIndex, sourceIndex + 1);
      const rowsWithoutSource = currentRows.filter(
        (row) => row.index !== rowIndex,
      );
      const targetIndexAfterRemoval = rowsWithoutSource.findIndex(
        (row) => row.index === targetRowIndex,
      );
      const insertIndex =
        sourceVisibleIndex < targetVisibleIndex
          ? targetIndexAfterRemoval + 1
          : targetIndexAfterRemoval;

      return [
        ...rowsWithoutSource.slice(0, insertIndex),
        sourceRow,
        ...rowsWithoutSource.slice(insertIndex),
      ];
    });
    setOpenActionMenu(null);
    showSnackbar({ message: "تم تحديث ترتيب الفئات." });
  }

  function resetToFirstPage() {
    setCurrentPage(1);
  }

  function openCreateDrawer() {
    setEditingCategory(null);
    setInlineEditingCategory(null);
    categoryDrawer.open();
  }

  function openEditDrawer(category: CategoryRow) {
    setEditingCategory(category);
    setInlineEditingCategory(category);
    setOpenActionMenu(null);
  }

  function closeCategoryDrawer() {
    categoryDrawer.close();
    setEditingCategory(null);
  }

  async function toggleCategoryStatus(rowIndex: string, checked: boolean) {
    const previousRows = orderedRows;
    setOrderedRows((currentRows) =>
      currentRows.map((row) =>
        row.index === rowIndex ? { ...row, active: checked } : row,
      ),
    );

    try {
      await sendAdminJson(
        apiFetch,
        `${adminApiPaths.productCategories}${encodeURIComponent(rowIndex)}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: checked }),
        },
      );
      showSnackbar({
        message: checked ? "تم تفعيل الفئة في الباك." : "تم إيقاف الفئة في الباك.",
      });
    } catch (error) {
      setOrderedRows(previousRows);
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "تعذر تحديث حالة الفئة في الباك.",
        tone: "danger",
      });
    }
  }

  async function deleteCategory(category: CategoryRow) {
    const previousRows = orderedRows;
    setOrderedRows((currentRows) =>
      currentRows.filter((row) => row.index !== category.index),
    );

    try {
      await sendAdminJson(
        apiFetch,
        `${adminApiPaths.productCategories}${encodeURIComponent(category.index)}/`,
        { method: "DELETE" },
      );
      showSnackbar({
        message: `تم حذف ${category.name} من الباك.`,
        tone: "danger",
      });
    } catch (error) {
      setOrderedRows(previousRows);
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "تعذر حذف الفئة من الباك.",
        tone: "danger",
      });
    }
  }

  function classificationIdByName(name: string) {
    if (categoryClassificationIds[name]) return categoryClassificationIds[name];

    const sectionIndex = categorySectionOptions
      .filter((section) => section !== "all")
      .findIndex((section) => section === name);

    return sectionIndex >= 0 ? sectionIndex + 1 : 1;
  }

  async function saveCategoryDraft(draft: {
    name: string;
    classificationName: string;
    type: string;
    description: string;
  }) {
    const payload = {
      classification_id: classificationIdByName(draft.classificationName),
      name: draft.name.trim(),
      type: draft.type === "featured" ? "فئات مميزة" : "فئات شائعة",
      description: draft.description.trim(),
    };
    const path = editingCategory
      ? `${adminApiPaths.productCategories}${encodeURIComponent(editingCategory.index)}/`
      : adminApiPaths.productCategories;
    try {
      const data = await sendAdminJson(apiFetch, path, {
        method: editingCategory ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      const nextRow = categoryRowFromApi(data as BackendRecord, orderedRows.length);

      setOrderedRows((currentRows) =>
        editingCategory
          ? currentRows.map((row) =>
              row.index === editingCategory.index ? nextRow : row,
            )
          : [nextRow, ...currentRows],
      );
      closeCategoryDrawer();
      setInlineEditingCategory(null);
      showSnackbar({
        message: editingCategory
          ? "تم حفظ تعديلات الفئة في الباك."
          : "تم إنشاء الفئة في الباك.",
      });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "تعذر حفظ الفئة في الباك.",
        tone: "danger",
      });
    }
  }

  const rowsForCategoriesTable = pagedRows.flatMap((row, visibleIndex) => {
    const baseRow = [
      <div
        key={`order-${row.index}`}
        className="flex items-center justify-center gap-3 px-3"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
          {pageStartIndex + visibleIndex + 1}
        </span>
        <span
          className="inline-flex size-8 cursor-grab items-center justify-center rounded-md border bg-background text-muted-foreground active:cursor-grabbing"
          aria-label={`تحريك ${row.name}`}
          title="اسحب لتغيير الترتيب"
        >
          <GripVertical className="size-4" />
        </span>
      </div>,
      <div key={`image-${row.index}`} className="flex justify-center">
        <DashboardImage
          alt={row.name}
          src={row.image}
          width={40}
          height={40}
          sizes="40px"
          className="size-10 rounded-sm"
        />
      </div>,
      <div key={`name-${row.index}`} className="min-w-0">
        <p className="truncate font-semibold">{row.name}</p>
        {row.featured !== "نعم" ? (
          <p className="mt-1">
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              فئة شائعة
            </span>
          </p>
        ) : null}
      </div>,
      <div key={`status-${row.index}`} className="flex justify-center">
        <Switch
          checked={row.active}
          onCheckedChange={(checked) => toggleCategoryStatus(row.index, checked)}
        />
      </div>,
      <CategoryActionsMenu
        key={`actions-${row.index}`}
        name={row.name}
        open={openActionMenu === row.index}
        onToggle={() =>
          setOpenActionMenu((current) =>
            current === row.index ? null : row.index,
          )
        }
        onEdit={() => openEditDrawer(row)}
        onDelete={() => {
          setOpenActionMenu(null);
          void deleteCategory(row);
        }}
      />,
    ];

    if (inlineEditingCategory?.index !== row.index) {
      return [baseRow];
    }

    return [
      baseRow,
      [
        <CategoryInlineEditPanel
          key={`edit-${row.index}`}
          category={inlineEditingCategory}
          onCancel={() => {
            setInlineEditingCategory(null);
            setEditingCategory(null);
          }}
          onSave={(draft) => void saveCategoryDraft(draft)}
        />,
        null,
        null,
        null,
        null,
      ],
    ];
  });

  return (
    <div className="px-6 py-6">
      <div className="flex min-h-[57px] items-start">
        <div>
          <h1 className="text-2xl font-semibold leading-8">
            الفئات
          </h1>
          <p className="mt-1 text-sm leading-[21px] text-muted-foreground">
            إدارة فئات المنتجات وحالة ظهورها داخل تطبيق العملاء.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <div className="flex min-h-[76px] flex-col items-start justify-between gap-4 border-b px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-base font-semibold">كل الفئات</div>
            <div className="mt-1 text-xs text-muted-foreground">
              أنشئ فئة جديدة لتنظيم المنتجات.
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Button size="sm" onClick={openCreateDrawer}>
              <Plus className="size-4" />
              إضافة فئة جديدة
            </Button>
          </div>
        </div>
        <div className="p-6 pt-4">
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
            <label className="flex flex-col gap-2 md:w-[150px]">
              <span className="text-sm leading-5">الحالة</span>
              <AppSelect
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as CategoryStatusFilter);
                  setOpenActionMenu(null);
                  resetToFirstPage();
                }}
                options={[
                  { value: "all", label: "كل الحالات" },
                  { value: "active", label: "نشط" },
                  { value: "inactive", label: "غير نشط" },
                ]}
                className="h-9"
                contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
                ariaLabel="الحالة"
              />
            </label>
            <label className="flex flex-col gap-2 md:w-[170px]">
              <span className="text-sm leading-5">تصنيف الفئة</span>
              <AppSelect
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as CategoryTypeFilter);
                  setOpenActionMenu(null);
                  resetToFirstPage();
                }}
                options={[
                  { value: "all", label: "الكل" },
                  { value: "popular", label: "فئة شائعة" },
                ]}
                className="h-9"
                contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
                ariaLabel="تصنيف الفئة"
              />
            </label>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border">
            <DataTable
              minWidth={1120}
              rowHeight="tall"
              columnWidths={[110, 120, 430, 150, 140]}
              headers={[
                <span key="order" className="block text-center">
                  الترتيب
                </span>,
                <span key="image" className="block text-center">
                  الصورة
                </span>,
                "الاسم",
                <span key="status" className="block text-center">
                  الحالة
                </span>,
                <span key="actions" className="block text-center">
                  إجراءات
                </span>,
              ]}
              getRowProps={(rowIndex) => {
                const tableRow = rowsForCategoriesTable[rowIndex];
                if (!tableRow || tableRow[1] === null) {
                  return undefined;
                }
                let row: CategoryRow | null = null;
                let tableIndex = 0;
                for (const pagedRow of pagedRows) {
                  if (tableIndex === rowIndex) {
                    row = pagedRow;
                    break;
                  }
                  tableIndex += 1;
                  if (inlineEditingCategory?.index === pagedRow.index) {
                    tableIndex += 1;
                  }
                }
                if (!row) return undefined;

                return {
                  draggable: true,
                  onDragStart: (event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", row.index);
                    setDraggingRowIndex(row.index);
                    setDragOverRowIndex(null);
                  },
                  onDragOver: (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverRowIndex(row.index);
                  },
                  onDragLeave: () => {
                    setDragOverRowIndex((current) =>
                      current === row.index ? null : current,
                    );
                  },
                  onDrop: (event) => {
                    event.preventDefault();
                    const sourceRowIndex =
                      event.dataTransfer.getData("text/plain") ??
                      draggingRowIndex;
                    if (sourceRowIndex) {
                      moveCategoryTo(sourceRowIndex, row.index);
                    }
                    setDraggingRowIndex(null);
                    setDragOverRowIndex(null);
                  },
                  onDragEnd: () => {
                    setDraggingRowIndex(null);
                    setDragOverRowIndex(null);
                  },
                  className:
                    dragOverRowIndex === row.index &&
                    draggingRowIndex !== row.index
                      ? "bg-accent/60"
                      : draggingRowIndex === row.index
                        ? "opacity-60"
                        : undefined,
                };
              }}
              rows={rowsForCategoriesTable}
              getCellProps={(_rowIndex, cellIndex, row) =>
                row[1] === null && cellIndex === 0
                  ? { colSpan: 5, className: "p-3" }
                  : undefined
              }
            />
          </div>
          <Pagination
            text={`عرض ${pagedRows.length} من ${visibleRows.length} نتيجة`}
            pages={`${safeCurrentPage} / ${totalPages}`}
            showPerPage={false}
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
        </div>
      </Card>
      {categoryDrawer.isOpen ? (
        <CategoryDrawer
          category={editingCategory}
          onClose={closeCategoryDrawer}
          onSubmit={(draft) => void saveCategoryDraft(draft)}
        />
      ) : null}
    </div>
  );
}
