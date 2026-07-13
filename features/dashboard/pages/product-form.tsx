"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Package,
  Plus,
  Power,
  Save,
  Search,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Store,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import {
  AdminApiError,
  adminApiPaths,
  apiList,
  createProduct,
  deleteProductImage,
  getProduct,
  normalizeIds,
  primaryProductImageUrl,
  readApiData,
  reorderProductImages,
  sendProductNotification,
  setPrimaryProductImage,
  uploadProductImages,
  updateProduct,
  type BackendRecord,
  type NormalizedProduct,
  type NormalizedProductAttribute,
  type ProductVariantPayload,
  type ProductWritePayload,
} from "../admin-api";
import { ProductLivePreview } from "../components/product-live-preview";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { DashboardImage } from "../dashboard-image";
import { imageOrPlaceholder } from "../placeholders";
import { AppSelect, Button, CurrencyText, Input, Switch } from "../primitives";
import { useSnackbar } from "../snackbar";

type ProductTheme = "clothing" | "consumer" | "other";

type CatalogMarket = {
  id: string;
  name: string;
  branch: string;
  status: string;
  scope: string;
  serviceCities: string[];
};

type ProductAdditionChoice = {
  classification: string;
  id: string;
  name: string;
  price: string;
};

type OptionDraft = {
  clientId: string;
  id?: number;
  colorHex?: string;
  isActive?: boolean;
  value: string;
};

type AttributeDraft = {
  clientId: string;
  id?: number;
  name: string;
  options: OptionDraft[];
};

type VariantDraft = {
  tempId: string;
  id?: number;
  price: string;
  sku: string;
  selections: Record<string, string>;
};

type ProductImageDraft =
  | {
      kind: "remote";
      id: number;
      src: string;
      isPrimary: boolean;
      serverIsPrimary: boolean;
    }
  | {
      kind: "local";
      clientId: string;
      file: File;
      previewUrl: string;
      isPrimary: boolean;
    };

const MAX_PRODUCT_IMAGES = 10;
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const themeCards: Array<{
  id: ProductTheme;
  label: string;
  description: string;
  icon: typeof Shirt;
  tone: string;
  selectedTone: string;
}> = [
  {
    id: "clothing",
    label: "ملابس",
    description: "ألوان، مقاسات، ونوع",
    icon: Shirt,
    tone: "border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    selectedTone: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_14px_28px_rgba(16,185,129,0.16)]",
  },
  {
    id: "consumer",
    label: "استهلاكي",
    description: "الوزن والكمية",
    icon: ShoppingBasket,
    tone: "border-amber-200 bg-amber-50/70 text-amber-950 hover:border-amber-300 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100",
    selectedTone: "border-amber-500 ring-2 ring-amber-500/20 shadow-[0_14px_28px_rgba(245,158,11,0.16)]",
  },
  {
    id: "other",
    label: "أخرى",
    description: "بدون قالب جاهز",
    icon: Package,
    tone: "border-sky-200 bg-sky-50/70 text-sky-950 hover:border-sky-300 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-100",
    selectedTone: "border-sky-500 ring-2 ring-sky-500/20 shadow-[0_14px_28px_rgba(14,165,233,0.16)]",
  },
];

const themeTemplates: Record<ProductTheme, AttributeDraft[]> = {
  clothing: [
    {
      clientId: createId("attr-color"),
      name: "اللون",
      options: [],
    },
    {
      clientId: createId("attr-size"),
      name: "المقاس",
      options: [],
    },
    {
      clientId: createId("attr-type"),
      name: "النوع",
      options: [],
    },
  ],
  consumer: [
    { clientId: createId("attr-weight"), name: "الوزن", options: [] },
    { clientId: createId("attr-quantity"), name: "الكمية", options: [] },
  ],
  other: [],
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function useLockedPageScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

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
  }, [locked]);
}

function cloneTemplate(theme: ProductTheme) {
  return themeTemplates[theme].map((attribute) => ({
    clientId: createId(attribute.clientId),
    name: attribute.name,
    options: attribute.options.map((option) => ({
      clientId: createId(option.clientId),
      colorHex: colorHexForOption(attribute.name, option.value),
      isActive: true,
      value: option.value,
    })),
  }));
}

function isColorAttributeName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized.includes("لون") || normalized.includes("ط§ظ„ظ„ظˆظ†") || normalized.includes("color");
}

function colorHexForOption(attributeName: string, value: string) {
  if (!isColorAttributeName(attributeName)) return undefined;
  const normalized = value.trim().toLowerCase();
  const palette: Record<string, string> = {
    "أسود": "#111827",
    "ط£ط³ظˆط¯": "#111827",
    "أحمر": "#dc2626",
    "ط£ط­ظ…ط±": "#dc2626",
    "أخضر": "#16a34a",
    "ط£ط®ط¶ط±": "#16a34a",
    "أبيض": "#f8fafc",
    "ط£ط¨ظٹط¶": "#f8fafc",
    "كريمي": "#f5e6c8",
    "ظƒط±ظٹظ…ظٹ": "#f5e6c8",
    "أزرق": "#2563eb",
    "ط£ط²ط±ظ‚": "#2563eb",
  };
  return palette[normalized] ?? "#94a3b8";
}

function colorInputValue(value: string | undefined) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#94a3b8";
}

function emptyVariant(): VariantDraft {
  return {
    tempId: createId("variant"),
    price: "",
    sku: "",
    selections: {},
  };
}

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

function validPrice(value: string) {
  const trimmed = value.trim();
  return /^\d+(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) >= 0;
}

function optionIsActive(option: OptionDraft) {
  return option.isActive !== false;
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
  const serviceCities = Array.isArray(record.service_cities)
    ? record.service_cities
        .map((city) => textValue(asRecord(city)?.name))
        .filter(Boolean)
    : [];

  return {
    id: textValue(record.id),
    name: textValue(record.name, `محل #${textValue(record.id)}`),
    branch: textValue(record.branch),
    status: textValue(record.status, "active"),
    scope: textValue(record.scope, "service_city"),
    serviceCities,
  };
}

function additionFromRecord(record: BackendRecord): ProductAdditionChoice {
  const nameAr = textValue(record.name_ar);
  const name = nameAr || textValue(record.name, textValue(record.name_en, `إضافة #${textValue(record.id)}`));
  const classification = asRecord(record.classification);

  return {
    classification: textValue(
      record.classification_name,
      textValue(classification?.name, "غير مصنف"),
    ),
    id: textValue(record.id),
    name,
    price: textValue(record.price),
  };
}

