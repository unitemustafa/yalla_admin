"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Edit,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import type { AddonRow } from "../addons/types";
import { useAuth } from "@/features/auth/auth-provider";
import {
  addonRowFromApi,
  adminApiPaths,
  apiErrorMessage,
  apiList,
  fetchAdminRows,
  readApiData,
  sendAdminJson,
  type BackendRecord,
} from "../admin-api";
import { DashboardImage } from "../dashboard-image";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import {
  AppSelect,
  Button,
  Card,
  DataTable,
  Field,
  Input,
  PageTitle,
  Pagination,
  Switch,
} from "../primitives";
import { cn } from "@/lib/utils";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import {
  AddonEditPanel,
  AddonIdentity,
  AddonInfoPill,
  AddonPriceCell,
  AddonRowIconButton,
  EmptyStateTable,
  MissingAddonCategoriesDialog,
  addonMatchesSearch,
  translateAddonCategoryDeleteError,
  type AddonCategoryRecord,
} from "./components";

const dashboardListPageSize = 10;

export function AddonsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [addonSearch, setAddonSearch] = useState("");
  const [selectedAddonCategory, setSelectedAddonCategory] = useState("all");
  const [addonFormCategory, setAddonFormCategory] = useState("");
  const [addonNameAr, setAddonNameAr] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [rows, setRows] = useState<AddonRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<Record<string, string | number>>(
    {},
  );
  const [addonCategories, setAddonCategories] = useState<AddonCategoryRecord[]>([]);
  const [editingAddon, setEditingAddon] = useState<AddonRow | null>(null);
  const [addonDeleteTarget, setAddonDeleteTarget] = useState<AddonRow | null>(null);
  const [editingCategory, setEditingCategory] = useState<AddonCategoryRecord | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<AddonCategoryRecord | null>(null);
  const addonImageObjectUrlRef = useRef<string | null>(null);
  const editAddonImageObjectUrlRef = useRef<string | null>(null);
  const [addonImagePreview, setAddonImagePreview] = useState("");
  const [addonImageName, setAddonImageName] = useState("");
  const [addonImageFile, setAddonImageFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const visibleAddons = useMemo(
    () =>
      rows.filter(
        (addon) =>
          addonMatchesSearch(addon, addonSearch) &&
          (selectedAddonCategory === "all" ||
            addon.category === selectedAddonCategory),
      ),
    [addonSearch, rows, selectedAddonCategory],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(visibleAddons.length / dashboardListPageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * dashboardListPageSize;
  const pagedAddons = visibleAddons.slice(
    pageStartIndex,
    pageStartIndex + dashboardListPageSize,
  );
  const currentAddonFormCategory = addonFormCategory || categoryOptions[0] || "";

  const loadAddons = useCallback(async (showFailure = false) => {
    setAddonsLoading(true);

    try {
      const [addons, classificationsResponse] = await Promise.all([
        fetchAdminRows(
          apiFetch,
          adminApiPaths.productAdditions,
          addonRowFromApi,
        ),
        apiFetch(adminApiPaths.additionClassifications),
      ]);
      const classificationsData = await readApiData(classificationsResponse);
      setRows(addons);

      if (classificationsResponse.ok) {
        const classifications = apiList(classificationsData)
          .map((item) => String(item.name ?? "").trim())
          .filter(Boolean);
        const classificationIds = Object.fromEntries(
          apiList(classificationsData)
            .map((item) => [String(item.name ?? "").trim(), item.id])
            .filter(([name, id]) => Boolean(name) && (typeof id === "string" || typeof id === "number")),
        ) as Record<string, string | number>;
        setAddonCategories(
          apiList(classificationsData)
            .map((item) => ({ id: String(item.id ?? ""), name: String(item.name ?? "").trim() }))
            .filter((item) => Boolean(item.id) && Boolean(item.name)),
        );
        setCategoryOptions(classifications);
        setCategoryIds(classificationIds);
        setAddonFormCategory(classifications[0] ?? "");
        setSelectedAddonCategory((currentCategory) =>
          currentCategory === "all" || classifications.includes(currentCategory)
            ? currentCategory
            : "all",
        );
      }
    } catch (error) {
      if (showFailure) {
        showSnackbar({
          message: error instanceof Error ? error.message : "تعذر تحديث الإضافات.",
          tone: "danger",
        });
      }
    } finally {
      setAddonsLoading(false);
    }
  }, [apiFetch, showSnackbar]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAddons(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAddons]);

  function revokeAddonImageObjectUrl() {
    if (addonImageObjectUrlRef.current) {
      URL.revokeObjectURL(addonImageObjectUrlRef.current);
      addonImageObjectUrlRef.current = null;
    }
  }

  function revokeEditAddonImageObjectUrl() {
    if (editAddonImageObjectUrlRef.current) {
      URL.revokeObjectURL(editAddonImageObjectUrlRef.current);
      editAddonImageObjectUrlRef.current = null;
    }
  }

  function handleAddonImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    revokeAddonImageObjectUrl();
    const nextPreview = URL.createObjectURL(file);
    addonImageObjectUrlRef.current = nextPreview;
    setAddonImagePreview(nextPreview);
    setAddonImageName(file.name);
    setAddonImageFile(file);
    event.target.value = "";
  }

  function handleEditAddonImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !editingAddon) {
      return;
    }

    revokeEditAddonImageObjectUrl();
    const nextPreview = URL.createObjectURL(file);
    editAddonImageObjectUrlRef.current = nextPreview;
    setEditingAddon({ ...editingAddon, image: nextPreview });
    event.target.value = "";
  }

  function resetAddonImage() {
    revokeAddonImageObjectUrl();
    setAddonImagePreview("");
    setAddonImageName("");
    setAddonImageFile(null);
  }

  function closeAddonModal() {
    setModalOpen(false);
    setAddonFormCategory(categoryOptions[0] ?? "");
    setAddonNameAr("");
    setAddonPrice("");
    resetAddonImage();
  }

  function startEditingAddon(addon: AddonRow) {
    revokeEditAddonImageObjectUrl();
    setEditingAddon(addon);
  }

  function classificationIdByName(name: string) {
    if (categoryIds[name]) return categoryIds[name];

    const index = categoryOptions.findIndex((category) => category === name);
    return index >= 0 ? index + 1 : 1;
  }

  async function saveEditingAddon() {
    if (!editingAddon) {
      return;
    }

    const nextCategory = editingAddon.category.trim();

    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.productAdditions}${encodeURIComponent(editingAddon.id)}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            classification_id: classificationIdByName(nextCategory),
            name_ar: editingAddon.nameAr,
            name_en: editingAddon.nameAr,
            price: editingAddon.price.replace(/\s*EGP\s*$/i, ""),
            is_active: editingAddon.active !== false,
          }),
        },
      );
      const updatedAddon = addonRowFromApi(data as BackendRecord, 0);
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === editingAddon.id ? updatedAddon : row,
        ),
      );
      if (nextCategory) {
        setCategoryOptions((currentCategories) =>
          currentCategories.includes(nextCategory)
            ? currentCategories
            : [...currentCategories, nextCategory],
        );
      }
      editAddonImageObjectUrlRef.current = null;
      setEditingAddon(null);
      showSnackbar({ message: `تم حفظ تعديل ${editingAddon.nameAr} في الباك.` });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "تعذر حفظ تعديل الإضافة.",
        tone: "danger",
      });
    }
  }

  function cancelEditingAddon() {
    revokeEditAddonImageObjectUrl();
    setEditingAddon(null);
  }

  function deleteAddon(addon: AddonRow) {
    const addonIndex = rows.findIndex((row) => row.id === addon.id);
    setAddonDeleteTarget(null);
    queueUndoableDelete({
      message: `تم حذف ${addon.nameAr} من الباك.`,
      onDelete: () => {
        setRows((currentRows) => currentRows.filter((row) => row.id !== addon.id));
        setEditingAddon((currentAddon) =>
          currentAddon?.id === addon.id ? null : currentAddon,
        );
      },
      onUndo: () => {
        setRows((currentRows) => {
          if (currentRows.some((row) => row.id === addon.id)) return currentRows;
          const nextRows = [...currentRows];
          nextRows.splice(Math.max(0, addonIndex), 0, addon);
          return nextRows;
        });
      },
      onCommit: async () => {
        await sendAdminJson(
          apiFetch,
          `${adminApiPaths.productAdditions}${encodeURIComponent(addon.id)}/`,
          { method: "DELETE" },
        );
      },
      onCommitError: (error) => {
        showSnackbar({
          message:
            error instanceof Error ? error.message : "تعذر حذف الإضافة من الباك.",
          tone: "danger",
        });
      },
    });
  }

  async function toggleAddonActive(addon: AddonRow, nextActive: boolean) {
    const addonIndex = rows.findIndex((row) => row.id === addon.id);
    setRows((currentRows) =>
      currentRows.map((row) => row.id === addon.id ? { ...row, active: nextActive } : row),
    );

    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.productAdditions}${encodeURIComponent(addon.id)}/`,
        { method: "PATCH", body: JSON.stringify({ is_active: nextActive }) },
      );
      const updatedAddon = addonRowFromApi(data as BackendRecord, Math.max(0, addonIndex));
      setRows((currentRows) =>
        currentRows.map((row) => row.id === addon.id ? updatedAddon : row),
      );
      showSnackbar({
        message: nextActive ? `تم تفعيل الإضافة ${addon.nameAr}.` : `تم تعطيل الإضافة ${addon.nameAr}.`,
        tone: nextActive ? "success" : "danger",
      });
    } catch (error) {
      setRows((currentRows) =>
        currentRows.map((row) => row.id === addon.id ? addon : row),
      );
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تحديث حالة الإضافة.",
        tone: "danger",
      });
    }
  }

  async function createAddonCategory() {
    const nextCategory = newCategoryName.trim();

    if (!nextCategory) {
      return;
    }

    try {
      const data = await sendAdminJson(apiFetch, adminApiPaths.additionClassifications, {
        method: "POST",
        body: JSON.stringify({ name: nextCategory }),
      });
      const record = data as BackendRecord;
      const categoryName = String(record?.name ?? nextCategory).trim();
      setCategoryOptions((currentCategories) =>
        currentCategories.includes(categoryName)
          ? currentCategories
          : [...currentCategories, categoryName],
      );
      if (typeof record?.id === "string" || typeof record?.id === "number") {
        setAddonCategories((currentCategories) => [
          ...currentCategories,
          { id: String(record.id), name: categoryName },
        ]);
        setCategoryIds((currentIds) => ({
          ...currentIds,
          [categoryName]: record.id as string | number,
        }));
      }
      setSelectedAddonCategory(categoryName);
      setAddonFormCategory(categoryName);
      setNewCategoryName("");
      setCategoryModalOpen(false);
      showSnackbar({ message: `تمت إضافة تصنيف ${categoryName} في الباك.` });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "تعذر إنشاء تصنيف الإضافة في الباك.",
        tone: "danger",
      });
    }
  }

  async function saveCategoryName() {
    if (!editingCategory || !editingCategory.name.trim()) return;

    const currentCategory = addonCategories.find((category) => category.id === editingCategory.id);
    if (!currentCategory) return;
    const nextName = editingCategory.name.trim();

    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.additionClassifications}${encodeURIComponent(editingCategory.id)}/`,
        { method: "PATCH", body: JSON.stringify({ name: nextName }) },
      );
      const savedName = String((data as BackendRecord).name ?? nextName).trim();
      setAddonCategories((currentCategories) =>
        currentCategories.map((category) =>
          category.id === editingCategory.id ? { ...category, name: savedName } : category,
        ),
      );
      setCategoryOptions((currentCategories) =>
        currentCategories.map((name) => name === currentCategory.name ? savedName : name),
      );
      setCategoryIds((currentIds) => {
        const remaining = { ...currentIds };
        delete remaining[currentCategory.name];
        return { ...remaining, [savedName]: editingCategory.id };
      });
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.category === currentCategory.name ? { ...row, category: savedName } : row,
        ),
      );
      setSelectedAddonCategory((currentName) =>
        currentName === currentCategory.name ? savedName : currentName,
      );
      setAddonFormCategory((currentName) =>
        currentName === currentCategory.name ? savedName : currentName,
      );
      setEditingCategory(null);
      showSnackbar({ message: `تم تعديل اسم التصنيف إلى ${savedName}.` });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تعديل اسم التصنيف.",
        tone: "danger",
      });
    }
  }

  function deleteAddonCategory(category: AddonCategoryRecord) {
    const categoryIndex = addonCategories.findIndex((currentCategory) => currentCategory.id === category.id);
    setCategoryDeleteTarget(null);
    queueUndoableDelete({
      message: `تم حذف التصنيف ${category.name}.`,
      onDelete: () => {
        setAddonCategories((currentCategories) =>
          currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
        );
        setCategoryOptions((currentCategories) =>
          currentCategories.filter((name) => name !== category.name),
        );
        setCategoryIds((currentIds) => {
          const remaining = { ...currentIds };
          delete remaining[category.name];
          return remaining;
        });
      },
      onUndo: () => {
        setAddonCategories((currentCategories) => {
          if (currentCategories.some((currentCategory) => currentCategory.id === category.id)) {
            return currentCategories;
          }
          const nextCategories = [...currentCategories];
          nextCategories.splice(Math.max(0, categoryIndex), 0, category);
          return nextCategories;
        });
        setCategoryOptions((currentCategories) =>
          currentCategories.includes(category.name)
            ? currentCategories
            : [...currentCategories, category.name],
        );
        setCategoryIds((currentIds) => ({ ...currentIds, [category.name]: category.id }));
      },
      onCommit: async () => {
        await sendAdminJson(
          apiFetch,
          `${adminApiPaths.additionClassifications}${encodeURIComponent(category.id)}/`,
          { method: "DELETE" },
        );
      },
      onCommitError: (error) => {
        const message = error instanceof Error ? error.message : "تعذر حذف تصنيف الإضافة.";
        showSnackbar({ message: translateAddonCategoryDeleteError(message), tone: "danger" });
      },
    });
  }

  async function createAddon() {
    try {
      const formData = new FormData();
      formData.set(
        "classification_id",
        String(classificationIdByName(currentAddonFormCategory)),
      );
      formData.set("name_ar", addonNameAr.trim());
      formData.set("name_en", addonNameAr.trim());
      formData.set("price", addonPrice.trim());
      formData.set("is_active", "true");
      if (addonImageFile) formData.set("image", addonImageFile);

      const response = await apiFetch(adminApiPaths.productAdditions, {
        method: "POST",
        body: formData,
      });
      const data = await readApiData(response);
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, "تعذر إنشاء الإضافة في الباك."));
      }
      const createdAddon = addonRowFromApi(data as BackendRecord, rows.length);
      setRows((currentRows) => [createdAddon, ...currentRows]);
      closeAddonModal();
      showSnackbar({ message: "تم إنشاء الإضافة في الباك." });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "تعذر إنشاء الإضافة في الباك.",
        tone: "danger",
      });
    }
  }

  useEffect(() => revokeAddonImageObjectUrl, []);

  useEffect(() => revokeEditAddonImageObjectUrl, []);

  useEffect(() => {
    if (!modalOpen && !categoryModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [categoryModalOpen, modalOpen]);

  return (
    <div className="px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title="الإضافات"
          description="إدارة الإضافات والاختيارات الإضافية للمنيو"
          size="compact"
          className="w-full"
          actions={
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={() => void loadAddons(true)}
              disabled={addonsLoading}
            >
              <RefreshCw className={cn("size-4", addonsLoading && "animate-spin")} />
              تحديث
            </Button>
          }
        />
      </div>

      <Card className="mt-8">
        <div className="flex min-h-[77px] items-center justify-between border-b px-6">
          <div>
            <h2 className="font-semibold">كل الإضافات</h2>
            <p className="mt-2 text-sm text-muted-foreground">قائمة الإضافات</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setCategoriesOpen((open) => !open)}>
              <Tag className="size-4" />
              التصنيفات
            </Button>
            <Button variant="outline" onClick={() => setCategoryModalOpen(true)}>
              <Plus className="size-4" />
              إضافة تصنيف جديد
            </Button>
            <Button onClick={() => setModalOpen(true)} disabled={addonsLoading}>
              <Plus className="size-4" />
              إضافة جديدة
            </Button>
          </div>
        </div>
        <div className="p-6">
          {categoriesOpen ? (
            <div className="mb-6 overflow-hidden rounded-md border bg-muted/10">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h3 className="font-semibold">تصنيفات الإضافات</h3>
                  <p className="mt-1 text-xs text-muted-foreground">تعديل اسم التصنيف أو حذفه.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCategoryModalOpen(true)}>
                    <Plus className="size-4" />
                    إضافة تصنيف
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoriesOpen(false);
                      setEditingCategory(null);
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {addonCategories.length ? addonCategories.map((category) => {
                  const isEditing = editingCategory?.id === category.id;

                  return (
                    <div key={category.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                      {isEditing ? (
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Input
                            value={editingCategory.name}
                            className="h-9 max-w-sm"
                            autoFocus
                            onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })}
                          />
                          <Button type="button" size="sm" onClick={() => void saveCategoryName()}>حفظ</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingCategory(null)}>إلغاء</Button>
                        </div>
                      ) : (
                        <span className="font-semibold">{category.name}</span>
                      )}
                      {!isEditing ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <AddonRowIconButton label={`تعديل تصنيف ${category.name}`} onClick={() => setEditingCategory(category)}>
                            <Edit className="size-4" />
                          </AddonRowIconButton>
                          <AddonRowIconButton tone="danger" label={`حذف تصنيف ${category.name}`} onClick={() => setCategoryDeleteTarget(category)}>
                            <Trash2 className="size-4" />
                          </AddonRowIconButton>
                        </div>
                      ) : null}
                    </div>
                  );
                }) : (
                  <div className="p-5 text-center text-sm text-muted-foreground">لا توجد تصنيفات.</div>
                )}
              </div>
            </div>
          ) : null}
          <div className="grid w-full gap-4 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor="addon-search" className="text-sm leading-5">
                بحث
              </label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="addon-search"
                  value={addonSearch}
                  onChange={(event) => {
                    setAddonSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 ps-9"
                  placeholder="ابحث عن إضافة..."
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="text-sm leading-5">تصنيف الإضافة</div>
              <AppSelect
                value={selectedAddonCategory}
                onValueChange={(nextCategory) => {
                  setSelectedAddonCategory(nextCategory);
                  setCurrentPage(1);
                }}
                ariaLabel="فلتر تصنيف الإضافة"
                className="h-10"
                options={[
                  { value: "all", label: "كل التصنيفات" },
                  ...categoryOptions.map((category) => ({
                    value: category,
                    label: category,
                  })),
                ]}
              />
            </div>
          </div>
          <div className="mt-4">
            {visibleAddons.length ? (
              <div className="overflow-hidden rounded-md border transition-opacity duration-200">
                <DataTable
                  minWidth={885}
                  columnWidths={[80, 350, 210, 160, 235]}
                  rowHeight="tall"
                  headers={["", "الإضافة", "تصنيف الإضافة", "سعر الإضافة", ""]}
                  rows={pagedAddons.flatMap((addon, addonIndex) => {
                    const baseRow = [
                      <span key={`index-${addon.id}`} className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                        {pageStartIndex + addonIndex + 1}
                      </span>,
                      <AddonIdentity key={`identity-${addon.id}`} addon={addon} />,
                      <AddonInfoPill key={`category-${addon.id}`}>{addon.category}</AddonInfoPill>,
                      <AddonPriceCell key={`price-${addon.id}`} price={addon.price} />,
                      <div key={`actions-${addon.id}`} className="flex min-w-[220px] items-center justify-end gap-2">
                        <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold">
                          <span>{addon.active !== false ? "مفعلة" : "معطلة"}</span>
                          <Switch
                            checked={addon.active !== false}
                            onCheckedChange={(checked) => void toggleAddonActive(addon, checked)}
                            aria-label={`تفعيل الإضافة ${addon.nameAr}`}
                          />
                        </div>
                        <AddonRowIconButton label={`تعديل ${addon.nameAr}`} onClick={() => startEditingAddon(addon)}>
                          <Edit className="size-4" />
                        </AddonRowIconButton>
                        <AddonRowIconButton tone="danger" label={`حذف ${addon.nameAr}`} onClick={() => setAddonDeleteTarget(addon)}>
                          <Trash2 className="size-4" />
                        </AddonRowIconButton>
                      </div>,
                    ];

                    if (editingAddon?.id !== addon.id) {
                      return [baseRow];
                    }

                    return [
                      baseRow,
                      [
                        <div key={`edit-${addon.id}`} className="p-1">
                          <AddonEditPanel
                            draft={editingAddon}
                            categoryOptions={categoryOptions}
                            onChange={setEditingAddon}
                            onImageChange={handleEditAddonImageChange}
                            onCancel={cancelEditingAddon}
                            onSave={saveEditingAddon}
                          />
                        </div>,
                        null,
                        null,
                        null,
                        null,
                      ],
                    ];
                  })}
                  getRowProps={(_rowIndex, row) =>
                    row[1] === null ? { className: "bg-primary/5 hover:bg-primary/5" } : undefined
                  }
                  getCellProps={(_rowIndex, cellIndex, row) =>
                    row[1] === null && cellIndex === 0
                      ? { colSpan: 5, className: "p-2.5" }
                      : undefined
                  }
                />
              </div>
            ) : (
              <EmptyStateTable
                minWidth={860}
                headers={[
                  "",
                  "الإضافة",
                  "تصنيف الإضافة",
                  "سعر الإضافة",
                  "",
                ]}
              />
            )}
          </div>
          <Pagination
            text={`عرض ${
              pagedAddons.length
                ? `${pageStartIndex + 1}-${pageStartIndex + pagedAddons.length}`
                : "0-0"
            } من ${visibleAddons.length} نتائج`}
            pages={`${safeCurrentPage} / ${totalPages}`}
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

      {addonDeleteTarget ? (
        <ConfirmDeleteDialog
          title="حذف الإضافة"
          description={`هل تريد حذف الإضافة ${addonDeleteTarget.nameAr}؟`}
          busy={false}
          onCancel={() => setAddonDeleteTarget(null)}
          onConfirm={() => deleteAddon(addonDeleteTarget)}
        />
      ) : null}

      {categoryDeleteTarget ? (
        <ConfirmDeleteDialog
          title="حذف تصنيف الإضافة"
          description={`هل تريد حذف التصنيف ${categoryDeleteTarget.name}؟`}
          busy={false}
          onCancel={() => setCategoryDeleteTarget(null)}
          onConfirm={() => deleteAddonCategory(categoryDeleteTarget)}
        />
      ) : null}

      {categoryModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain bg-foreground/30 p-4 backdrop-blur-[1px]">
          <form
            className="w-full max-w-[420px] rounded-lg border bg-background p-5 shadow-lg"
            onSubmit={(event) => {
              event.preventDefault();
              void createAddonCategory();
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">إضافة تصنيف جديد</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  أضف تصنيف يظهر في فلتر الإضافات.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryModalOpen(false);
                  setNewCategoryName("");
                }}
                className="rounded-md border p-2 hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="اسم التصنيف">
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="مثال: إضافات ساخنة"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCategoryModalOpen(false);
                    setNewCategoryName("");
                  }}
                >
                  إلغاء
                </Button>
                <Button type="submit">إضافة التصنيف</Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {modalOpen && !categoryOptions.length ? (
        <MissingAddonCategoriesDialog
          onClose={closeAddonModal}
          onCreateCategory={() => {
            closeAddonModal();
            setCategoryModalOpen(true);
          }}
        />
      ) : null}

      {modalOpen && categoryOptions.length ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto overscroll-contain bg-foreground/30 p-4 backdrop-blur-[1px] sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-[620px] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">إضافة جديدة</h2>
                <p className="mt-1 text-sm text-muted-foreground">أنشئ إضافة للمنتجات.</p>
              </div>
              <button type="button" onClick={closeAddonModal} className="rounded-md border p-2 hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="صورة الإضافة">
                <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
                  <label className="group relative flex aspect-square min-h-[132px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                    <input
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAddonImageChange}
                      type="file"
                    />
                    {addonImagePreview ? (
                      <>
                        <DashboardImage
                          src={addonImagePreview}
                          placeholderType="addon"
                          alt="معاينة صورة الإضافة"
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
                        {addonImageName || "لم يتم اختيار صورة"}
                      </span>
                      {addonImagePreview ? (
                        <button
                          type="button"
                          onClick={resetAddonImage}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 px-3 py-1.5 font-semibold text-destructive transition hover:bg-destructive/10"
                        >
                          <X className="size-3.5" />
                          حذف الصورة
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Field>
              <div className="grid gap-4">
                <Field label="الاسم بالعربي">
                  <Input
                    value={addonNameAr}
                    onChange={(event) => setAddonNameAr(event.target.value)}
                    placeholder="جبنة زيادة"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="تصنيف الإضافة">
                  <AppSelect
                    value={currentAddonFormCategory}
                    onValueChange={setAddonFormCategory}
                    ariaLabel="اختيار تصنيف الإضافة"
                    className="h-9 bg-input"
                    options={categoryOptions.map((category) => ({
                      value: category,
                      label: category,
                    }))}
                  />
                </Field>
                <Field label="سعر الإضافة">
                  <Input
                    dir="ltr"
                    value={addonPrice}
                    onChange={(event) => setAddonPrice(event.target.value)}
                    placeholder="EGP 0.00"
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeAddonModal}>إلغاء</Button>
                <Button
                  onClick={() => void createAddon()}
                  disabled={!addonNameAr.trim() || !addonPrice.trim()}
                >
                  إنشاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
