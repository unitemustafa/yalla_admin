"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Layers3,
  Plus,
  Save,
  Store,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  AdminApiError,
  adminApiPaths,
  apiList,
  createProduct,
  getProduct,
  normalizeIds,
  readApiData,
  updateProduct,
  type BackendRecord,
  type NormalizedProduct,
  type ProductAttributeValuePayload,
  type ProductVariantPayload,
  type ProductWritePayload,
} from "../admin-api";
import { DashboardImage } from "../dashboard-image";
import { useSnackbar } from "../snackbar";
import { AppSelect, Button, CurrencyText, Input, Switch } from "../primitives";
import { cn } from "@/lib/utils";

type CatalogMarket = {
  id: string;
  name: string;
  branch: string;
  status: string;
  scope: string;
};

type CatalogCategory = {
  id: string;
  name: string;
  description: string;
};

type CatalogAttribute = {
  id: number;
  categoryId: number | null;
  name: string;
  options: CatalogOption[];
};

type CatalogOption = {
  id: number;
  attributeId: number;
  value: string;
};

type ProductAdditionChoice = {
  id: string;
  name: string;
  price: string;
};

type VariantDraft = {
  tempId: string;
  id?: number;
  price: string;
  sku: string;
  attributeValues: ProductAttributeValuePayload[];
};

const emptyVariant = (): VariantDraft => ({
  tempId: `variant-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  price: "",
  sku: "",
  attributeValues: [],
});

function asRecord(value: unknown): BackendRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as BackendRecord)
    : null;
}

function textValue(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numericId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatApiErrors(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) return value.flatMap(formatApiErrors);
  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record).flatMap(([key, entry]) =>
    formatApiErrors(entry).map((message) =>
      key === "detail" ? message : `${key}: ${message}`,
    ),
  );
}

function normalizeMarket(record: BackendRecord): CatalogMarket {
  return {
    id: textValue(record.id),
    name: textValue(record.name, `سوق #${textValue(record.id)}`),
    branch: textValue(record.branch),
    status: textValue(record.status, "active"),
    scope: textValue(record.scope),
  };
}

function normalizeCategory(record: BackendRecord): CatalogCategory {
  const classification = asRecord(record.classification);

  return {
    id: textValue(record.id),
    name: textValue(record.name, `فئة #${textValue(record.id)}`),
    description: textValue(classification?.name),
  };
}

function optionFromRecord(record: BackendRecord): CatalogOption | null {
  const attribute = asRecord(record.attribute);
  const id = numericId(record.id);
  const attributeId = numericId(record.attribute_id ?? attribute?.id);

  if (id === null || attributeId === null) return null;

  return {
    id,
    attributeId,
    value: textValue(record.value, `اختيار #${id}`),
  };
}

function attributeFromRecord(record: BackendRecord): CatalogAttribute | null {
  const id = numericId(record.id);
  const category = asRecord(record.category);

  if (id === null) return null;

  return {
    id,
    categoryId: numericId(record.category_id ?? category?.id),
    name: textValue(record.name, `خاصية #${id}`),
    options: Array.isArray(record.options)
      ? record.options
          .map((option) => optionFromRecord({ ...(asRecord(option) ?? {}), attribute_id: id }))
          .filter((option): option is CatalogOption => Boolean(option))
      : [],
  };
}

function additionFromRecord(record: BackendRecord): ProductAdditionChoice {
  const nameAr = textValue(record.name_ar);
  const name = nameAr || textValue(record.name, textValue(record.name_en, `إضافة #${textValue(record.id)}`));

  return {
    id: textValue(record.id),
    name,
    price: textValue(record.price),
  };
}

function variantAttributeIds(value: unknown): ProductAttributeValuePayload | null {
  const record = asRecord(value);
  if (!record) return null;
  const attribute = asRecord(record.attribute);
  const option = asRecord(record.option);
  const attributeId = numericId(record.attribute_id ?? attribute?.id);
  const optionId = numericId(record.option_id ?? option?.id);
  const id = numericId(record.id);

  if (attributeId === null || optionId === null) return null;

  return {
    ...(id === null ? {} : { id }),
    attribute_id: attributeId,
    option_id: optionId,
  };
}

