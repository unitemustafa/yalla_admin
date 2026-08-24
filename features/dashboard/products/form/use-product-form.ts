"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../../snackbar";
import type { StoreSubcategory } from "../../store-subcategories-api";
import { productAdditionsPath } from "../../addons/api";
import {
  AdminApiError,
  adminApiPaths,
  apiList,
  readApiData,
} from "../../admin-api";
import {
  createProduct,
  getProduct,
  sendProductNotification,
  updateProduct,
} from "../api";
import type { NormalizedProduct } from "../types";
import {
  additionFromRecord,
  buildProductPayload,
  formatApiErrors,
  normalizeMarket,
  productMarketChoice,
  validateProductForm,
} from "./domain";
import type { CatalogMarket, ProductAdditionChoice } from "./types";
import { useProductImages } from "./use-product-images";
import { useProductVariants } from "./use-product-variants";

export function useProductForm() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ itemId?: string | string[] }>();
  const rawItemId = params?.itemId;
  const editItemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId;
  const duplicateId = searchParams.get("duplicate");
  const isEditing = Boolean(editItemId);
  const images = useProductImages(editItemId);
  const variants = useProductVariants();
  const hydrateImages = images.hydrateImages;
  const hydrateVariants = variants.hydrateVariants;

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(Boolean(editItemId || duplicateId));
  const [catalogError, setCatalogError] = useState("");
  const [productError, setProductError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [markets, setMarkets] = useState<CatalogMarket[]>([]);
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [marketSubcategoriesOpen, setMarketSubcategoriesOpen] = useState(false);
  const [marketQuery, setMarketQuery] = useState("");
  const [marketTab, setMarketTab] = useState<"general" | "service_city">("general");
  const [additions, setAdditions] = useState<ProductAdditionChoice[]>([]);
  const [additionPickerOpen, setAdditionPickerOpen] = useState(false);
  const [additionClassification, setAdditionClassification] = useState("all");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [selectedAdditionIds, setSelectedAdditionIds] = useState<number[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [sendPushNotification, setSendPushNotification] = useState(false);
  const [discount, setDiscount] = useState("0.00");
  const [previewSource, setPreviewSource] = useState<"api" | "draft">("draft");
  const [legacyMissingPrice, setLegacyMissingPrice] = useState(false);

  const selectedMarket = markets.find((market) => market.id === selectedMarketId) ?? null;
  const currentProductSubcategory = useMemo(() => {
    if (!selectedSubcategoryId) return null;
    for (const market of markets) {
      const item = market.subcategories.find(
        (candidate) => String(candidate.id) === selectedSubcategoryId,
      );
      if (item) return item;
    }
    return null;
  }, [markets, selectedSubcategoryId]);
  const availableSubcategories = useMemo(() => {
    const items = (selectedMarket?.subcategories ?? []).filter((item) => item.is_active);
    if (
      currentProductSubcategory &&
      !currentProductSubcategory.is_active &&
      !items.some((item) => item.id === currentProductSubcategory.id)
    ) {
      return [...items, currentProductSubcategory];
    }
    return items;
  }, [currentProductSubcategory, selectedMarket]);
  const additionClassifications = useMemo(
    () => Array.from(new Set(additions.map((item) => item.classification || "غير مصنف"))),
    [additions],
  );
  const filteredAdditions = useMemo(
    () =>
      additionClassification === "all"
        ? additions
        : additions.filter((item) => item.classification === additionClassification),
    [additionClassification, additions],
  );
  const selectedAdditions = useMemo(() => {
    const selectedIds = new Set(selectedAdditionIds.map(String));
    return additions.filter((addition) => selectedIds.has(addition.id));
  }, [additions, selectedAdditionIds]);
  const filteredMarkets = useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    return markets.filter((market) => {
      if (market.status !== "active" && market.id !== selectedMarketId) return false;
      if (marketTab === "general" && market.scope !== "general") return false;
      if (marketTab === "service_city" && market.serviceCities.length === 0) return false;
      if (!query) return true;
      return `${market.name} ${market.branch} ${market.serviceCities.join(" ")}`
        .toLowerCase()
        .includes(query);
    });
  }, [marketQuery, marketTab, markets, selectedMarketId]);

  useEffect(() => {
    if (!marketModalOpen) return;
    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [marketModalOpen]);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        const [marketsResponse, additionsResponse] = await Promise.all([
          apiFetch(adminApiPaths.markets),
          apiFetch(productAdditionsPath),
        ]);
        const [marketsData, additionsData] = await Promise.all([
          readApiData(marketsResponse),
          readApiData(additionsResponse),
        ]);
        if (!marketsResponse.ok || !additionsResponse.ok) {
          throw new Error("تعذر تحميل بيانات المنتج");
        }
        if (!active) return;
        const nextMarkets = apiList(marketsData).map(normalizeMarket);
        setMarkets(nextMarkets);
        setAdditions(apiList(additionsData).map(additionFromRecord));
        setSelectedMarketId((current) => current || nextMarkets[0]?.id || "");
      } catch (error) {
        if (active) {
          setCatalogError(error instanceof Error ? error.message : "تعذر تحميل بيانات المنتج");
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    void loadCatalog();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const hydrateProduct = useCallback(
    (product: NormalizedProduct, clone: boolean) => {
      const marketChoice = productMarketChoice(product);
      if (marketChoice) {
        setMarkets((current) =>
          current.some((market) => market.id === marketChoice.id)
            ? current
            : [...current, marketChoice],
        );
        setSelectedMarketId(marketChoice.id);
      }
      setSelectedSubcategoryId(
        product.subcategoryId === null ? "" : String(product.subcategoryId),
      );
      setName(clone ? `${product.name} (نسخة)` : product.name);
      setDescription(product.description);
      setDiscount(String(product.discount ?? "0.00"));
      setIsAvailable(product.isAvailable);
      setIsPopular(product.isPopular);
      setSendPushNotification(false);
      setSelectedAdditionIds(product.additions);
      hydrateVariants(product, clone);
      hydrateImages(product, clone);
      setPreviewSource(clone ? "draft" : "api");
      setLegacyMissingPrice(!clone && product.isAvailable && product.variants.length === 0);
      setSaveError("");
    },
    [hydrateImages, hydrateVariants],
  );

  useEffect(() => {
    const sourceId = editItemId || duplicateId;
    if (!sourceId) return;
    const productId = sourceId;
    let active = true;
    async function loadProduct() {
      setProductLoading(true);
      setProductError("");
      try {
        const product = await getProduct(apiFetch, productId);
        if (active) hydrateProduct(product, !isEditing);
      } catch (error) {
        if (active) {
          setProductError(error instanceof Error ? error.message : "تعذر تحميل بيانات المنتج");
        }
      } finally {
        if (active) setProductLoading(false);
      }
    }
    void loadProduct();
    return () => {
      active = false;
    };
  }, [apiFetch, duplicateId, editItemId, hydrateProduct, isEditing]);

  function toggleAddition(additionId: string | number) {
    const id = Number(additionId);
    if (!Number.isFinite(id)) return;
    setSelectedAdditionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || images.imageActionBusy) return;
    const values = {
      name,
      description,
      selectedMarketId,
      selectedSubcategoryId,
      selectedAdditionIds,
      theme: variants.theme,
      isAvailable,
      isPopular,
      discount,
      attributes: variants.attributes,
      variantRows: variants.variantRows,
    };
    const validationError = validateProductForm(values);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    const payload = buildProductPayload(values, {
      includeVariants: !isEditing || variants.variantsDirty,
    });
    setSaving(true);
    setSaveError("");
    try {
      if (isEditing && editItemId) {
        await updateProduct(
          apiFetch,
          editItemId,
          payload,
          images.files,
          images.primaryImageIndex,
        );
        showSnackbar({ message: "تم تحديث المنتج بنجاح.", tone: "success" });
      } else {
        const savedProduct = await createProduct(
          apiFetch,
          payload,
          images.files,
          images.primaryImageIndex,
        );
        if (sendPushNotification) {
          try {
            const dispatch = await sendProductNotification(
              apiFetch,
              savedProduct.id,
              crypto.randomUUID(),
            );
            showSnackbar({
              message: dispatch.suppressedByMarketNotification
                ? dispatch.notificationCount > 0
                  ? `تم إنشاء المنتج وإرسال إشعار المحل${dispatch.marketName ? ` «${dispatch.marketName}»` : ""} لـ ${dispatch.notificationCount} عميل بدل إشعار المنتج.`
                  : "تم إنشاء المنتج، وتم اعتماد إشعار المحل بدل إشعار المنتج، ومفيش عملاء مؤهلين حاليًا."
                : dispatch.notificationCount > 0
                  ? `تم إنشاء المنتج وإرسال الإشعار لـ ${dispatch.notificationCount} عميل.`
                  : "تم إنشاء المنتج، ومفيش عملاء مؤهلين للإشعار حاليًا.",
              tone: "success",
            });
          } catch {
            showSnackbar({
              message: "تم إنشاء المنتج، بس حصلت مشكلة ومقدرناش نبعت الإشعار.",
              tone: "danger",
            });
          }
        } else {
          showSnackbar({ message: "تم إنشاء المنتج بنجاح.", tone: "success" });
        }
      }
      router.push("/items");
    } catch (error) {
      if (error instanceof AdminApiError) {
        const messages = formatApiErrors(error.data);
        setSaveError(messages.length ? messages.join("\n") : error.message);
      } else {
        setSaveError(error instanceof Error ? error.message : "تعذر حفظ المنتج");
      }
    } finally {
      setSaving(false);
    }
  }

  function selectMarket(market: CatalogMarket) {
    if (market.id !== selectedMarketId) setSelectedSubcategoryId("");
    setSelectedMarketId(market.id);
    setMarketModalOpen(false);
  }

  function saveSelectedMarketSubcategories(items: StoreSubcategory[]) {
    const marketId = selectedMarket?.id;
    if (!marketId) return;
    setMarkets((current) => current.map((market) =>
      market.id === marketId ? { ...market, subcategories: items } : market,
    ));
    setSelectedSubcategoryId((current) =>
      items.some((item) => String(item.id) === current)
        ? current
        : items[0] ? String(items[0].id) : "",
    );
    setMarketSubcategoriesOpen(false);
    setSaveError("");
    showSnackbar({ message: "تم حفظ أقسام المحل.", tone: "success" });
  }

  const pageTitle = isEditing ? "تعديل منتج" : "إضافة منتج";
  const pageDescription = isEditing
    ? "عدّل بيانات المنتج ومتغيراته من العقد الجديد."
    : duplicateId
      ? "أنشئ نسخة جديدة من منتج موجود."
      : "أنشئ منتجًا تابعًا لمحل مع ثيم وخصائص خاصة به.";

  return {
    additionClassification,
    additionClassifications,
    additionPickerOpen,
    additions,
    availableSubcategories,
    catalogError,
    catalogLoading,
    description,
    discount,
    duplicateId,
    editItemId,
    filteredAdditions,
    filteredMarkets,
    images,
    isAvailable,
    isEditing,
    isPopular,
    legacyMissingPrice,
    marketModalOpen,
    marketSubcategoriesOpen,
    marketQuery,
    markets,
    marketTab,
    markDraft: () => setPreviewSource("draft"),
    name,
    pageDescription,
    pageTitle,
    previewSource,
    productError,
    productLoading,
    saveError,
    saveProduct,
    saveSelectedMarketSubcategories,
    saving,
    selectMarket,
    selectedAdditionIds,
    selectedAdditions,
    selectedMarket,
    selectedMarketId,
    selectedSubcategoryId,
    sendPushNotification,
    setAdditionClassification,
    setAdditionPickerOpen,
    setDescription,
    setDiscount,
    setIsAvailable,
    setIsPopular,
    setMarketModalOpen,
    setMarketSubcategoriesOpen,
    setMarketQuery,
    setMarketTab,
    setName,
    setSelectedSubcategoryId,
    setSendPushNotification,
    toggleAddition,
    variants,
  };
}

export type ProductFormController = ReturnType<typeof useProductForm>;