function attributeFromProduct(attribute: NormalizedProductAttribute): AttributeDraft {
  const attrClientId = attribute.client_id || `attr-${attribute.id ?? createId("loaded")}`;
  return {
    ...(attribute.id === undefined || attribute.id === null ? {} : { id: attribute.id }),
    clientId: attrClientId,
    name: attribute.name,
    options: attribute.options.map((option) => ({
      ...(option.id === undefined || option.id === null ? {} : { id: option.id }),
      clientId: option.client_id || `opt-${option.id ?? createId("loaded")}`,
      colorHex: colorHexForOption(attribute.name, option.value),
      isActive: true,
      value: option.value,
    })),
  };
}

function variantFromProductVariant(value: unknown, attributes: AttributeDraft[]): VariantDraft {
  const record = asRecord(value) ?? {};
  const id = numericId(record.id);
  const selections: Record<string, string> = {};
  const attributeValues = Array.isArray(record.attribute_values) ? record.attribute_values : [];

  attributeValues.forEach((entry) => {
    const item = asRecord(entry);
    if (!item) return;
    const attrId = numericId(item.product_attribute_id ?? item.attribute_id);
    const optionId = numericId(item.product_attribute_option_id ?? item.option_id);
    const attribute = attributes.find((candidate) => candidate.id === attrId);
    const option = attribute?.options.find((candidate) => candidate.id === optionId);
    if (attribute && option) {
      selections[attribute.clientId] = option.clientId;
    }
  });

  return {
    tempId: createId("variant"),
    ...(id === null ? {} : { id }),
    price: textValue(record.price),
    sku: textValue(record.sku),
    selections,
  };
}

function productMarketChoice(product: NormalizedProduct): CatalogMarket | null {
  if (product.marketId === null) return null;
  return {
    id: String(product.marketId),
    name: textValue(product.market?.name, `محل #${product.marketId}`),
    branch: textValue(product.market?.branch),
    status: textValue(product.market?.status, "inactive"),
    scope: textValue(product.market?.scope, "service_city"),
    serviceCities: [],
  };
}

function selectionKey(variant: VariantDraft, attributes: AttributeDraft[]) {
  return selectionKeyFromSelections(variant.selections, attributes);
}

function selectionKeyFromSelections(
  selections: Record<string, string>,
  attributes: AttributeDraft[],
) {
  return attributes
    .map((attribute) => `${attribute.clientId}:${selections[attribute.clientId] ?? ""}`)
    .join("|");
}