function variantDraftFromProductVariant(value: unknown): VariantDraft {
  const record = asRecord(value) ?? {};
  const id = numericId(record.id);

  return {
    tempId: `variant-${textValue(record.id, String(Date.now()))}-${Math.round(Math.random() * 10000)}`,
    ...(id === null ? {} : { id }),
    price: textValue(record.price),
    sku: textValue(record.sku),
    attributeValues: Array.isArray(record.attribute_values)
      ? record.attribute_values
          .map(variantAttributeIds)
          .filter((item): item is ProductAttributeValuePayload => Boolean(item))
      : [],
  };
}

function selectedOptionId(
  variant: VariantDraft,
  attributeId: number,
) {
  return variant.attributeValues.find(
    (value) => value.attribute_id === attributeId,
  )?.option_id;
}

function mergeAttributeValue(
  variant: VariantDraft,
  attributeId: number,
  optionValue: string,
): VariantDraft {
  const optionId = numericId(optionValue);
  const nextValues = variant.attributeValues.filter(
    (value) => value.attribute_id !== attributeId,
  );

  if (optionId !== null) {
    nextValues.push({ attribute_id: attributeId, option_id: optionId });
  }

  return { ...variant, attributeValues: nextValues };
}

function uniqueAttributeValues(variants: VariantDraft[]) {
  const byKey = new Map<string, ProductAttributeValuePayload>();
  variants.forEach((variant) => {
    variant.attributeValues.forEach((value) => {
      byKey.set(`${value.attribute_id}:${value.option_id}`, value);
    });
  });
  return Array.from(byKey.values());
}

function validPrice(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  return Number.isFinite(Number(trimmed));
}

function variantPayload(variant: VariantDraft, includeId: boolean): ProductVariantPayload {
  return {
    ...(includeId && variant.id !== undefined ? { id: variant.id } : {}),
    price: Number(variant.price).toFixed(2),
    ...(variant.sku.trim() ? { sku: variant.sku.trim() } : {}),
    attribute_values: variant.attributeValues,
  };
}

function productMarketChoice(product: NormalizedProduct): CatalogMarket | null {
  if (product.marketId === null) return null;

  return {
    id: String(product.marketId),
    name: textValue(product.market?.name, `سوق #${product.marketId}`),
    branch: textValue(product.market?.branch),
    status: textValue(product.market?.status, "inactive"),
    scope: textValue(product.market?.scope),
  };
}

function productCategoryChoice(product: NormalizedProduct): CatalogCategory | null {
  if (product.categoryId === null) return null;
  const classification = asRecord(product.category?.classification);

  return {
    id: String(product.categoryId),
    name: textValue(product.category?.name, `فئة #${product.categoryId}`),
    description: textValue(classification?.name),
  };
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="border-b bg-muted/20 px-4 py-3 text-sm font-semibold">
        {title}
      </div>
      <div className="grid gap-4 p-4">{children}</div>
    </section>
  );
}

