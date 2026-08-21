"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import {
  createAddon as createAddonRequest,
  createAddonCategory as createAddonCategoryRequest,
  loadAddonCatalog,
  removeAddon,
  removeAddonCategory,
  setAddonActive,
  updateAddon,
  updateAddonCategory,
} from "./api";
import {
  addonMatchesSearch,
  classificationIdByName,
  translateAddonCategoryDeleteError,
  validateAddonDraft,
} from "./domain";
import type { AddonCategoryRecord, AddonRow } from "./types";

const dashboardListPageSize = 10;

export function useAddonsPage() {
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
  const [categoryIds, setCategoryIds] = useState<Record<string, string | number>>({});
  const [addonCategories, setAddonCategories] = useState<AddonCategoryRecord[]>([]);
  const [editingAddon, setEditingAddon] = useState<AddonRow | null>(null);
  const [addonDeleteTarget, setAddonDeleteTarget] = useState<AddonRow | null>(null);
  const [editingCategory, setEditingCategory] = useState<AddonCategoryRecord | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] =
    useState<AddonCategoryRecord | null>(null);
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
          (selectedAddonCategory === "all" || addon.category === selectedAddonCategory),
      ),
    [addonSearch, rows, selectedAddonCategory],
  );
  const totalPages = Math.max(1, Math.ceil(visibleAddons.length / dashboardListPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * dashboardListPageSize;
  const pagedAddons = visibleAddons.slice(
    pageStartIndex,
    pageStartIndex + dashboardListPageSize,
  );
  const currentAddonFormCategory = addonFormCategory || categoryOptions[0] || "";

  const loadAddons = useCallback(
    async (showFailure = false) => {
      setAddonsLoading(true);
      try {
        const catalog = await loadAddonCatalog(apiFetch);
        setRows(catalog.addons);
        if (catalog.categories && catalog.categoryIds) {
          const options = catalog.categories.map((category) => category.name);
          setAddonCategories(catalog.categories);
          setCategoryOptions(options);
          setCategoryIds(catalog.categoryIds);
          setAddonFormCategory(options[0] ?? "");
          setSelectedAddonCategory((current) =>
            current === "all" || options.includes(current) ? current : "all",
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
    },
    [apiFetch, showSnackbar],
  );

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
    if (!file) return;
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
    if (!file || !editingAddon) return;
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

  function categoryId(name: string) {
    return classificationIdByName(name, categoryIds, categoryOptions);
  }

  async function saveEditingAddon() {
    if (!editingAddon) return;
    const nextCategory = editingAddon.category.trim();
    try {
      const updatedAddon = await updateAddon(apiFetch, editingAddon, categoryId(nextCategory));
      setRows((current) =>
        current.map((row) => (row.id === editingAddon.id ? updatedAddon : row)),
      );
      if (nextCategory) {
        setCategoryOptions((current) =>
          current.includes(nextCategory) ? current : [...current, nextCategory],
        );
      }
      editAddonImageObjectUrlRef.current = null;
      setEditingAddon(null);
      showSnackbar({ message: `تم حفظ تعديل ${editingAddon.nameAr} في الباك.` });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر حفظ تعديل الإضافة.",
        tone: "danger",
      });
    }
  }

  function deleteAddon(addon: AddonRow) {
    const addonIndex = rows.findIndex((row) => row.id === addon.id);
    setAddonDeleteTarget(null);
    queueUndoableDelete({
      message: `تم حذف ${addon.nameAr} من الباك.`,
      onDelete: () => {
        setRows((current) => current.filter((row) => row.id !== addon.id));
        setEditingAddon((current) => (current?.id === addon.id ? null : current));
      },
      onUndo: () => {
        setRows((current) => {
          if (current.some((row) => row.id === addon.id)) return current;
          const next = [...current];
          next.splice(Math.max(0, addonIndex), 0, addon);
          return next;
        });
      },
      onCommit: () => removeAddon(apiFetch, addon.id),
      onCommitError: (error) =>
        showSnackbar({
          message: error instanceof Error ? error.message : "تعذر حذف الإضافة من الباك.",
          tone: "danger",
        }),
    });
  }

  async function toggleAddonActive(addon: AddonRow, active: boolean) {
    setRows((current) =>
      current.map((row) => (row.id === addon.id ? { ...row, active } : row)),
    );
    try {
      const updated = await setAddonActive(apiFetch, addon.id, active);
      setRows((current) => current.map((row) => (row.id === addon.id ? updated : row)));
      showSnackbar({
        message: active ? `تم تفعيل الإضافة ${addon.nameAr}.` : `تم تعطيل الإضافة ${addon.nameAr}.`,
        tone: active ? "success" : "danger",
      });
    } catch (error) {
      setRows((current) => current.map((row) => (row.id === addon.id ? addon : row)));
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تحديث حالة الإضافة.",
        tone: "danger",
      });
    }
  }

  async function createCategory() {
    const nextName = newCategoryName.trim();
    if (!nextName) return;
    try {
      const category = await createAddonCategoryRequest(apiFetch, nextName);
      const savedName = category?.name ?? nextName;
      setCategoryOptions((current) =>
        current.includes(savedName) ? current : [...current, savedName],
      );
      if (category) {
        setAddonCategories((current) => [...current, category]);
        setCategoryIds((current) => ({ ...current, [savedName]: category.id }));
      }
      setSelectedAddonCategory(savedName);
      setAddonFormCategory(savedName);
      setNewCategoryName("");
      setCategoryModalOpen(false);
      showSnackbar({ message: `تمت إضافة تصنيف ${savedName} في الباك.` });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر إنشاء تصنيف الإضافة في الباك.",
        tone: "danger",
      });
    }
  }

  async function saveCategoryName() {
    if (!editingCategory?.name.trim()) return;
    const currentCategory = addonCategories.find((item) => item.id === editingCategory.id);
    if (!currentCategory) return;
    try {
      const saved = await updateAddonCategory(
        apiFetch,
        editingCategory.id,
        editingCategory.name,
      );
      const savedName = saved?.name ?? editingCategory.name.trim();
      setAddonCategories((current) =>
        current.map((category) =>
          category.id === editingCategory.id ? { ...category, name: savedName } : category,
        ),
      );
      setCategoryOptions((current) =>
        current.map((name) => (name === currentCategory.name ? savedName : name)),
      );
      setCategoryIds((current) => {
        const next = { ...current };
        delete next[currentCategory.name];
        return { ...next, [savedName]: editingCategory.id };
      });
      setRows((current) =>
        current.map((row) =>
          row.category === currentCategory.name ? { ...row, category: savedName } : row,
        ),
      );
      setSelectedAddonCategory((name) => (name === currentCategory.name ? savedName : name));
      setAddonFormCategory((name) => (name === currentCategory.name ? savedName : name));
      setEditingCategory(null);
      showSnackbar({ message: `تم تعديل اسم التصنيف إلى ${savedName}.` });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تعديل اسم التصنيف.",
        tone: "danger",
      });
    }
  }

  function deleteCategory(category: AddonCategoryRecord) {
    const categoryIndex = addonCategories.findIndex((item) => item.id === category.id);
    setCategoryDeleteTarget(null);
    queueUndoableDelete({
      message: `تم حذف التصنيف ${category.name}.`,
      onDelete: () => {
        setAddonCategories((current) => current.filter((item) => item.id !== category.id));
        setCategoryOptions((current) => current.filter((name) => name !== category.name));
        setCategoryIds((current) => {
          const next = { ...current };
          delete next[category.name];
          return next;
        });
      },
      onUndo: () => {
        setAddonCategories((current) => {
          if (current.some((item) => item.id === category.id)) return current;
          const next = [...current];
          next.splice(Math.max(0, categoryIndex), 0, category);
          return next;
        });
        setCategoryOptions((current) =>
          current.includes(category.name) ? current : [...current, category.name],
        );
        setCategoryIds((current) => ({ ...current, [category.name]: category.id }));
      },
      onCommit: () => removeAddonCategory(apiFetch, category.id),
      onCommitError: (error) =>
        showSnackbar({
          message: translateAddonCategoryDeleteError(
            error instanceof Error ? error.message : "تعذر حذف تصنيف الإضافة.",
          ),
          tone: "danger",
        }),
    });
  }

  async function createAddon() {
    const validationError = validateAddonDraft({
      nameAr: addonNameAr,
      category: currentAddonFormCategory,
      price: addonPrice,
    });
    if (validationError) {
      showSnackbar({ message: validationError, tone: "danger" });
      return;
    }
    try {
      const created = await createAddonRequest(apiFetch, {
        classificationId: categoryId(currentAddonFormCategory),
        nameAr: addonNameAr,
        price: addonPrice,
        imageFile: addonImageFile,
      });
      setRows((current) => [created, ...current]);
      closeAddonModal();
      showSnackbar({ message: "تم إنشاء الإضافة في الباك." });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر إنشاء الإضافة في الباك.",
        tone: "danger",
      });
    }
  }

  useEffect(() => revokeAddonImageObjectUrl, []);
  useEffect(() => revokeEditAddonImageObjectUrl, []);
  useEffect(() => {
    if (!modalOpen && !categoryModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [categoryModalOpen, modalOpen]);

  return {
    addonCategories,
    addonDeleteTarget,
    addonImageName,
    addonImagePreview,
    addonNameAr,
    addonPrice,
    addonSearch,
    addonsLoading,
    cancelEditingAddon: () => {
      revokeEditAddonImageObjectUrl();
      setEditingAddon(null);
    },
    categoriesOpen,
    categoryDeleteTarget,
    categoryModalOpen,
    categoryOptions,
    closeAddonModal,
    createAddon,
    createCategory,
    currentAddonFormCategory,
    currentPage: safeCurrentPage,
    deleteAddon,
    deleteCategory,
    editingAddon,
    editingCategory,
    handleAddonImageChange,
    handleEditAddonImageChange,
    loadAddons,
    modalOpen,
    newCategoryName,
    nextPage: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
    pagedAddons,
    pageStartIndex,
    previousPage: () => setCurrentPage((page) => Math.max(1, page - 1)),
    resetAddonImage,
    saveCategoryName,
    saveEditingAddon,
    selectedAddonCategory,
    setAddonDeleteTarget,
    setAddonFormCategory,
    setAddonNameAr,
    setAddonPrice,
    setAddonSearch: (search: string) => {
      setAddonSearch(search);
      setCurrentPage(1);
    },
    setCategoriesOpen,
    setCategoryDeleteTarget,
    setCategoryModalOpen,
    setEditingAddon,
    setEditingCategory,
    setModalOpen,
    setNewCategoryName,
    setSelectedAddonCategory: (category: string) => {
      setSelectedAddonCategory(category);
      setCurrentPage(1);
    },
    startEditingAddon: (addon: AddonRow) => {
      revokeEditAddonImageObjectUrl();
      setEditingAddon(addon);
    },
    toggleAddonActive,
    totalPages,
    visibleAddons,
  };
}

export type AddonsPageController = ReturnType<typeof useAddonsPage>;