function variantCombinations(attributes: AttributeDraft[]) {
  if (!attributes.length) return [];

  return attributes.reduce<Record<string, string>[]>((combinations, attribute) => {
    const optionIds = attribute.options.filter(optionIsActive).map((option) => option.clientId);
    if (!optionIds.length) return [];

    return combinations.flatMap((combination) =>
      optionIds.map((optionId) => ({
        ...combination,
        [attribute.clientId]: optionId,
      })),
    );
  }, [{}]);
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
  const localImageUrlsRef = useRef<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(Boolean(editItemId || duplicateId));
  const [catalogError, setCatalogError] = useState("");
  const [productError, setProductError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [markets, setMarkets] = useState<CatalogMarket[]>([]);
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [marketQuery, setMarketQuery] = useState("");
  const [marketTab, setMarketTab] = useState<"general" | "service_city">("general");
  const [additions, setAdditions] = useState<ProductAdditionChoice[]>([]);
  const [additionPickerOpen, setAdditionPickerOpen] = useState(false);
  const [additionClassification, setAdditionClassification] = useState("all");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedAdditionIds, setSelectedAdditionIds] = useState<number[]>([]);
  const [theme, setTheme] = useState<ProductTheme>("other");
  const [attributes, setAttributes] = useState<AttributeDraft[]>(() => cloneTemplate("other"));
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [sendPushNotification, setSendPushNotification] = useState(false);
  const [discount, setDiscount] = useState("0.00");
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([]);
  const [imageActionBusy, setImageActionBusy] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<number | null>(null);
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(() => [emptyVariant()]);
  const [variantsDirty, setVariantsDirty] = useState(false);
  const [previewSource, setPreviewSource] = useState<"api" | "draft">("draft");
  const [legacyMissingPrice, setLegacyMissingPrice] = useState(false);

  useLockedPageScroll(marketModalOpen);

  const selectedMarket = markets.find((market) => market.id === selectedMarketId) ?? null;
  const primaryImage =
    productImages.find((image) => image.isPrimary) ?? productImages[0] ?? null;
  const imagePreview = primaryImage
    ? primaryImage.kind === "local"
      ? primaryImage.previewUrl
      : primaryImage.src
    : null;

  const additionClassifications = useMemo(
    () => Array.from(new Set(additions.map((addition) => addition.classification || "غير مصنف"))),
    [additions],
  );

  const filteredAdditions = useMemo(
    () =>
      additionClassification === "all"
        ? additions
        : additions.filter((addition) => addition.classification === additionClassification),
    [additionClassification, additions],
  );

  const selectedAdditions = useMemo(() => {
    const selectedIds = new Set(selectedAdditionIds.map(String));
    return additions.filter((addition) => selectedIds.has(addition.id));
  }, [additions, selectedAdditionIds]);

  const hasUnusedAttributeValues = useMemo(
    () =>
      attributes.some((attribute) =>
        attribute.options.some(
          (option) =>
            !variantRows.some(
              (variant) => variant.selections[attribute.clientId] === option.clientId,
            ),
        ),
      ),
    [attributes, variantRows],
  );

  const availableVariantCombinations = useMemo(
    () => variantCombinations(attributes),
    [attributes],
  );
  const usedVariantCombinationKeys = useMemo(
    () =>
      new Set(
        variantRows
          .filter((variant) =>
            attributes.every((attribute) => Boolean(variant.selections[attribute.clientId])),
          )
          .map((variant) => selectionKey(variant, attributes)),
      ),
    [attributes, variantRows],
  );
  const nextVariantCombination = useMemo(
    () =>
      availableVariantCombinations.find(
        (selections) =>
          !usedVariantCombinationKeys.has(
            selectionKeyFromSelections(selections, attributes),
          ),
      ) ?? null,
    [attributes, availableVariantCombinations, usedVariantCombinationKeys],
  );
  const variantLimitReached =
    availableVariantCombinations.length > 0 &&
    variantRows.length >= availableVariantCombinations.length;

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

  useEffect(
    () => () => {
      localImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localImageUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const [marketsResponse, additionsResponse] = await Promise.all([
          apiFetch(adminApiPaths.markets),
          apiFetch(adminApiPaths.productAdditions),
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

  const hydrateProduct = useCallback((product: NormalizedProduct, options: { clone: boolean }) => {
    const marketChoice = productMarketChoice(product);
    const nextAttributes = product.attributes.length
      ? product.attributes.map(attributeFromProduct)
      : cloneTemplate(product.theme);
    const variants = product.variants.length
      ? product.variants.map((variant) => {
          const draft = variantFromProductVariant(variant, nextAttributes);
          return options.clone ? { ...draft, id: undefined } : draft;
        })
      : [emptyVariant()];

    if (marketChoice) {
      setMarkets((current) =>
        current.some((market) => market.id === marketChoice.id)
          ? current
          : [...current, marketChoice],
      );
      setSelectedMarketId(marketChoice.id);
    }

    setTheme(product.theme);
    setAttributes(nextAttributes);
    setName(options.clone ? `${product.name} (نسخة)` : product.name);
    setDescription(product.description);
    setDiscount(String(product.discount ?? "0.00"));
    setIsAvailable(product.isAvailable);
    setIsPopular(product.isPopular);
    setSendPushNotification(false);
    setSelectedAdditionIds(normalizeIds(product.additions));
    setProductImages(
      options.clone
        ? []
        : product.images.map((image) => ({
            kind: "remote" as const,
            id: image.id,
            src: image.url ?? image.image ?? primaryProductImageUrl(product) ?? "",
            isPrimary: image.isPrimary,
            serverIsPrimary: image.isPrimary,
          })),
    );
    setVariantRows(variants);
    setVariantsDirty(false);
    setPreviewSource(options.clone ? "draft" : "api");
    setLegacyMissingPrice(
      !options.clone && product.isAvailable && product.variants.length === 0,
    );
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
        setProductError(
          error instanceof Error ? error.message : "تعذر تحميل بيانات المنتج",
        );
      } finally {
        if (active) setProductLoading(false);
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [apiFetch, duplicateId, editItemId, hydrateProduct, isEditing]);

  function mergeServerImages(
    product: NormalizedProduct,
    preserveLocalPrimary = true,
  ) {
    setProductImages((current) => {
      const locals = current.filter(
        (image): image is Extract<ProductImageDraft, { kind: "local" }> =>
          image.kind === "local",
      );
      const localHasPrimary = preserveLocalPrimary && locals.some((image) => image.isPrimary);
      const remotes: ProductImageDraft[] = product.images.map((image) => ({
        kind: "remote",
        id: image.id,
        src: image.url ?? image.image ?? primaryProductImageUrl(product) ?? "",
        isPrimary: localHasPrimary ? false : image.isPrimary,
        serverIsPrimary: image.isPrimary,
      }));
      return [
        ...remotes,
        ...locals.map((image) => ({
          ...image,
          isPrimary: localHasPrimary ? image.isPrimary : false,
        })),
      ];
    });
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const localKeys = new Set(
      productImages
        .filter((image) => image.kind === "local")
        .map((image) => `${image.file.name}:${image.file.size}:${image.file.type}:${image.file.lastModified}`),
    );
    const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - productImages.length);
    const accepted: File[] = [];
    let validationMessage = "";

    for (const file of files) {
      if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type)) {
        validationMessage ||= "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WEBP.";
        continue;
      }
      if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
        validationMessage ||= "حجم الصورة أكبر من الحد المسموح (5 ميجابايت).";
        continue;
      }
      const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
      if (localKeys.has(key)) continue;
      if (accepted.length >= availableSlots) {
        validationMessage ||= "وصلت إلى الحد الأقصى للصور (10 صور).";
        continue;
      }
      localKeys.add(key);
      accepted.push(file);
    }

    if (validationMessage) {
      setSaveError(validationMessage);
      showSnackbar({ message: validationMessage, tone: "danger" });
    }
    if (!accepted.length) return;

    setProductImages((current) => {
      const hasPrimary = current.some((image) => image.isPrimary);
      const additions = accepted.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        localImageUrlsRef.current.add(previewUrl);
        return {
          kind: "local" as const,
          clientId: createId("product-image"),
          file,
          previewUrl,
          isPrimary: !hasPrimary && index === 0,
        };
      });
      return [...current, ...additions];
    });
    setSaveError("");
  }

  function removeLocalImage(clientId: string) {
    setProductImages((current) => {
      const removed = current.find(
        (image) => image.kind === "local" && image.clientId === clientId,
      );
      if (!removed || removed.kind !== "local") return current;
      URL.revokeObjectURL(removed.previewUrl);
      localImageUrlsRef.current.delete(removed.previewUrl);
      const next = current.filter(
        (image) => image.kind !== "local" || image.clientId !== clientId,
      );
      if (removed.isPrimary && next.length) {
        const nextLocal = next.find((image) => image.kind === "local");
        const serverPrimary = next.find(
          (image) => image.kind === "remote" && image.serverIsPrimary,
        );
        const replacement = nextLocal ?? serverPrimary ?? next[0];
        return next.map((image) => ({
          ...image,
          isPrimary:
            image.kind === "local" && replacement.kind === "local"
              ? image.clientId === replacement.clientId
              : image.kind === "remote" && replacement.kind === "remote"
                ? image.id === replacement.id
                : false,
        }));
      }
      return next;
    });
  }

  function setLocalPrimary(clientId: string) {
    setProductImages((current) =>
      current.map((image) => ({
        ...image,
        isPrimary: image.kind === "local" && image.clientId === clientId,
      })),
    );
  }

  function moveLocalImage(clientId: string, direction: -1 | 1) {
    setProductImages((current) => {
      const localIndexes = current
        .map((image, index) => (image.kind === "local" ? index : -1))
        .filter((index) => index >= 0);
      const currentIndex = current.findIndex(
        (image) => image.kind === "local" && image.clientId === clientId,
      );
      const localPosition = localIndexes.indexOf(currentIndex);
      const targetIndex = localIndexes[localPosition + direction];
      if (currentIndex < 0 || targetIndex === undefined) return current;
      const next = [...current];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return next;
    });
  }

  async function setRemotePrimary(imageId: number) {
    if (!editItemId || imageActionBusy) return;
    setImageActionBusy(true);
    setSaveError("");
    try {
      const product = await setPrimaryProductImage(apiFetch, editItemId, imageId);
      mergeServerImages(product, false);
      showSnackbar({ message: "تم تعيين الصورة الرئيسية." });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "تعذر تعيين الصورة الرئيسية");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function moveRemoteImage(imageId: number, direction: -1 | 1) {
    if (!editItemId || imageActionBusy) return;
    const remotes = productImages.filter(
      (image): image is Extract<ProductImageDraft, { kind: "remote" }> =>
        image.kind === "remote",
    );
    const index = remotes.findIndex((image) => image.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= remotes.length) return;
    const reordered = [...remotes];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImageActionBusy(true);
    setSaveError("");
    try {
      const product = await reorderProductImages(
        apiFetch,
        editItemId,
        reordered.map((image) => image.id),
      );
      mergeServerImages(product);
      showSnackbar({ message: "تم تحديث ترتيب الصور." });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "تعذر ترتيب الصور");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function confirmRemoteImageDelete() {
    if (!editItemId || deleteImageId === null || imageActionBusy) return;
    setImageActionBusy(true);
    setSaveError("");
    try {
      await deleteProductImage(apiFetch, editItemId, deleteImageId);
      const product = await getProduct(apiFetch, editItemId);
      mergeServerImages(product);
      setDeleteImageId(null);
      showSnackbar({ message: "تم حذف الصورة." });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "تعذر حذف الصورة");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function uploadPendingImages() {
    if (!editItemId || imageActionBusy) return;
    const locals = productImages.filter(
      (image): image is Extract<ProductImageDraft, { kind: "local" }> =>
        image.kind === "local",
    );
    if (!locals.length) return;
    const primaryIndex = locals.findIndex((image) => image.isPrimary);
    setImageActionBusy(true);
    setSaveError("");
    try {
      const product = await uploadProductImages(
        apiFetch,
        editItemId,
        locals.map((image) => image.file),
        primaryIndex >= 0 ? primaryIndex : undefined,
      );
      locals.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
        localImageUrlsRef.current.delete(image.previewUrl);
      });
      setProductImages(
        product.images.map((image) => ({
          kind: "remote",
          id: image.id,
          src: image.url ?? image.image ?? primaryProductImageUrl(product) ?? "",
          isPrimary: image.isPrimary,
          serverIsPrimary: image.isPrimary,
        })),
      );
      showSnackbar({ message: "تم رفع صور المنتج بنجاح." });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "تعذر رفع صور المنتج");
    } finally {
      setImageActionBusy(false);
    }
  }

  function applyTheme(nextTheme: ProductTheme) {
    if (nextTheme === theme) return;
    setTheme(nextTheme);
    setAttributes(cloneTemplate(nextTheme));
    setVariantRows([emptyVariant()]);
    setVariantsDirty(true);
  }

  function addAttribute() {
    setAttributes((current) => [
      ...current,
      { clientId: createId("attr"), name: "خاصية جديدة", options: [] },
    ]);
    setVariantsDirty(true);
  }

  function updateAttribute(clientId: string, name: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === clientId ? { ...attribute, name } : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function removeAttribute(clientId: string) {
    setAttributes((current) => current.filter((attribute) => attribute.clientId !== clientId));
    setVariantRows((current) =>
      current.map((variant) => {
        const selections = { ...variant.selections };
        delete selections[clientId];
        return { ...variant, selections };
      }),
    );
    setVariantsDirty(true);
  }

  function addOption(attributeClientId: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: [
                ...attribute.options,
                {
                  clientId: createId("opt"),
                  colorHex: isColorAttributeName(attribute.name) ? "#94a3b8" : undefined,
                  isActive: true,
                  value: isColorAttributeName(attribute.name) ? "لون جديد" : "اختيار جديد",
                },
              ],
            }
          : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function updateOption(attributeClientId: string, optionClientId: string, value: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.map((option) =>
                option.clientId === optionClientId ? { ...option, value } : option,
              ),
            }
          : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function updateOptionColor(attributeClientId: string, optionClientId: string, colorHex: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.map((option) =>
                option.clientId === optionClientId ? { ...option, colorHex } : option,
              ),
            }
          : attribute,
      ),
    );
    setVariantsDirty(true);
  }

  function removeOption(attributeClientId: string, optionClientId: string) {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.filter((option) => option.clientId !== optionClientId),
            }
          : attribute,
      ),
    );
    setVariantRows((current) =>
      current.map((variant) => ({
        ...variant,
        selections:
          variant.selections[attributeClientId] === optionClientId
            ? { ...variant.selections, [attributeClientId]: "" }
            : variant.selections,
      })),
    );
    setVariantsDirty(true);
  }

  function toggleOptionActive(attributeClientId: string, optionClientId: string) {
    let nextActive = true;
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.clientId === attributeClientId
          ? {
              ...attribute,
              options: attribute.options.map((option) => {
                if (option.clientId !== optionClientId) return option;
                nextActive = option.isActive === false;
                return { ...option, isActive: nextActive };
              }),
            }
          : attribute,
      ),
    );
    if (!nextActive) {
      setVariantRows((current) =>
        current.map((variant) => ({
          ...variant,
          selections:
            variant.selections[attributeClientId] === optionClientId
              ? { ...variant.selections, [attributeClientId]: "" }
              : variant.selections,
        })),
      );
    }
    setVariantsDirty(true);
  }

  function updateVariant(tempId: string, updater: (variant: VariantDraft) => VariantDraft) {
    setVariantsDirty(true);
    setVariantRows((currentRows) =>
      currentRows.map((variant) =>
        variant.tempId === tempId ? updater(variant) : variant,
      ),
    );
  }

  function variantOptionWouldDuplicate(
    tempId: string,
    attributeClientId: string,
    optionClientId: string,
  ) {
    const currentVariant = variantRows.find((variant) => variant.tempId === tempId);
    if (!currentVariant) return false;
    const nextSelections = {
      ...currentVariant.selections,
      [attributeClientId]: optionClientId,
    };
    if (attributes.some((attribute) => !nextSelections[attribute.clientId])) return false;

    return variantRows.some(
      (variant) =>
        variant.tempId !== tempId &&
        attributes.every(
          (attribute) =>
            variant.selections[attribute.clientId] === nextSelections[attribute.clientId],
        ),
    );
  }

  function addVariant() {
    if (variantLimitReached || !nextVariantCombination) return;
    setVariantsDirty(true);
    setVariantRows((currentRows) => [
      ...currentRows,
      {
        ...emptyVariant(),
        selections: { ...nextVariantCombination },
      },
    ]);
  }

  function removeVariant(tempId: string) {
    setVariantsDirty(true);
    setVariantRows((currentRows) =>
      currentRows.length > 1
        ? currentRows.filter((variant) => variant.tempId !== tempId)
        : currentRows,
    );
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
    if (!selectedMarketId) return "اختر المحل";
    if (!theme) return "اختر الثيم";
    const discountValue = Number(discount);
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue >= 100) {
      return "الخصم غير صالح";
    }
    const cleanAttributes = attributes.filter((attribute) => attribute.name.trim());
    if (!cleanAttributes.length) {
      const priced = variantRows.filter((variant) => variant.price.trim());
      if (!isAvailable && priced.length === 0) return null;
      if (priced.length !== 1) return "أدخل السعر الأساسي فقط";
      if (!validPrice(priced[0].price)) return "سعر المنتج غير صالح";
      return null;
    }
    if (!isAvailable && variantRows.every((variant) => !variant.price.trim())) {
      return null;
    }
    const seen = new Map<string, number>();
    for (const [index, variant] of variantRows.entries()) {
      if (!variant.price.trim()) return `سعر المتغير رقم ${index + 1} غير صالح`;
      if (!validPrice(variant.price)) return `سعر المتغير رقم ${index + 1} غير صالح`;
      for (const attribute of cleanAttributes) {
        const selectedOptionId = variant.selections[attribute.clientId];
        if (!selectedOptionId) {
          return `المتغير رقم ${index + 1} ينقصه اختيار ${attribute.name}`;
        }
        const selectedOption = attribute.options.find((option) => option.clientId === selectedOptionId);
        if (!selectedOption || !optionIsActive(selectedOption)) {
          return `اختيار ${attribute.name} في المتغير رقم ${index + 1} غير متاح`;
        }
      }
      const key = selectionKey(variant, cleanAttributes);
      if (seen.has(key)) {
        return `المتغير رقم ${index + 1} يكرر تركيبة المتغير رقم ${seen.get(key)}`;
      }
      seen.set(key, index + 1);
    }
    return null;
  }

  function attributePayload() {
    return attributes
      .filter((attribute) => attribute.name.trim())
      .map((attribute, index) => ({
        ...(attribute.id === undefined ? {} : { id: attribute.id }),
        client_id: attribute.clientId,
        name: attribute.name.trim(),
        sort_order: index,
        options: attribute.options
          .filter((option) => option.value.trim())
          .map((option, optionIndex) => ({
            ...(option.id === undefined ? {} : { id: option.id }),
            client_id: option.clientId,
            value: option.value.trim(),
            sort_order: optionIndex,
          })),
      }));
  }

  function variantPayloads(): ProductVariantPayload[] {
    const activeAttributes = attributes.filter((attribute) => attribute.name.trim());
    const sourceRows = activeAttributes.length
      ? variantRows.filter((variant) => isAvailable || variant.price.trim())
      : variantRows.filter((variant) => variant.price.trim()).slice(0, 1);

    return sourceRows.map((variant) => ({
      ...(variant.id !== undefined ? { id: variant.id } : {}),
      price: Number(variant.price).toFixed(2),
      selections: activeAttributes.map((attribute) => ({
        attribute_client_id: attribute.clientId,
        option_client_id: variant.selections[attribute.clientId],
      })),
    }));
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || imageActionBusy) return;
    const validationError = validateForm();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    const marketId = Number(selectedMarketId);
    const additionIds = selectedAdditionIds.filter((id) => Number.isFinite(id));
    const payload: ProductWritePayload = {
      market_id: marketId,
      theme,
      is_popular: isPopular,
      is_available: isAvailable,
      name: name.trim(),
      description: description.trim(),
      discount: Number(discount || 0).toFixed(2),
      additions: additionIds,
      ...(!isEditing || variantsDirty
        ? { attributes: attributePayload(), variants: variantPayloads() }
        : {}),
    };
    const localImages = productImages.filter(
      (image): image is Extract<ProductImageDraft, { kind: "local" }> =>
        image.kind === "local",
    );
    const primaryImageIndex = localImages.findIndex((image) => image.isPrimary);
    const files = localImages.map((image) => image.file);

    setSaving(true);
    setSaveError("");

    try {
      if (isEditing && editItemId) {
        await updateProduct(
          apiFetch,
          editItemId,
          payload,
          files,
          primaryImageIndex >= 0 ? primaryImageIndex : undefined,
        );
        showSnackbar({ message: "تم تحديث المنتج بنجاح.", tone: "success" });
      } else {
        const savedProduct = await createProduct(
          apiFetch,
          payload,
          files,
          primaryImageIndex >= 0 ? primaryImageIndex : undefined,
        );
        if (sendPushNotification) {
          try {
            const dispatch = await sendProductNotification(
              apiFetch,
              savedProduct.id,
              crypto.randomUUID(),
            );
            showSnackbar({
              message:
                dispatch.suppressedByMarketNotification
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

  const previewAttributes = attributes.map((attribute) => ({
    id: attribute.id,
    clientId: attribute.clientId,
    name: attribute.name,
    options: attribute.options.map((option) => ({
      id: option.id,
      clientId: option.clientId,
      attributeId: attribute.id,
      attributeClientId: attribute.clientId,
      colorHex: option.colorHex ?? colorHexForOption(attribute.name, option.value),
      isActive: optionIsActive(option),
      value: option.value,
    })),
  }));

  const previewVariants = variantRows.map((variant) => ({
    tempId: variant.tempId,
    price: variant.price,
    attributeValues: [],
    selections: Object.entries(variant.selections)
      .filter(([, optionClientId]) => Boolean(optionClientId))
      .map(([attributeClientId, optionClientId]) => ({
        attributeClientId,
        optionClientId,
      })),
  }));

  const pageTitle = isEditing ? "تعديل منتج" : "إضافة منتج";
  const pageDescription = isEditing
    ? "عدّل بيانات المنتج ومتغيراته من العقد الجديد."
    : duplicateId
      ? "أنشئ نسخة جديدة من منتج موجود."
      : "أنشئ منتجًا تابعًا لمحل مع ثيم وخصائص خاصة به.";

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
      onChangeCapture={() => setPreviewSource("draft")}
      onClickCapture={() => setPreviewSource("draft")}
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
            <Button className="h-10" disabled={saving || imageActionBusy || catalogLoading || productLoading} type="submit">
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
        {legacyMissingPrice ? (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            هذا المنتج لا يحتوي سعرًا محفوظًا، أدخل السعر ثم احفظه.
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5">
          <Section title="البيانات الأساسية">
            <div className="grid gap-4">
              <LabelText label="اسم المنتج">
                <Input
                  className="h-10"
                  data-testid="product-name-input"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اسم المنتج مطلوب"
                  value={name}
                />
              </LabelText>
            </div>
            <LabelText label="وصف المنتج">
              <textarea
                className="min-h-24 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                data-testid="product-description-input"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="الوصف اختياري"
                value={description}
              />
            </LabelText>
            <div className="grid gap-4 md:grid-cols-2">
              <LabelText label="المحل">
                <button
                  className="flex h-10 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 text-sm shadow-sm transition hover:border-primary/50"
                  onClick={() => setMarketModalOpen(true)}
                  type="button"
                >
                  <span className="min-w-0 truncate font-semibold">
                    {selectedMarket
                      ? selectedMarket.branch
                        ? `${selectedMarket.name} - ${selectedMarket.branch}`
                        : selectedMarket.name
                      : "اختيار المحل"}
                  </span>
                  <Store className="size-4 text-muted-foreground" />
                </button>
              </LabelText>
              <LabelText label="الخصم">
                <div className="relative" dir="ltr">
                  <Input
                    className="h-10 pe-10 text-left"
                    data-testid="product-discount-input"
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
            </div>
            <div className="flex min-h-12 items-center justify-between rounded-md border bg-background px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-[#FFA000]" />
                منتج شائع
              </span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </div>
          </Section>

          {!isEditing ? (
            <Section title="إشعار المنتج">
              <div className="flex min-h-24 items-center justify-between gap-5 rounded-lg border bg-background px-4 py-3">
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">
                    تحب تبعت إشعار للعملاء عن المنتج ده؟
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {!selectedMarket
                      ? "اختار المحل الأول علشان نحدد العملاء اللي الإشعار هيوصل لهم."
                      : selectedMarket.scope === "general"
                        ? "الإشعار هيوصل لعملاء السوق العام فقط، ولما يضغطوا عليه هيفتح تفاصيل المنتج."
                        : `الإشعار هيوصل لعملاء ${selectedMarket.serviceCities.join("، ") || "مدينة المحل"} فقط، ولما يضغطوا عليه هيفتح تفاصيل المنتج.`}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    لو إعلان المحل نفسه لسه منتظر أول منتج، هنبعت إعلان المحل وحده بدل إشعارين متتاليين.
                  </span>
                  {!isAvailable ? (
                    <span className="mt-2 block text-xs font-semibold text-amber-700 dark:text-amber-300">
                      خلّي المنتج متاح للبيع علشان تقدر تبعت الإشعار.
                    </span>
                  ) : null}
                </div>
                <Switch
                  aria-label="إرسال إشعار للعملاء عن المنتج"
                  checked={sendPushNotification}
                  data-testid="product-notification-switch"
                  disabled={!selectedMarket || !isAvailable || saving}
                  onCheckedChange={setSendPushNotification}
                />
              </div>
            </Section>
          ) : null}

          <Section title="الإضافات">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {selectedAdditions.length
                    ? `${selectedAdditions.length} إضافات محددة`
                    : "لا توجد إضافات محددة"}
                </div>
                {selectedAdditions.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedAdditions.map((addition) => (
                      <span
                        key={addition.id}
                        className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-xs font-semibold"
                      >
                        {addition.name}
                        {addition.price ? (
                          <CurrencyText className="text-primary">{`EGP ${addition.price}`}</CurrencyText>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button onClick={() => setAdditionPickerOpen(true)} type="button" variant="outline">
                <Plus className="size-4" />
                اختيار الإضافات
              </Button>
            </div>
          </Section>

          <Section title="الثيم">
            <div className="grid gap-3 md:grid-cols-3">
              {themeCards.map((card) => {
                const Icon = card.icon;
                const selected = theme === card.id;
                return (
                  <button
                    key={card.id}
                    aria-pressed={selected}
                    className={cn(
                      "group grid min-h-[116px] gap-3 rounded-lg border p-4 text-start transition",
                      card.tone,
                      selected && card.selectedTone,
                    )}
                    onClick={() => applyTheme(card.id)}
                    type="button"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex size-10 items-center justify-center rounded-md bg-background/75 shadow-sm">
                        <Icon className="size-5" />
                      </span>
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border bg-background/80",
                          selected ? "border-primary text-primary" : "border-transparent text-transparent",
                        )}
                      >
                        <Check className="size-4" />
                      </span>
                    </span>
                    <span>
                      <span className="block font-black">{card.label}</span>
                      <span className="mt-1 block text-xs font-semibold opacity-75">
                        {card.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="خصائص المنتج">
            {hasUnusedAttributeValues ? (
              <div
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
                role="status"
              >
                بعض قيم الخصائص غير مرتبطة بمتغيرات، ولذلك لن تظهر كاختيارات متاحة للعملاء.
              </div>
            ) : null}
            <div className="grid gap-3">
              {attributes.map((attribute, attributeIndex) => (
                <div key={attribute.clientId} className="grid gap-3 rounded-md border bg-background p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Input
                      className="h-10 flex-1"
                      onChange={(event) => updateAttribute(attribute.clientId, event.target.value)}
                      value={attribute.name}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => addOption(attribute.clientId)} type="button" variant="outline">
                        <Plus className="size-4" />
                        {isColorAttributeName(attribute.name) ? "إضافة لون" : "اختيار"}
                      </Button>
                      <Button
                        aria-label="حذف الخاصية"
                        onClick={() => removeAttribute(attribute.clientId)}
                        type="button"
                        variant="outline"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {attribute.options.map((option) => {
                      const isColor = isColorAttributeName(attribute.name);
                      const active = optionIsActive(option);
                      const colorHex = option.colorHex ?? colorHexForOption(attribute.name, option.value);
                      const safeColorHex = colorInputValue(colorHex);

                      return (
                        <div
                          key={option.clientId}
                          className={cn(
                            "inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-md border bg-card px-1.5 py-1 shadow-sm",
                            !active && "bg-muted/50 opacity-55",
                          )}
                        >
                          {isColor ? (
                            <>
                              <input
                                aria-label={`لون ${option.value}`}
                                className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                                onChange={(event) =>
                                  updateOptionColor(attribute.clientId, option.clientId, event.target.value)
                                }
                                type="color"
                                value={safeColorHex}
                              />
                              <Input
                                aria-label={`درجة لون ${option.value}`}
                                className="h-8 w-20 px-2 text-xs"
                                dir="ltr"
                                onChange={(event) =>
                                  updateOptionColor(attribute.clientId, option.clientId, event.target.value)
                                }
                                value={colorHex ?? "#94a3b8"}
                              />
                            </>
                          ) : null}
                          <input
                            className="w-16 bg-transparent text-sm font-semibold outline-none"
                            onChange={(event) =>
                              updateOption(attribute.clientId, option.clientId, event.target.value)
                            }
                            value={option.value}
                          />
                          <button
                            aria-label={active ? `تعطيل الاختيار ${option.value}` : `تفعيل الاختيار ${option.value}`}
                            className={cn(
                              "inline-flex size-8 items-center justify-center rounded-md border transition",
                              active
                                ? "text-muted-foreground hover:border-primary hover:text-primary"
                                : "border-primary/40 bg-primary/10 text-primary",
                            )}
                            onClick={() => toggleOptionActive(attribute.clientId, option.clientId)}
                            type="button"
                          >
                            <Power className="size-3.5" />
                          </button>
                          <button
                            aria-label={`حذف الاختيار ${option.value}`}
                            className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground transition hover:border-destructive hover:text-destructive"
                            onClick={() => removeOption(attribute.clientId, option.clientId)}
                            type="button"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {!attribute.options.length ? (
                    <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      لا توجد اختيارات لـ {attribute.name || `الخاصية ${attributeIndex + 1}`}.
                    </div>
                  ) : null}
                </div>
              ))}
              {!attributes.length ? (
                <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                  يبدأ هذا الثيم بلا خصائص.
                </div>
              ) : null}
            </div>
            <div>
              <Button onClick={addAttribute} type="button" variant="outline">
                <Plus className="size-4" />
                إضافة خاصية
              </Button>
            </div>
          </Section>

          <Section title="المتغيرات والأسعار">
            <div className="grid gap-3">
              {variantRows.map((variant, index) => (
                <div
                  key={variant.tempId}
                  className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[48px_1fr_auto] lg:items-start"
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-sm font-black text-primary">
                    {index + 1}
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-3">
                      <LabelText label={attributes.length ? "سعر التركيبة" : "السعر الأساسي"}>
                        <div className="relative" dir="ltr">
                          <Input
                            className="h-10 pe-14 text-left"
                            data-testid={`variant-price-${index}`}
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
                    </div>
                    {attributes.length ? (
                      <div className="grid grid-cols-3 gap-2">
                        {attributes.map((attribute) => (
                          <LabelText key={attribute.clientId} label={attribute.name}>
                            <AppSelect
                              ariaLabel={attribute.name}
                              className="h-10"
                              disabled={!attribute.options.length}
                              onValueChange={(optionId) =>
                                updateVariant(variant.tempId, (current) => ({
                                  ...current,
                                  selections: { ...current.selections, [attribute.clientId]: optionId },
                                }))
                              }
                              options={attribute.options.filter(optionIsActive).map((option) => ({
                                value: option.clientId,
                                label: option.value,
                                disabled: variantOptionWouldDuplicate(
                                  variant.tempId,
                                  attribute.clientId,
                                  option.clientId,
                                ),
                              }))}
                              placeholder={attribute.options.length ? "اختر" : "لا توجد اختيارات"}
                              value={variant.selections[attribute.clientId] ?? ""}
                            />
                          </LabelText>
                        ))}
                      </div>
                    ) : null}
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
            {attributes.length ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={variantLimitReached || !nextVariantCombination}
                  onClick={addVariant}
                  type="button"
                  variant="outline"
                >
                  <Plus className="size-4" />
                  {variantLimitReached ? "تم إنشاء كل التركيبات" : "إضافة تركيبة"}
                </Button>
                <span className="self-center text-xs font-semibold text-muted-foreground">
                  {variantRows.length} من {availableVariantCombinations.length} تركيبة
                </span>
              </div>
            ) : null}
          </Section>

        </div>

        <aside className="grid gap-5 self-start xl:sticky xl:top-5">
          <ProductLivePreview
            additions={additions}
            attributes={previewAttributes}
            description={description}
            discount={discount}
            imageSrc={imageOrPlaceholder(imagePreview, "product")}
            isAvailable={isAvailable}
            isPopular={isPopular}
            markets={markets}
            name={name}
            previewSource={previewSource}
            selectedAdditionIds={selectedAdditionIds}
            selectedMarketId={selectedMarketId}
            theme={theme}
            variantRows={previewVariants}
          />

          <Section title="صور المنتج">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>يمكنك اختيار حتى 10 صور</span>
              <span>{productImages.length} / {MAX_PRODUCT_IMAGES}</span>
            </div>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-center transition hover:border-primary/50 hover:bg-accent/50">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                data-testid="product-images-input"
                disabled={saving || imageActionBusy || productImages.length >= MAX_PRODUCT_IMAGES}
                multiple
                onChange={selectImages}
                type="file"
              />
              <DashboardImage
                alt={name || "صورة المنتج"}
                src={imagePreview}
                placeholderType="product"
                width={320}
                height={220}
                sizes="320px"
                className="h-[220px] w-full rounded-lg"
                imageClassName="object-contain p-2"
                unoptimized={imagePreview?.startsWith("blob:")}
              />
              <ImagePlus className="size-6 text-primary" />
              <span className="text-sm font-semibold">
                {productImages.length ? "إضافة صور أخرى" : "اختر صور المنتج"}
              </span>
              <span className="text-xs text-muted-foreground">JPG أو PNG أو WEBP، بحد أقصى 5 ميجابايت للصورة</span>
            </label>
            {isEditing && productImages.some((image) => image.kind === "local") ? (
              <Button
                disabled={saving || imageActionBusy}
                onClick={() => void uploadPendingImages()}
                type="button"
              >
                <ImagePlus className="size-4" />
                {imageActionBusy ? "جاري رفع الصور..." : "رفع الصور المحددة"}
              </Button>
            ) : null}

            {productImages.length ? (
              <div className="grid grid-cols-2 gap-3" data-testid="product-image-grid">
                {productImages.map((image, index) => {
                  const sameKind = productImages.filter((item) => item.kind === image.kind);
                  const kindIndex = sameKind.findIndex((item) =>
                    item.kind === "remote" && image.kind === "remote"
                      ? item.id === image.id
                      : item.kind === "local" && image.kind === "local"
                        ? item.clientId === image.clientId
                        : false,
                  );
                  const src = image.kind === "local" ? image.previewUrl : image.src;
                  const key = image.kind === "local" ? image.clientId : String(image.id);
                  return (
                    <article key={`${image.kind}-${key}`} className="overflow-hidden rounded-lg border bg-background shadow-sm">
                      <div className="relative h-28 bg-muted/25">
                        <DashboardImage
                          alt={`${name || "صورة المنتج"} ${index + 1}`}
                          src={src}
                          placeholderType="product"
                          width={180}
                          height={112}
                          sizes="180px"
                          className="h-28 w-full"
                          imageClassName="object-contain p-1.5"
                          unoptimized={image.kind === "local"}
                        />
                        <span className="absolute start-2 top-2 rounded-md bg-background/90 px-2 py-1 text-[11px] font-black shadow">
                          {index + 1}
                        </span>
                        {image.isPrimary ? (
                          <span className="absolute bottom-2 end-2 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow">
                            الصورة الرئيسية
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-2 p-2">
                        {!image.isPrimary ? (
                          <Button
                            className="h-8 px-2 text-xs"
                            disabled={imageActionBusy}
                            onClick={() =>
                              image.kind === "local"
                                ? setLocalPrimary(image.clientId)
                                : void setRemotePrimary(image.id)
                            }
                            type="button"
                            variant="outline"
                          >
                            تعيين كرئيسية
                          </Button>
                        ) : null}
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            aria-label="تحريك الصورة للأعلى"
                            className="h-8 px-2"
                            disabled={kindIndex <= 0 || imageActionBusy}
                            onClick={() =>
                              image.kind === "local"
                                ? moveLocalImage(image.clientId, -1)
                                : void moveRemoteImage(image.id, -1)
                            }
                            type="button"
                            variant="outline"
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            aria-label="تحريك الصورة للأسفل"
                            className="h-8 px-2"
                            disabled={kindIndex >= sameKind.length - 1 || imageActionBusy}
                            onClick={() =>
                              image.kind === "local"
                                ? moveLocalImage(image.clientId, 1)
                                : void moveRemoteImage(image.id, 1)
                            }
                            type="button"
                            variant="outline"
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button
                            aria-label="حذف الصورة"
                            className="h-8 px-2"
                            disabled={imageActionBusy}
                            onClick={() =>
                              image.kind === "local"
                                ? removeLocalImage(image.clientId)
                                : setDeleteImageId(image.id)
                            }
                            type="button"
                            variant="danger"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/15 px-3 py-3 text-center text-sm text-muted-foreground">
                لا توجد صور للمنتج بعد.
              </div>
            )}
          </Section>
        </aside>
      </div>

      {additionPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
          <div
            aria-modal="true"
            className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div className="font-semibold">اختيار الإضافات</div>
              <button
                aria-label="إغلاق"
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                onClick={() => setAdditionPickerOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-4 p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  className={cn(
                    "h-9 rounded-md border px-3 text-sm font-semibold transition",
                    additionClassification === "all"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:border-primary/50",
                  )}
                  onClick={() => setAdditionClassification("all")}
                  type="button"
                >
                  الكل
                </button>
                {additionClassifications.map((classification) => (
                  <button
                    key={classification}
                    className={cn(
                      "h-9 rounded-md border px-3 text-sm font-semibold transition",
                      additionClassification === classification
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:border-primary/50",
                    )}
                    onClick={() => setAdditionClassification(classification)}
                    type="button"
                  >
                    {classification}
                  </button>
                ))}
              </div>

              <div className="max-h-[54vh] overflow-y-auto">
                {filteredAdditions.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredAdditions.map((addition) => {
                      const additionId = Number(addition.id);
                      const selected = selectedAdditionIds.includes(additionId);

                      return (
                        <button
                          key={addition.id}
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-12 items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-start text-sm transition hover:border-primary/50",
                            selected && "border-primary bg-primary/10 ring-1 ring-primary/20",
                          )}
                          onClick={() => toggleAddition(addition.id)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{addition.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {addition.classification}
                              {addition.price ? ` - EGP ${addition.price}` : ""}
                            </span>
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
                  <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                    لا توجد إضافات في هذا التصنيف.
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setAdditionPickerOpen(false)} type="button">
                  موافق
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {marketModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
          <div
            aria-modal="true"
            className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div className="font-semibold">اختيار المحل</div>
              <button
                aria-label="إغلاق"
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMarketModalOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                  <Input
                    className="h-10 ps-9"
                    onChange={(event) => setMarketQuery(event.target.value)}
                    value={marketQuery}
                  />
                </div>
                <div className="flex rounded-md border bg-muted/20 p-1">
                  {[
                    ["general", "عام"],
                    ["service_city", "مدن الخدمة"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={cn(
                        "h-8 rounded px-3 text-sm font-semibold transition",
                        marketTab === value ? "bg-background shadow-sm" : "text-muted-foreground",
                      )}
                      onClick={() => setMarketTab(value as "general" | "service_city")}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[54vh] overflow-y-auto">
                <div className="grid gap-2">
                  {filteredMarkets.map((market) => (
                    <button
                      key={market.id}
                      className={cn(
                        "flex min-h-14 items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-start transition hover:border-primary/50",
                        selectedMarketId === market.id && "border-primary bg-primary/10",
                      )}
                      onClick={() => {
                        setSelectedMarketId(market.id);
                        setMarketModalOpen(false);
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {market.branch ? `${market.name} - ${market.branch}` : market.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {market.scope === "general"
                            ? "عام"
                            : market.serviceCities.join("، ") || "مدينة خدمة"}
                        </span>
                      </span>
                      {selectedMarketId === market.id ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  ))}
                  {!filteredMarkets.length ? (
                    markets.length === 0 ? (
                      <div className="flex min-h-[230px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/10 px-5 py-8 text-center">
                        <div className="flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                          <Store className="size-7" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-foreground">
                          لا توجد محلات حتى الآن
                        </h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                          أضف محلًا أولًا قبل ربط المنتج بالمحل المناسب.
                        </p>
                        <Link
                          href="/items/shops"
                          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
                          onClick={() => setMarketModalOpen(false)}
                        >
                          <Plus className="size-4" />
                          إضافة محل
                        </Link>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                        لا توجد محلات مطابقة.
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {deleteImageId !== null ? (
        <ConfirmDeleteDialog
          busy={imageActionBusy}
          description="سيتم حذف الصورة المرفوعة نهائيًا. إذا كانت رئيسية فسيتم اختيار الصورة التالية تلقائيًا."
          onCancel={() => setDeleteImageId(null)}
          onConfirm={() => void confirmRemoteImageDelete()}
          title="حذف الصورة"
        />
      ) : null}
    </form>
  );
}