function LabelText({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export function ProductFormPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ itemId?: string | string[] }>();
  const rawItemId = params?.itemId;
  const editItemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId;
  const duplicateId = searchParams.get("duplicate");
  const isEditing = Boolean(editItemId);
  const imageUrlRef = useRef<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(Boolean(editItemId || duplicateId));
  const [catalogError, setCatalogError] = useState("");
  const [productError, setProductError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [markets, setMarkets] = useState<CatalogMarket[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [attributes, setAttributes] = useState<CatalogAttribute[]>([]);
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [additions, setAdditions] = useState<ProductAdditionChoice[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedAdditionIds, setSelectedAdditionIds] = useState<number[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [discount, setDiscount] = useState("0.00");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(() => [emptyVariant()]);
  const [variantsDirty, setVariantsDirty] = useState(false);

  const activeAttributes = useMemo(() => {
    const categoryId = numericId(selectedCategoryId);
    if (categoryId === null) return [];

    return attributes
      .filter((attribute) => attribute.categoryId === categoryId)
      .map((attribute) => {
        const mergedOptions = [
          ...attribute.options,
          ...options.filter((option) => option.attributeId === attribute.id),
        ];
        const uniqueOptions = Array.from(
          new Map(mergedOptions.map((option) => [option.id, option])).values(),
        );

        return { ...attribute, options: uniqueOptions };
      });
  }, [attributes, options, selectedCategoryId]);

  const marketOptions = useMemo(() => {
    return markets
      .filter((market) => market.status === "active" || market.id === selectedMarketId)
      .map((market) => ({
        value: market.id,
        label: market.branch ? `${market.name} - ${market.branch}` : market.name,
        disabled: market.status !== "active" && market.id === selectedMarketId,
      }));
  }, [markets, selectedMarketId]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.description
          ? `${category.name} - ${category.description}`
          : category.name,
      })),
    [categories],
  );

  useEffect(
    () => () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const [
          marketsResponse,
          categoriesResponse,
          attributesResponse,
          optionsResponse,
          additionsResponse,
        ] = await Promise.all([
          apiFetch(adminApiPaths.markets),
          apiFetch(adminApiPaths.productCategories),
          apiFetch(adminApiPaths.categoryAttributes),
          apiFetch(adminApiPaths.categoryOptions),
          apiFetch(adminApiPaths.productAdditions),
        ]);
        const [
          marketsData,
          categoriesData,
          attributesData,
          optionsData,
          additionsData,
        ] = await Promise.all([
          readApiData(marketsResponse),
          readApiData(categoriesResponse),
          readApiData(attributesResponse),
          readApiData(optionsResponse),
          readApiData(additionsResponse),
        ]);

        if (
          !marketsResponse.ok ||
          !categoriesResponse.ok ||
          !attributesResponse.ok ||
          !optionsResponse.ok ||
          !additionsResponse.ok
        ) {
          throw new Error("تعذر تحميل بيانات المنتج");
        }

        if (!active) return;

        const nextMarkets = apiList(marketsData).map(normalizeMarket);
        const nextCategories = apiList(categoriesData).map(normalizeCategory);
        setMarkets(nextMarkets);
        setCategories(nextCategories);
        setAttributes(
          apiList(attributesData)
            .map(attributeFromRecord)
            .filter((attribute): attribute is CatalogAttribute => Boolean(attribute)),
        );
        setOptions(
          apiList(optionsData)
            .map(optionFromRecord)
            .filter((option): option is CatalogOption => Boolean(option)),
        );
        setAdditions(apiList(additionsData).map(additionFromRecord));
        setSelectedMarketId((current) => current || nextMarkets[0]?.id || "");
        setSelectedCategoryId((current) => current || nextCategories[0]?.id || "");
      } catch (error) {
        if (active) {
          setCatalogError(
            error instanceof Error ? error.message : "تعذر تحميل بيانات المنتج",
          );
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

  const hydrateProduct = useCallback((product: NormalizedProduct, options: { clone: boolean }) => {
    const marketChoice = productMarketChoice(product);
    const categoryChoice = productCategoryChoice(product);

    if (marketChoice) {
      setMarkets((current) =>
        current.some((market) => market.id === marketChoice.id)
          ? current
          : [...current, marketChoice],
      );
      setSelectedMarketId(marketChoice.id);
    }
    if (categoryChoice) {
      setCategories((current) =>
        current.some((category) => category.id === categoryChoice.id)
          ? current
          : [...current, categoryChoice],
      );
      setSelectedCategoryId(categoryChoice.id);
    }

    setName(options.clone ? `${product.name} (نسخة)` : product.name);
    setDescription(product.description);
    setDiscount(String(product.discount ?? "0.00"));
    setIsAvailable(product.isAvailable);
    setSelectedAdditionIds(normalizeIds(product.additions));
    setImagePreview(product.image);
    setImageFile(null);
    setVariantRows(
      product.variants.length
        ? product.variants.map((variant) => {
            const draft = variantDraftFromProductVariant(variant);
            return options.clone ? { ...draft, id: undefined } : draft;
          })
        : [emptyVariant()],
    );
    setVariantsDirty(false);
    setSaveError("");
  }, []);

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
        if (!active) return;

        hydrateProduct(product, { clone: !isEditing });
      } catch (error) {
        if (!active) return;
        if (error instanceof AdminApiError && error.status === 404) {
          setProductError("تعذر العثور على المنتج");
        } else {
          setProductError(
            error instanceof Error ? error.message : "تعذر تحميل بيانات المنتج",
          );
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

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    imageUrlRef.current = nextUrl;
    setImagePreview(nextUrl);
    setImageFile(file);
    event.target.value = "";
  }

  function removeImagePreview() {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setImagePreview(null);
    setImageFile(null);
  }

  function updateVariant(tempId: string, updater: (variant: VariantDraft) => VariantDraft) {
    setVariantsDirty(true);
    setVariantRows((currentRows) =>
      currentRows.map((variant) =>
        variant.tempId === tempId ? updater(variant) : variant,
      ),
    );
  }

  function addVariant() {
    setVariantsDirty(true);
    setVariantRows((currentRows) => [...currentRows, emptyVariant()]);
  }

  function removeVariant(tempId: string) {
    setVariantsDirty(true);
    setVariantRows((currentRows) =>
      currentRows.length > 1
        ? currentRows.filter((variant) => variant.tempId !== tempId)
        : currentRows,
    );
  }

  function changeCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setVariantRows([emptyVariant()]);
    setVariantsDirty(true);
  }

  function toggleAddition(additionId: string | number) {
    const id = Number(additionId);
    if (!Number.isFinite(id)) return;

    setSelectedAdditionIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  }

  function validateForm() {
    if (!name.trim()) return "اسم المنتج مطلوب";
    if (!selectedMarketId) return "اختر السوق";
    if (!selectedCategoryId) return "اختر الفئة";
    if (!variantRows.length || variantRows.every((variant) => !variant.price.trim())) {
      return "يجب إضافة سعر/متغير واحد على الأقل";
    }
    if (variantRows.some((variant) => !validPrice(variant.price))) {
      return "السعر يجب أن يكون رقماً صحيحاً";
    }
    return "";
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validationError = validateForm();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    const marketId = Number(selectedMarketId);
    const categoryId = Number(selectedCategoryId);
    const variants = variantRows.map((variant) =>
      variantPayload(variant, Boolean(isEditing)),
    );
    const additionIds = normalizeIds(selectedAdditionIds);
    if (process.env.NODE_ENV === "development") {
      console.log("additionIds", additionIds);
    }
    const payload: ProductWritePayload = {
      market_id: marketId,
      category_id: categoryId,
      is_available: isAvailable,
      name: name.trim(),
      description: description.trim(),
      discount: discount.trim() || "0.00",
      additions: additionIds,
      ...(!isEditing || variantsDirty
        ? {
            attribute_values: uniqueAttributeValues(variantRows),
            variants,
          }
        : {}),
    };

    setSaving(true);
    setSaveError("");

    try {
      if (isEditing && editItemId) {
        await updateProduct(apiFetch, editItemId, payload, imageFile);
        showSnackbar({ message: "تم تحديث المنتج بنجاح.", tone: "success" });
      } else {
        await createProduct(apiFetch, payload, imageFile);
        showSnackbar({ message: "تم إنشاء المنتج بنجاح.", tone: "success" });
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

  const pageTitle = isEditing ? "تعديل منتج" : "إضافة منتج";
  const pageDescription = isEditing
    ? "عدّل بيانات المنتج من استجابة الباك مباشرة."
    : duplicateId
      ? "أنشئ نسخة جديدة من منتج موجود."
      : "أنشئ منتجاً جديداً متوافقاً مع API_REPORT.md.";

  if (productLoading && isEditing) {
    return (
      <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          جاري تحميل بيانات المنتج...
        </div>
      </div>
    );
  }

  if (productError && isEditing) {
    return (
      <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {productError}
          </div>
          <Link
            href="/items"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8"
      dir="rtl"
      onSubmit={saveProduct}
    >
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-8 md:text-3xl md:leading-9">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {pageDescription}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/items"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-4" />
              إلغاء
            </Link>
            <Button className="h-10" disabled={saving || catalogLoading || productLoading} type="submit">
              <Save className="size-4" />
              {saving ? "جاري الحفظ..." : "حفظ المنتج"}
            </Button>
          </div>
        </div>

        {catalogError || productError || saveError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {(saveError || productError || catalogError)
              .split("\n")
              .map((line) => (
                <div key={line}>{line}</div>
              ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Section title="البيانات الأساسية">
            <div className="grid gap-4 md:grid-cols-2">
              <LabelText label="اسم المنتج">
                <Input
                  className="h-10"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اسم المنتج مطلوب"
                  value={name}
                />
              </LabelText>
              <LabelText label="الحالة">
                <div className="flex h-10 items-center justify-between rounded-md border bg-input px-3">
                  <span className="text-sm font-semibold">
                    {isAvailable ? "متاح للبيع" : "غير متاح"}
                  </span>
                  <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
                </div>
              </LabelText>
            </div>
            <LabelText label="وصف المنتج">
              <textarea
                className="min-h-24 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="الوصف اختياري"
                value={description}
              />
            </LabelText>
            <div className="grid gap-4 md:grid-cols-2">
              <LabelText label="السوق">
                <AppSelect
                  ariaLabel="السوق"
                  className="h-10"
                  disabled={catalogLoading || !marketOptions.length}
                  icon={<Store className="size-4" />}
                  onValueChange={setSelectedMarketId}
                  options={marketOptions}
                  placeholder={catalogLoading ? "جار التحميل..." : "اختر السوق"}
                  value={selectedMarketId}
                />
              </LabelText>
              <LabelText label="الفئة">
                <AppSelect
                  ariaLabel="الفئة"
                  className="h-10"
                  disabled={catalogLoading || !categoryOptions.length}
                  icon={<Layers3 className="size-4" />}
                  onValueChange={changeCategory}
                  options={categoryOptions}
                  placeholder={catalogLoading ? "جار التحميل..." : "اختر الفئة"}
                  value={selectedCategoryId}
                />
              </LabelText>
            </div>
            <LabelText label="الخصم">
              <div className="relative max-w-xs" dir="ltr">
                <Input
                  className="h-10 pe-10 text-left"
                  inputMode="decimal"
                  onChange={(event) => setDiscount(event.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  value={discount}
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-black text-muted-foreground">
                  %
                </span>
              </div>
            </LabelText>
          </Section>

          <Section title="المتغيرات والأسعار">
            <div className="grid gap-3">
              {variantRows.map((variant, index) => (
                <div
                  key={variant.tempId}
                  className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[120px_1fr_auto] lg:items-start"
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-sm font-black text-primary">
                    {index + 1}
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <LabelText label="السعر">
                        <div className="relative" dir="ltr">
                          <Input
                            className="h-10 pe-14 text-left"
                            inputMode="decimal"
                            onChange={(event) =>
                              updateVariant(variant.tempId, (current) => ({
                                ...current,
                                price: event.target.value.replace(/[^\d.]/g, ""),
                              }))
                            }
                            placeholder="0.00"
                            value={variant.price}
                          />
                          <CurrencyText className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-bold text-muted-foreground">
                            EGP
                          </CurrencyText>
                        </div>
                      </LabelText>
                      <LabelText label="SKU">
                        <Input
                          className="h-10"
                          dir="ltr"
                          onChange={(event) =>
                            updateVariant(variant.tempId, (current) => ({
                              ...current,
                              sku: event.target.value,
                            }))
                          }
                          placeholder="اختياري"
                          value={variant.sku}
                        />
                      </LabelText>
                    </div>
                    {activeAttributes.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {activeAttributes.map((attribute) => (
                          <LabelText key={attribute.id} label={attribute.name}>
                            <AppSelect
                              ariaLabel={attribute.name}
                              className="h-10"
                              disabled={!attribute.options.length}
                              onValueChange={(optionId) =>
                                updateVariant(variant.tempId, (current) =>
                                  mergeAttributeValue(current, attribute.id, optionId),
                                )
                              }
                              options={attribute.options.map((option) => ({
                                value: String(option.id),
                                label: option.value,
                              }))}
                              placeholder={
                                attribute.options.length ? "اختر" : "لا توجد اختيارات"
                              }
                              value={String(selectedOptionId(variant, attribute.id) ?? "")}
                            />
                          </LabelText>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                        لا توجد خصائص لهذه الفئة. سيتم حفظ متغير سعر فقط.
                      </p>
                    )}
                  </div>
                  <Button
                    aria-label="حذف المتغير"
                    className="h-10"
                    disabled={variantRows.length === 1}
                    onClick={() => removeVariant(variant.tempId)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Button onClick={addVariant} type="button" variant="outline">
                <Plus className="size-4" />
                إضافة متغير
              </Button>
            </div>
          </Section>

          <Section title="الإضافات">
            {additions.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {additions.map((addition) => {
                  const additionId = Number(addition.id);
                  const selected = selectedAdditionIds.includes(additionId);

                  return (
                    <button
                      key={addition.id}
                      aria-pressed={selected}
                      className={cn(
                        "flex min-h-12 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-start text-sm transition hover:border-primary/50 hover:bg-accent/45",
                        selected && "border-primary bg-primary/10 ring-1 ring-primary/20",
                      )}
                      onClick={() => toggleAddition(addition.id)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{addition.name}</span>
                        {addition.price ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground" dir="ltr">
                            EGP {addition.price}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {selected ? <Check className="size-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد إضافات.</p>
            )}
          </Section>
        </div>

        <aside className="grid gap-5 self-start">
          <Section title="صورة المنتج">
            <label className="group relative flex min-h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-center transition hover:border-primary/50 hover:bg-accent/50">
              <input
                accept="image/*"
                className="sr-only"
                onChange={selectImage}
                type="file"
              />
              {imagePreview ? (
                <DashboardImage
                  alt={name || "صورة المنتج"}
                  src={imagePreview}
                  width={320}
                  height={220}
                  sizes="320px"
                  className="h-[220px] w-full rounded-lg"
                  imageClassName="object-contain p-2"
                />
              ) : (
                <span className="flex flex-col items-center gap-3 px-6 text-sm text-muted-foreground">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-background shadow-sm">
                    <ImagePlus className="size-6 text-primary" />
                  </span>
                  <span className="font-medium text-foreground">اختيار صورة</span>
                </span>
              )}
            </label>
            {imagePreview ? (
              <Button onClick={removeImagePreview} type="button" variant="outline">
                <X className="size-4" />
                إزالة المعاينة
              </Button>
            ) : null}
          </Section>

          <Section title="ملخص الحفظ">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3 rounded-md bg-muted/35 px-3 py-2">
                <span className="text-muted-foreground">السوق</span>
                <span className="truncate font-semibold">
                  {markets.find((market) => market.id === selectedMarketId)?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3 rounded-md bg-muted/35 px-3 py-2">
                <span className="text-muted-foreground">الفئة</span>
                <span className="truncate font-semibold">
                  {categories.find((category) => category.id === selectedCategoryId)?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3 rounded-md bg-muted/35 px-3 py-2">
                <span className="text-muted-foreground">المتغيرات</span>
                <span className="font-semibold">{variantRows.length}</span>
              </div>
              <div className="flex justify-between gap-3 rounded-md bg-muted/35 px-3 py-2">
                <span className="text-muted-foreground">الإضافات</span>
                <span className="font-semibold">{selectedAdditionIds.length}</span>
              </div>
            </div>
          </Section>
        </aside>
      </div>
    </form>
  );
}
