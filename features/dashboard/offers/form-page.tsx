"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type { ItemRow } from "../products/types";
import { useAuth } from "@/features/auth/auth-provider";
import {
  adminApiPaths,
  apiErrorMessage,
  apiList,
  fetchAdminRows,
  productRowFromApi,
  readApiData,
  sendAdminJson,
  type BackendRecord,
} from "../admin-api";
import { DashboardImage } from "../dashboard-image";
import {
  AppSelect,
  Button,
  Field,
  FormCard,
  Input,
  PageTitle,
  SelectBox,
  Switch,
} from "../primitives";
import { cn } from "@/lib/utils";
import { useSnackbar } from "../snackbar";
import { useServiceCities, type ServiceCity } from "../cities-api";
import { formatReferenceCurrency } from "../shared/money";
import {
  offerCardFromApi,
  offerMarketFromApi,
  offerTypeOptions,
  offerTypeValues,
  type ArabicOfferType,
  type OfferCard,
  type OfferMarket,
} from "./domain";
import {
  ScheduleDateField,
  ScheduleTimeField,
} from "./schedule-fields";
import {
  currentScheduleValues,
  formatDateInputValue,
  formatLocalIsoDateTime,
  formatTimeInputValue,
} from "./schedule";

function Textarea({
  placeholder,
  minHeight = "min-h-[84px]",
  dir,
  value,
  onChange,
}: {
  placeholder: string;
  minHeight?: string;
  dir?: "rtl" | "ltr";
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      dir={dir}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={cn(
        "w-full rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        minHeight,
      )}
    />
  );
}

function RefBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "yellow" | "blue" | "red" | "purple" | "orange" | "gray";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        tone === "green" &&
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
        tone === "yellow" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
        tone === "blue" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
        tone === "red" &&
          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
        tone === "purple" && "bg-purple-100 text-purple-700",
        tone === "orange" &&
          "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
        tone === "gray" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function MiniIconButton({
  children,
  tone = "default",
  ariaLabel,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "orange" | "red";
  ariaLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-35",
        tone === "green" && "text-green-600",
        tone === "orange" && "text-orange-500",
        tone === "red" && "text-red-500",
        tone === "default" && "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

type OfferProductsContextValue = {
  products: ItemRow[];
  cities: ServiceCity[];
  citiesLoading: boolean;
};

const OfferProductsContext = createContext<OfferProductsContextValue>({
  products: [],
  cities: [],
  citiesLoading: false,
});
type BundleLine = {
  id: string;
  itemId: string;
  variantId?: string;
  quantity: number;
  applyProductDiscount?: boolean;
};

function itemPriceLabel(item: ItemRow) {
  return item.displayPriceLabel ?? item.price;
}

function variantFromItem(item: ItemRow | null, variantId: string) {
  if (!item || !variantId) return null;
  return item.variants?.find((variant) => String(variant.id) === variantId) ?? null;
}

function defaultVariantId(item: ItemRow | null) {
  return item?.variants?.length === 1 ? String(item.variants[0].id) : "";
}

function variantPriceValue(item: ItemRow | null, variantId: string) {
  const value = variantFromItem(item, variantId)?.price;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function variantAttributeText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as BackendRecord;
  const attribute = record.attribute && typeof record.attribute === "object"
    ? record.attribute as BackendRecord
    : null;
  const option = record.option && typeof record.option === "object"
    ? record.option as BackendRecord
    : null;
  const attributeName = String(
    record.attribute_name ?? attribute?.name ?? "",
  ).trim();
  const optionValue = String(
    record.option_value ?? option?.value ?? "",
  ).trim();
  if (!attributeName || !optionValue) return optionValue;
  return `${attributeName}: ${optionValue}`;
}

function variantLabel(item: ItemRow, variantId: string) {
  const variant = variantFromItem(item, variantId);
  if (!variant) return "اختر التركيبة";
  const attributes = (variant.attribute_values ?? [])
    .map(variantAttributeText)
    .filter(Boolean)
    .join(" / ");
  const fallback = variant.sku?.trim() || `تركيبة #${variant.id}`;
  return `${attributes || fallback} — ${formatReferenceCurrency(Number(variant.price) || 0)}`;
}

function lineUnitPrice(item: ItemRow | null, line: BundleLine) {
  const price = variantPriceValue(item, line.variantId ?? "");
  if (line.applyProductDiscount === false) return price;
  const productDiscount = clampDiscountPercent(item?.discountPercent ?? 0);
  return price * (1 - productDiscount / 100);
}

function selectedItemFrom(rows: ItemRow[], itemId: string): ItemRow | null {
  return rows.find((item) => item.id === itemId) ?? null;
}

function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeProductSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function itemMatchesProductSearch(item: ItemRow, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  const searchable = [
    item.name,
    item.description,
    item.category,
    item.subcategory,
    itemPriceLabel(item),
    item.code,
    item.id,
    item.active ? "نشط active" : "متوقف inactive",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  return searchable.includes(normalizedQuery);
}

function ProductPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (itemId: string) => void;
}) {
  const { products } = useContext(OfferProductsContext);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedItem = selectedItemFrom(products, value);

  function selectProduct(itemId: string) {
    onChange(itemId);
    setPickerOpen(false);
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          {label}
        </div>
        <Link
          href="/items/create"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-accent"
        >
          <Plus className="size-3.5" />
          إضافة منتج
        </Link>
      </div>

      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-background p-2 shadow-sm">
        <DashboardImage
          src={selectedItem?.image ?? ""}
          placeholderType="product"
          alt=""
          width={88}
          height={88}
          sizes="44px"
          className="size-11 rounded-md"
          imageClassName="object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{selectedItem?.name ?? "لم يتم اختيار منتج"}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{selectedItem?.category ?? ""}</span>
            <span className="shrink-0">{selectedItem ? itemPriceLabel(selectedItem) : ""}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={products.length === 0}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Search className="size-3.5" />
          تغيير
        </button>
      </div>

      <PackageProductSearchModal
        open={pickerOpen}
        selectedItemIds={[value]}
        title={`تغيير ${label}`}
        description="ابحث بالاسم أو الكود، أو اختار من تصنيفات كل المنتجات."
        selectedLabel="المنتج الحالي"
        onClose={() => setPickerOpen(false)}
        onSelect={selectProduct}
      />
    </div>
  );
}

function PackageProductSearchModal({
  open,
  selectedItemIds,
  title = "إضافة منتج للباكج",
  description = "ابحث بالاسم أو الكود، أو اختار من تصنيفات كل المنتجات.",
  selectedLabel = "موجود في الباكج",
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedItemIds: string[];
  title?: string;
  description?: string;
  selectedLabel?: string;
  onClose: () => void;
  onSelect: (itemId: string) => void;
}) {
  const { products } = useContext(OfferProductsContext);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeProductSearch(query);
  const filteredItems = useMemo(
    () =>
      products.filter((item) => itemMatchesProductSearch(item, normalizedQuery)),
    [normalizedQuery, products],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-product-search-title"
        className="flex max-h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="package-product-search-title" className="text-base font-bold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label="إغلاق اختيار المنتج"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b bg-muted/15 p-4">
          <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-medium">
            بحث
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم المنتج أو الكود..."
                className="h-10 ps-9"
                autoFocus
              />
            </div>
          </label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {filteredItems.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const selected = selectedItemIds.includes(item.id);
                const price = itemPriceLabel(item);
                const code = item.code ?? item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "group grid min-h-[112px] grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md border bg-card p-3 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45",
                      selected && "border-primary/45 bg-primary/10",
                    )}
                  >
                    <DashboardImage
                      src={item.image}
                      placeholderType="product"
                      alt=""
                      width={128}
                      height={128}
                      sizes="56px"
                      className="size-14 rounded-md"
                      imageClassName="object-cover"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <RefBadge tone={item.active ? "green" : "red"}>
                          {item.active ? "نشط" : "متوقف"}
                        </RefBadge>
                        {selected ? <RefBadge tone="blue">{selectedLabel}</RefBadge> : null}
                      </span>
                      <span className="mt-2 block truncate text-sm font-bold">{item.name}</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-primary">
                        {item.shopName || `محل #${item.marketId ?? "-"}`}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                        {code}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-md bg-muted/50 px-2 py-1 font-semibold text-foreground">
                          {price}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border bg-muted/10 px-4 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />
              <div className="text-sm font-semibold">مفيش منتجات مطابقة</div>
              <p className="mt-1 text-xs text-muted-foreground">
                جرّب تغير كلمة البحث أو التصنيف.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            ظاهر {filteredItems.length} من {products.length} منتج
          </div>
          <Button type="button" variant="outline" className="h-10" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}

function SingleOfferProductPanel({
  title,
  description,
  selectedItemId,
  onSelectItem,
  selectedVariantId,
  onSelectVariant,
  quantity,
  onChangeQuantity,
  badgeTone,
  discountPercent,
  contextLabel = "العرض",
}: {
  title: string;
  description: string;
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  badgeTone: "green" | "yellow" | "blue" | "red" | "purple" | "orange" | "gray";
  discountPercent?: number;
  contextLabel?: string;
}) {
  const { products } = useContext(OfferProductsContext);
  const { showSnackbar } = useSnackbar();
  const [productsOpen, setProductsOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const selectedItem = selectedItemId
    ? products.find((item) => item.id === selectedItemId) ?? null
    : null;
  const hasSelectedProduct = Boolean(selectedItem);
  const selectedVariantText = selectedItem && selectedVariantId
    ? variantLabel(selectedItem, selectedVariantId)
    : "";
  const productTotal =
    selectedItem && typeof discountPercent === "number"
      ? variantPriceValue(selectedItem, selectedVariantId) * (1 - clampDiscountPercent(discountPercent) / 100) * quantity
      : selectedItem
        ? variantPriceValue(selectedItem, selectedVariantId) * quantity
        : 0;
  const singleLine: BundleLine = {
    id: `single-${selectedItemId || "empty"}`,
    itemId: selectedItemId,
    variantId: selectedVariantId,
    quantity,
    applyProductDiscount: true,
  };

  function selectSingleProduct(itemId: string) {
    onSelectItem(itemId);
    onSelectVariant(defaultVariantId(products.find((item) => item.id === itemId) ?? null));
    onChangeQuantity(1);
    setProductSearchOpen(false);
    setProductsOpen(true);
  }

  function removeSingleProduct() {
    if (selectedItem) {
      showSnackbar({ message: `تم حذف ${selectedItem.name} من ${contextLabel}.`, tone: "danger" });
    }
    onSelectItem("");
    onSelectVariant("");
    setProductsOpen(false);
    onChangeQuantity(1);
  }

  function updateSingleLine(patch: Partial<BundleLine>) {
    if (patch.itemId) {
      onSelectItem(patch.itemId);
      onSelectVariant(defaultVariantId(products.find((item) => item.id === patch.itemId) ?? null));
    }

    if (patch.variantId !== undefined) onSelectVariant(patch.variantId);

    if (typeof patch.quantity === "number") {
      onChangeQuantity(Math.max(1, Math.min(99, patch.quantity)));
    }
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border bg-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <button
            type="button"
            aria-expanded={productsOpen}
            onClick={() => {
              if (hasSelectedProduct) {
                setProductsOpen((open) => !open);
              }
            }}
            className="min-w-0 flex-1 rounded-md text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{title}</span>
              <RefBadge tone={badgeTone}>
                {hasSelectedProduct ? "1 منتج" : "0 منتج"}
              </RefBadge>
              {hasSelectedProduct ? (
                <RefBadge tone="gray">{formatReferenceCurrency(productTotal)}</RefBadge>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {selectedItem
                ? `${selectedItem.name}${selectedVariantText ? ` · ${selectedVariantText}` : " · اختر التركيبة"}`
                : "لم يتم اختيار منتج بعد."}
            </p>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setProductSearchOpen(true)}
            >
              <Plus className="size-4" />
              إضافة منتج
            </Button>
            {hasSelectedProduct ? (
              <button
                type="button"
                aria-expanded={productsOpen}
                onClick={() => setProductsOpen((open) => !open)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold text-primary shadow-sm transition hover:bg-accent"
              >
                {productsOpen ? "إخفاء المنتجات" : "عرض المنتجات"}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    productsOpen && "rotate-180",
                  )}
                />
              </button>
            ) : null}
          </div>
        </div>

        {productsOpen && selectedItem ? (
          <div className="grid gap-3 border-t bg-background/30 p-3">
            <PackageProductCard
              line={singleLine}
              item={selectedItem}
              lineTotal={productTotal}
              canRemove
              contextLabel={contextLabel}
              discountPercent={discountPercent}
              onChange={updateSingleLine}
              onRemove={removeSingleProduct}
            />
          </div>
        ) : null}
      </div>

      <PackageProductSearchModal
        open={productSearchOpen}
        selectedItemIds={selectedItemId ? [selectedItemId] : []}
        title={`إضافة منتج إلى ${title}`}
        description={description}
        selectedLabel="المنتج المحدد"
        onClose={() => setProductSearchOpen(false)}
        onSelect={selectSingleProduct}
      />
    </div>
  );
}

function PackageProductCard({
  line,
  item,
  lineTotal,
  canRemove,
  contextLabel = "الباكج",
  discountPercent,
  showProductDiscountControl = false,
  onChange,
  onRemove,
}: {
  line: BundleLine;
  item: ItemRow;
  lineTotal: number;
  canRemove: boolean;
  contextLabel?: string;
  discountPercent?: number;
  showProductDiscountControl?: boolean;
  onChange: (patch: Partial<BundleLine>) => void;
  onRemove: () => void;
}) {
  const originalUnitPrice = variantPriceValue(item, line.variantId ?? "");
  const unitPrice = lineUnitPrice(item, line);
  const productDiscountPercent = clampDiscountPercent(item.discountPercent ?? 0);
  const hasOfferDiscount = typeof discountPercent === "number";
  const discountedPrice = hasOfferDiscount
    ? unitPrice * (1 - clampDiscountPercent(discountPercent) / 100)
    : unitPrice;

  return (
    <div className="rounded-md border bg-background p-3 shadow-sm transition hover:border-primary/30">
      <div className="grid gap-3 lg:grid-cols-[72px_minmax(0,1fr)_minmax(260px,320px)]">
        <DashboardImage
          src={item.image}
          placeholderType="product"
          alt=""
          width={144}
          height={144}
          sizes="72px"
          className="size-[72px] rounded-md"
          imageClassName="object-cover"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RefBadge tone="gray">#{item.index}</RefBadge>
            <RefBadge tone={item.active ? "green" : "red"}>
              {item.active ? "نشط" : "متوقف"}
            </RefBadge>
            {item.featured === "نعم" ? <RefBadge tone="purple">مميز</RefBadge> : null}
          </div>
          <h4 className="mt-2 truncate text-base font-semibold">{item.name}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.description || "لا يوجد وصف للمنتج حاليا."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-muted/40 px-2 py-1">{item.category}</span>
            <span className="rounded-md bg-muted/40 px-2 py-1">{item.subcategory}</span>
            <span className="rounded-md bg-muted/40 px-2 py-1">
              السعر الأصلي: {formatReferenceCurrency(originalUnitPrice)}
            </span>
            {productDiscountPercent > 0 && line.applyProductDiscount !== false ? (
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600">
                بعد خصم المنتج: {formatReferenceCurrency(unitPrice)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <ProductPicker
            label={`المنتج داخل ${contextLabel}`}
            value={line.itemId}
            onChange={(itemId) => onChange({ itemId })}
          />

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            التركيبة داخل {contextLabel}
            <AppSelect
              ariaLabel={`التركيبة داخل ${contextLabel}`}
              className="h-10"
              onValueChange={(variantId) => onChange({ variantId })}
              options={(item.variants ?? []).map((variant) => ({
                value: String(variant.id),
                label: variantLabel(item, String(variant.id)),
              }))}
              placeholder="اختر التركيبة"
              value={line.variantId ?? ""}
            />
            {!line.variantId && (item.variants?.length ?? 0) > 1 ? (
              <span className="text-[11px] font-semibold text-amber-600">
                المنتج له أكثر من تركيبة؛ اختر واحدة لتحديد السعر الصحيح.
              </span>
            ) : null}
          </label>

          {showProductDiscountControl && productDiscountPercent > 0 ? (
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
              <span>
                <span className="block text-xs font-semibold text-foreground">
                  تطبيق خصم المنتج ({productDiscountPercent}%)
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  يطبق أولًا، ثم يحسب خصم الباكدج على الإجمالي الناتج.
                </span>
              </span>
              <Switch
                checked={line.applyProductDiscount !== false}
                onCheckedChange={(checked) => onChange({ applyProductDiscount: checked })}
                aria-label={`تطبيق خصم المنتج على ${item.name}`}
              />
            </label>
          ) : null}

          <div className="grid grid-cols-[86px_minmax(0,1fr)_40px] items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              الكمية
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  onChange({ quantity: Number(event.target.value) || 1 })
                }
                className="h-10"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              إجمالي السطر
              <Input value={formatReferenceCurrency(lineTotal)} className="h-10" readOnly />
            </label>
            <MiniIconButton
              tone="red"
              ariaLabel={`حذف منتج من ${contextLabel}`}
              onClick={onRemove}
              disabled={!canRemove}
            >
          <Trash2 className="size-4" />
            </MiniIconButton>
          </div>
        </div>
      </div>

      <details className="mt-3 rounded-md border bg-muted/10 px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          عرض تفاصيل المنتج داخل {contextLabel}
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            سعر خاص داخل {contextLabel}
            <Input placeholder={formatReferenceCurrency(discountedPrice)} className="h-10" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            عنوان قصير للعميل
            <Input defaultValue={item.name} className="h-10" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground lg:col-span-2">
            وصف المنتج داخل العرض
            <textarea
              defaultValue={item.description}
              className="min-h-[82px] rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>
      </details>
    </div>
  );
}

export function CreateOfferPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { cities: serviceCities, loading: serviceCitiesLoading } = useServiceCities();
  const [editingOfferId, setEditingOfferId] = useState("");
  const [editingOffer, setEditingOffer] = useState<OfferCard | null>(null);
  const formMode = editingOfferId ? "edit" : "create";
  const [markets, setMarkets] = useState<OfferMarket[]>([]);
  const [allOfferProducts, setAllOfferProducts] = useState<ItemRow[]>([]);
  const [offerAppearsInGeneral, setOfferAppearsInGeneral] = useState(true);
  const [offerAppearsInServiceCity, setOfferAppearsInServiceCity] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [sendPushNotification, setSendPushNotification] = useState(false);
  const [pushSentAt, setPushSentAt] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState(editingOffer?.title ?? "");
  const [offerDescription, setOfferDescription] = useState("");
  const [selectedOfferCityIds, setSelectedOfferCityIds] = useState<string[]>([]);
  const offerImageObjectUrlRef = useRef<string | null>(null);
  const [offerImagePreview, setOfferImagePreview] = useState(editingOffer?.image ?? "");
  const [offerImageName, setOfferImageName] = useState(
    editingOffer?.image ? "صورة العرض الحالية" : "",
  );
  const [offerImageFile, setOfferImageFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<ArabicOfferType>(editingOffer?.type ?? "خصم");
  const [discountProductId, setDiscountProductId] = useState("");
  const [discountVariantId, setDiscountVariantId] = useState("");
  const [discountQuantity, setDiscountQuantity] = useState(1);
  const [discountPercent, setDiscountPercent] = useState("20");
  const [flashProductIds, setFlashProductIds] = useState<string[]>([]);
  const [flashVariantId, setFlashVariantId] = useState("");
  const [flashQuantity, setFlashQuantity] = useState(1);
  const [flashDiscountPercent, setFlashDiscountPercent] = useState("30");
  const [deliveryProductId, setDeliveryProductId] = useState("");
  const [deliveryVariantId, setDeliveryVariantId] = useState("");
  const [deliveryQuantity, setDeliveryQuantity] = useState(1);
  const [announcementUrl, setAnnouncementUrl] = useState("");
  const [announcementCtaLabel, setAnnouncementCtaLabel] = useState("تسوق الآن");
  const [announcementPriority, setAnnouncementPriority] = useState("0");
  const [announcementDisplaySeconds, setAnnouncementDisplaySeconds] = useState("15");
  const [packageDiscountPercent, setPackageDiscountPercent] = useState("15");
  const [bundleItems, setBundleItems] = useState<BundleLine[]>([]);
  const [packageProductsOpen, setPackageProductsOpen] = useState(false);
  const [packageProductSearchOpen, setPackageProductSearchOpen] = useState(false);
  const marketsForScope = useMemo(() => {
    return markets.filter(
      (market) => {
        if (market.status !== "active") return false;
        if (offerAppearsInGeneral && market.scope !== "general") return false;
        if (!offerAppearsInGeneral && market.scope !== "service_city") return false;
        if (!offerAppearsInServiceCity || !selectedOfferCityIds.length) return true;

        return selectedOfferCityIds.every((selectedCityId) =>
          market.serviceCityIds.some((cityId) => Number(cityId) === Number(selectedCityId)),
        );
      },
    );
  }, [markets, offerAppearsInGeneral, offerAppearsInServiceCity, selectedOfferCityIds]);
  const marketIdsForScope = useMemo(
    () => new Set(marketsForScope.map((market) => String(market.id))),
    [marketsForScope],
  );
  const offerProducts = useMemo(
    () =>
      allOfferProducts.filter((product) =>
        product.marketId ? marketIdsForScope.has(String(product.marketId)) : false,
      ),
    [allOfferProducts, marketIdsForScope],
  );
  const discountRate = clampDiscountPercent(Number(discountPercent) || 0);
  const flashDiscountRate = clampDiscountPercent(Number(flashDiscountPercent) || 0);
  const packageDiscountRate = clampDiscountPercent(Number(packageDiscountPercent) || 0);
  const packageSubtotal = bundleItems.reduce((total, line) => {
    const item = selectedItemFrom(offerProducts, line.itemId);
    return total + lineUnitPrice(item, line) * line.quantity;
  }, 0);
  const packageFinalPrice = packageSubtotal * (1 - packageDiscountRate / 100);
  const packageSaving = Math.max(packageSubtotal - packageFinalPrice, 0);
  const packageProductNames = bundleItems
    .map((line) => selectedItemFrom(offerProducts, line.itemId)?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 3)
    .join("، ");
  const packageProductIds = bundleItems.map((line) => line.itemId);
  const packageMarkets = Array.from(
    new Map(
      bundleItems
        .map((line) => selectedItemFrom(allOfferProducts, line.itemId))
        .filter((item): item is ItemRow => Boolean(item?.marketId))
        .map((item) => [String(item.marketId), item.shopName || `محل #${item.marketId}`]),
    ),
  );
  const packageMarketNames = packageMarkets.map(([, name]) => name).join("، ");
  const [initialScheduleValues] = useState(currentScheduleValues);
  const [startDate, setStartDate] = useState(initialScheduleValues.date);
  const [endDate, setEndDate] = useState(initialScheduleValues.date);
  const [openScheduleDate, setOpenScheduleDate] = useState<"start" | "end" | null>(null);
  const [openScheduleTime, setOpenScheduleTime] = useState<"start" | "end" | null>(null);
  const [startTime, setStartTime] = useState(initialScheduleValues.time);
  const [endTime, setEndTime] = useState(initialScheduleValues.time);
  const [useLimits, setUseLimits] = useState("");
  const [userLimit, setUserLimit] = useState("");
  const [serviceCityClearConfirmOpen, setServiceCityClearConfirmOpen] = useState(false);

  function setScheduleDateOpen(field: "start" | "end", open: boolean) {
    setOpenScheduleDate(open ? field : null);

    if (open) {
      setOpenScheduleTime(null);
    }
  }

  function setScheduleTimeOpen(field: "start" | "end", open: boolean) {
    setOpenScheduleTime(open ? field : null);

    if (open) {
      setOpenScheduleDate(null);
    }
  }

  function revokeOfferImageObjectUrl() {
    if (offerImageObjectUrlRef.current) {
      URL.revokeObjectURL(offerImageObjectUrlRef.current);
      offerImageObjectUrlRef.current = null;
    }
  }

  function handleOfferImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    revokeOfferImageObjectUrl();
    const nextPreview = URL.createObjectURL(file);
    offerImageObjectUrlRef.current = nextPreview;
    setOfferImagePreview(nextPreview);
    setOfferImageName(file.name);
    setOfferImageFile(file);
    event.target.value = "";
  }

  function removeOfferImage() {
    revokeOfferImageObjectUrl();
    setOfferImageFile(null);
    if (editingOffer?.image) {
      setOfferImagePreview(editingOffer.image);
      setOfferImageName("صورة العرض الحالية");
      return;
    }
    setOfferImagePreview("");
    setOfferImageName("");
  }

  useEffect(() => revokeOfferImageObjectUrl, []);

  function clearOfferProductSelection() {
    setDiscountProductId("");
    setDiscountVariantId("");
    setDiscountQuantity(1);
    setFlashProductIds([]);
    setFlashVariantId("");
    setFlashQuantity(1);
    setDeliveryProductId("");
    setDeliveryVariantId("");
    setDeliveryQuantity(1);
    setBundleItems([]);
    setPackageProductsOpen(false);
    setPackageProductSearchOpen(false);
  }

  function clearOfferProductSelectionWithReason() {
    if (selectedOfferItems().length) {
      showSnackbar({
        message: "تم مسح المنتجات المختارة لأن السوق أو مدن الظهور تغيرت. اختر منتجات متوافقة من السوق الحالي.",
      });
    }
    clearOfferProductSelection();
  }

  function setOfferGeneralEnabled(enabled: boolean) {
    setOfferAppearsInGeneral(enabled);
    if (enabled) {
      setOfferAppearsInServiceCity(false);
      setSelectedOfferCityIds([]);
    }
    clearOfferProductSelectionWithReason();
  }

  function setOfferServiceCityEnabled(enabled: boolean) {
    if (!enabled && selectedOfferCityIds.length) {
      setServiceCityClearConfirmOpen(true);
      return;
    }

    setOfferAppearsInServiceCity(enabled);
    if (enabled) {
      setOfferAppearsInGeneral(false);
    }
    if (!enabled) {
      setSelectedOfferCityIds([]);
    }
    clearOfferProductSelectionWithReason();
  }

  function confirmClearServiceCities() {
    setServiceCityClearConfirmOpen(false);
    setOfferAppearsInServiceCity(false);
    setSelectedOfferCityIds([]);
    clearOfferProductSelectionWithReason();
  }

  function changeOfferCity(cityId: string) {
    const nextCityIds = selectedOfferCityIds.includes(cityId) ? [] : [cityId];
    setSelectedOfferCityIds(nextCityIds);
    if (selectedType === "باكج" && nextCityIds.length) {
      const validMarketIds = new Set(
        markets
          .filter((market) => market.status === "active" && market.scope === "service_city")
          .filter((market) => market.serviceCityIds.some((id) => Number(id) === Number(cityId)))
          .map((market) => market.id),
      );
      setBundleItems((current) => {
        const kept = current.filter((line) => {
          const product = allOfferProducts.find((item) => item.id === line.itemId);
          return Boolean(product?.marketId && validMarketIds.has(String(product.marketId)));
        });
        if (kept.length !== current.length) {
          showSnackbar({ message: `تم حذف ${current.length - kept.length} منتج غير صالح لمدينة الخدمة الجديدة.` });
        }
        return kept;
      });
      return;
    }
    clearOfferProductSelectionWithReason();
  }

  function selectOfferType(nextType: ArabicOfferType) {
    if (offerTypeOptions.find((option) => option.label === nextType)?.disabled) {
      showSnackbar({ message: "نوع الإعلان معطل حاليا.", tone: "danger" });
      return;
    }

    setSelectedType(nextType);
  }

  function addBundleProduct(itemId: string) {
    const selectedItem = offerProducts.find((item) => item.id === itemId);

    if (!selectedItem) return;

    setBundleItems((currentLines) => {
      const existingLine = currentLines.find((line) => line.itemId === itemId);

      if (existingLine) {
        return currentLines.map((line) =>
          line.id === existingLine.id
            ? { ...line, quantity: Math.min(line.quantity + 1, 99) }
            : line,
        );
      }

      return [
        ...currentLines,
        {
          id: `bundle-${itemId}-${Date.now()}`,
          itemId,
          variantId: defaultVariantId(selectedItem),
          quantity: 1,
          applyProductDiscount: true,
        },
      ];
    });
    setPackageProductsOpen(true);
    setPackageProductSearchOpen(false);
    showSnackbar({ message: `تم إضافة ${selectedItem.name} للباكج.` });
  }

  function updateBundleLine(lineId: string, patch: Partial<BundleLine>) {
    setBundleItems((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              ...patch,
              variantId:
                patch.itemId && patch.itemId !== line.itemId
                  ? defaultVariantId(
                      offerProducts.find((item) => item.id === patch.itemId) ?? null,
                    )
                  : (patch.variantId ?? line.variantId),
              quantity: Math.max(1, Math.min(99, patch.quantity ?? line.quantity)),
            }
          : line,
      ),
    );
  }

  function removeBundleLine(lineId: string) {
    const removedLine = bundleItems.find((line) => line.id === lineId);
    const removedItem = removedLine
      ? selectedItemFrom(offerProducts, removedLine.itemId)
      : null;
    setBundleItems((currentLines) => currentLines.filter((line) => line.id !== lineId));
    if (removedItem) {
      showSnackbar({ message: `تم حذف ${removedItem.name} من الباكج.`, tone: "danger" });
    }
  }

  function selectedOfferLines(): BundleLine[] {
    if (selectedType === "باكج") return bundleItems;
    if (selectedType === "فلاش" && flashProductIds[0]) {
      return [{ id: "flash", itemId: flashProductIds[0], variantId: flashVariantId, quantity: flashQuantity, applyProductDiscount: true }];
    }
    if (selectedType === "توصيل" && deliveryProductId) {
      return [{ id: "delivery", itemId: deliveryProductId, variantId: deliveryVariantId, quantity: deliveryQuantity, applyProductDiscount: true }];
    }
    if (selectedType !== "إعلان" && discountProductId) {
      return [{ id: "discount", itemId: discountProductId, variantId: discountVariantId, quantity: discountQuantity, applyProductDiscount: true }];
    }
    return [];
  }

  function selectedOfferItems() {
    return selectedOfferLines()
      .map((line) => selectedItemFrom(offerProducts, line.itemId))
      .filter((item): item is ItemRow => Boolean(item));
  }

  async function saveOffer() {
    if (savingOffer) return;
    if (!offerTitle.trim()) {
      showSnackbar({ message: "العنوان مطلوب", tone: "danger" });
      return;
    }
    if (!offerAppearsInGeneral && !offerAppearsInServiceCity) {
      showSnackbar({ message: "اختر الظهور في العام أو المدن واحدة على الأقل.", tone: "danger" });
      return;
    }
    if (offerAppearsInGeneral && offerAppearsInServiceCity) {
      showSnackbar({ message: "اختر العام أو مدينة واحدة فقط.", tone: "danger" });
      return;
    }
    if (offerAppearsInServiceCity && !selectedOfferCityIds.length) {
      showSnackbar({ message: "اختر المدن", tone: "danger" });
      return;
    }
    if (selectedOfferCityIds.length > 1) {
      showSnackbar({ message: "يمكن اختيار مدينة واحدة فقط للعرض.", tone: "danger" });
      return;
    }
    if (selectedType !== "إعلان" && !marketsForScope.length) {
      showSnackbar({
        message:
          offerAppearsInGeneral && marketsForScope.length === 0
            ? "لا توجد محلات عامة. أنشئ محلًا عامًا من صفحة المحلات أولاً."
            : offerAppearsInServiceCity && selectedOfferCityIds.length && marketsForScope.length === 0
              ? "لا توجد محلات في هذه المدينة"
              : "تعذر تحديد سوق مناسب للعرض تلقائيًا.",
        tone: "danger",
      });
      return;
    }
    if (!selectedType) {
      showSnackbar({ message: "نوع العرض مطلوب", tone: "danger" });
      return;
    }
    if (selectedType === "إعلان") {
      try {
        const url = new URL(announcementUrl.trim());
        if (url.protocol !== "https:") throw new Error();
      } catch {
        showSnackbar({ message: "أدخل رابط HTTPS خارجيًا صحيحًا للإعلان.", tone: "danger" });
        return;
      }
    }
    const selectedLines = selectedOfferLines();
    const selectedItems = selectedOfferItems();
    const productIds = Array.from(
      new Set(selectedItems.map((item) => Number(item.id)).filter(Number.isFinite)),
    );
    if (selectedType !== "إعلان" && !productIds.length) {
      showSnackbar({ message: "اختر منتجًا واحدًا على الأقل", tone: "danger" });
      return;
    }
    const invalidVariantLine = selectedLines.find((line) => {
      const product = selectedItemFrom(offerProducts, line.itemId);
      return !product || !variantFromItem(product, line.variantId ?? "");
    });
    if (selectedType !== "إعلان" && invalidVariantLine) {
      showSnackbar({ message: "اختر تركيبة محددة لكل منتج داخل العرض.", tone: "danger" });
      return;
    }
    const selectedMarketIds = Array.from(
      new Set(
        selectedItems
          .map((item) => item.marketId)
          .filter((marketId): marketId is string => Boolean(marketId)),
      ),
    );
    if (selectedType !== "إعلان" && selectedType !== "باكج" && selectedMarketIds.length !== 1) {
      showSnackbar({ message: "هذا النوع من العروض يجب أن يكون تابعًا لمحل واحد.", tone: "danger" });
      return;
    }
    const inferredMarketId = selectedMarketIds[0] ?? "";
    const staleProductIds = productIds.filter((productId) =>
      !offerProducts.some((product) => Number(product.id) === productId),
    );
    if (selectedType !== "إعلان" && staleProductIds.length) {
      clearOfferProductSelectionWithReason();
      showSnackbar({
        message: "تم منع حفظ منتجات غير متوافقة مع السوق أو مدن الظهور الحالية.",
        tone: "danger",
      });
      return;
    }

    const discount =
        selectedType === "فلاش"
        ? flashDiscountPercent
        : selectedType === "باكج"
          ? packageDiscountPercent
          : selectedType === "خصم"
            ? discountPercent
            : "0";
    const discountNumber = Number(discount || 0);
    const selectedStartDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const now = new Date();
    const isImmediateExpiredOfferReactivation =
      formMode === "edit" &&
      editingOffer?.effectiveStatus === "expired" &&
      sendPushNotification &&
      selectedStartDateTime.getTime() > now.getTime() &&
      selectedStartDateTime.getTime() - now.getTime() <= 60_000;
    const startDateTime = isImmediateExpiredOfferReactivation
      ? new Date(now.getTime() - 1_000)
      : selectedStartDateTime;

    if (!Number.isFinite(discountNumber) || discountNumber < 0) {
      showSnackbar({ message: "قيمة الخصم يجب أن تكون صفر أو أكثر.", tone: "danger" });
      return;
    }
    if (!Number.isFinite(startDateTime.getTime()) || !Number.isFinite(endDateTime.getTime())) {
      showSnackbar({ message: "تأكد من تاريخ ووقت بداية ونهاية العرض.", tone: "danger" });
      return;
    }
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      showSnackbar({ message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية", tone: "danger" });
      return;
    }
    const startTimeIso = formatLocalIsoDateTime(startDateTime);
    const endTimeIso = formatLocalIsoDateTime(endDateTime);

    const payload = {
      ...(selectedType === "إعلان" ? {} : { market_id: Number(inferredMarketId) }),
      show_in_general: offerAppearsInGeneral,
      service_city_ids: offerAppearsInServiceCity
        ? selectedOfferCityIds.map((cityId) => Number(cityId))
        : [],
      product_ids: productIds,
      items: selectedLines.map((line) => ({
        variant_id: Number(line.variantId),
        quantity: line.quantity,
        apply_product_discount: line.applyProductDiscount !== false,
      })),
      title: offerTitle.trim(),
      description: offerDescription.trim(),
      type: offerTypeValues[selectedType],
      discount: discountNumber.toFixed(2),
      start_time: startTimeIso,
      end_time: endTimeIso,
      active_days: [],
      use_limits: useLimits ? Number(useLimits) : null,
      user_limit: userLimit ? Number(userLimit) : null,
      announcement_url: selectedType === "إعلان" ? announcementUrl.trim() : "",
      announcement_cta_label: selectedType === "إعلان" ? announcementCtaLabel.trim() : "",
      announcement_priority: selectedType === "إعلان" ? Number(announcementPriority || 0) : 0,
      announcement_display_seconds: selectedType === "إعلان" ? Number(announcementDisplaySeconds || 15) : 15,
      send_push_notification: sendPushNotification,
    };
    if (payload.use_limits === null) {
      payload.user_limit = null;
    }
    if (selectedType === "إعلان") {
      if (!Number.isInteger(payload.announcement_priority) || payload.announcement_priority < 0 || !Number.isInteger(payload.announcement_display_seconds) || payload.announcement_display_seconds < 1) {
        showSnackbar({ message: "أدخل أولوية صحيحة ومدة ظهور بالثواني أكبر من صفر.", tone: "danger" });
        return;
      }
      payload.use_limits = null;
      payload.user_limit = null;
    }
    if (
      (payload.use_limits !== null && (!Number.isFinite(payload.use_limits) || payload.use_limits <= 0)) ||
      (payload.user_limit !== null && (!Number.isFinite(payload.user_limit) || payload.user_limit <= 0))
    ) {
      showSnackbar({ message: "حدود الاستخدام يجب أن تكون أرقامًا موجبة.", tone: "danger" });
      return;
    }
    if (payload.use_limits !== null && payload.user_limit === null) {
      showSnackbar({ message: "أدخل الحد لكل عميل عند تفعيل حدود الاستخدام.", tone: "danger" });
      return;
    }

    setSavingOffer(true);
    try {
      const offerPath =
        formMode === "edit"
          ? `${adminApiPaths.offers}${encodeURIComponent(editingOfferId)}/`
          : adminApiPaths.offers;
      const method = formMode === "edit" ? "PATCH" : "POST";
      const response = await apiFetch(offerPath, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readApiData(response);
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, "تعذر حفظ العرض."));
      }
      const savedOffer = offerCardFromApi(data as BackendRecord);
      const savedOfferId = savedOffer.id;
      const imageUploadPromise = (async () => {
        if (!offerImageFile) return null;
        const imageFormData = new FormData();
        imageFormData.append("image", offerImageFile);
        const imageResponse = await apiFetch(
          `${adminApiPaths.offers}${encodeURIComponent(savedOfferId)}/image/`,
          { method: "POST", body: imageFormData },
        );
        const imageData = await readApiData(imageResponse);
        if (!imageResponse.ok) {
          const imageErrorRecord =
            imageData && typeof imageData === "object" && !Array.isArray(imageData)
              ? imageData as BackendRecord
              : null;
          const imageRequestId =
            typeof imageErrorRecord?.request_id === "string"
              ? imageErrorRecord.request_id
              : "";
          const imageErrorMessage = apiErrorMessage(imageData, "تعذر رفع صورة العرض.");
          throw new Error(
            imageRequestId
              ? `${imageErrorMessage} رقم التتبع: ${imageRequestId}`
              : imageErrorMessage,
          );
        }
        return offerCardFromApi(imageData as BackendRecord);
      })();
      const notificationPromise = (async () => {
        if (!sendPushNotification) return null;
        return await sendAdminJson(
          apiFetch,
          `${adminApiPaths.offers}${encodeURIComponent(savedOfferId)}/send-notification/`,
          { method: "POST", body: JSON.stringify({ request_id: crypto.randomUUID() }) },
        ) as BackendRecord;
      })();
      const [imageUploadResult, notificationResult] = await Promise.allSettled([
        imageUploadPromise,
        notificationPromise,
      ]);
      const imageUploadFailed = imageUploadResult.status === "rejected";
      const imageUploadError =
        imageUploadResult.status === "rejected" && imageUploadResult.reason instanceof Error
          ? imageUploadResult.reason.message
          : "تعذر رفع صورة العرض.";

      showSnackbar({
        message:
          imageUploadFailed
            ? formMode === "edit"
              ? `تم حفظ تعديل العرض، لكن ${imageUploadError}`
              : `تم إنشاء العرض، لكن ${imageUploadError}`
            : formMode === "edit"
            ? "تم حفظ تعديل العرض بنجاح."
            : "تم إنشاء العرض بنجاح.",
        tone: imageUploadFailed ? "danger" : "success",
      });
      if (sendPushNotification) {
        if (notificationResult.status === "fulfilled" && notificationResult.value) {
          const notificationCount = Number(notificationResult.value.notification_count ?? 0);
          showSnackbar({
            message:
              notificationCount > 0
                ? `تم إرسال الإشعار إلى ${notificationCount} عميل.`
                : "تم حفظ العرض، ولا يوجد عملاء مؤهلون للإشعار حاليًا.",
            tone: "success",
          });
        } else {
          const notificationError =
            notificationResult.status === "rejected" && notificationResult.reason instanceof Error
              ? notificationResult.reason.message
              : "تعذر إرسال الإشعار.";
          showSnackbar({
            message: `تم حفظ العرض، لكن ${notificationError}`,
            tone: "danger",
          });
        }
      }
      router.push("/offers");
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر حفظ العرض.",
        tone: "danger",
      });
    } finally {
      setSavingOffer(false);
    }
  }

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const nextEditingOfferId = searchParams.get("edit") ?? "";

      setEditingOfferId(nextEditingOfferId);

      if (!nextEditingOfferId) {
        const nextScheduleValues = currentScheduleValues();
        setOfferTitle("");
        setOfferDescription("");
        revokeOfferImageObjectUrl();
        setOfferImagePreview("");
        setOfferImageName("");
        setOfferImageFile(null);
        setOfferAppearsInGeneral(true);
        setOfferAppearsInServiceCity(false);
        setSelectedOfferCityIds([]);
        setSendPushNotification(false);
        setPushSentAt(null);
        clearOfferProductSelection();
        setStartDate(nextScheduleValues.date);
        setEndDate(nextScheduleValues.date);
        setStartTime(nextScheduleValues.time);
        setEndTime(nextScheduleValues.time);
        setOpenScheduleDate(null);
        setOpenScheduleTime(null);
      }
    }, 0);

    void apiFetch(adminApiPaths.markets)
      .then(async (response) => {
        const data = await readApiData(response);
        if (!response.ok) throw new Error("تعذر تحميل الأسواق.");
        if (!active) return;
        const nextMarkets = apiList(data)
          .map(offerMarketFromApi)
          .filter((market): market is OfferMarket => Boolean(market));
        setMarkets(nextMarkets);
      })
      .catch((error) => {
        if (active) showSnackbar({ message: error instanceof Error ? error.message : "تعذر تحميل الأسواق.", tone: "danger" });
      });

    void fetchAdminRows(apiFetch, adminApiPaths.products, productRowFromApi)
      .then((products) => {
        if (!active) return;
        setAllOfferProducts(products);
      })
      .catch((error) => {
        if (active) showSnackbar({ message: error instanceof Error ? error.message : "تعذر تحميل المنتجات.", tone: "danger" });
      });

    const searchParams = new URLSearchParams(window.location.search);
    const offerId = searchParams.get("edit");
    if (offerId) {
      void apiFetch(`${adminApiPaths.offers}${encodeURIComponent(offerId)}/`)
        .then(async (response) => {
          const data = await readApiData(response);
          if (!response.ok || !data || typeof data !== "object") {
            throw new Error("تعذر تحميل بيانات العرض.");
          }
          if (!active) return;
          const record = data as BackendRecord;
          const card = offerCardFromApi(record);
          const products = Array.isArray(record.products) ? record.products as BackendRecord[] : [];
          const productIds = Array.isArray(record.product_ids)
            ? record.product_ids.map(String)
            : products.map((product) => String(product.id));
          const rawItems = Array.isArray(record.items)
            ? record.items.filter((item): item is BackendRecord => Boolean(item && typeof item === "object"))
            : [];
          const offerLines: BundleLine[] = rawItems.map((item, index) => ({
            id: `offer-item-${String(item.id ?? index)}`,
            itemId: String(item.product_id ?? ""),
            variantId: String(item.variant_id ?? ""),
            quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
            applyProductDiscount: item.apply_product_discount !== false,
          })).filter((line) => line.itemId);
          const start = new Date(String(record.start_time));
          const end = new Date(String(record.end_time));
          setEditingOffer(card);
          setOfferTitle(card.title);
          setOfferDescription(String(record.description ?? ""));
          setSelectedType(card.type);
          setOfferAppearsInGeneral(card.showInGeneral);
          setOfferAppearsInServiceCity(!card.showInGeneral && card.serviceCityIds.length > 0);
          setSelectedOfferCityIds(card.showInGeneral ? [] : card.serviceCityIds.slice(0, 1));
          setSendPushNotification(card.sendPushNotification);
          setPushSentAt(card.pushSentAt);
          setOfferImageFile(null);
          setOfferImagePreview(card.image ?? "");
          setOfferImageName(card.image ? "صورة العرض الحالية" : "");
          setStartDate(formatDateInputValue(start));
          setStartTime(formatTimeInputValue(start));
          setEndDate(formatDateInputValue(end));
          setEndTime(formatTimeInputValue(end));
          setUseLimits(record.use_limits == null ? "" : String(record.use_limits));
          setUserLimit(record.user_limit == null ? "" : String(record.user_limit));
          setAnnouncementUrl(String(record.announcement_url ?? ""));
          setAnnouncementCtaLabel(String(record.announcement_cta_label ?? "تسوق الآن"));
          setAnnouncementPriority(String(record.announcement_priority ?? 0));
          setAnnouncementDisplaySeconds(String(record.announcement_display_seconds ?? 15));
          if (card.type === "فلاش") {
            const line = offerLines[0];
            setFlashProductIds(line ? [line.itemId] : productIds.slice(0, 1));
            setFlashVariantId(line?.variantId ?? "");
            setFlashQuantity(line?.quantity ?? 1);
            setFlashDiscountPercent(String(record.discount ?? "0"));
          } else if (card.type === "باكج") {
            setBundleItems(
              offerLines.length
                ? offerLines
                : productIds.map((itemId) => ({ id: `bundle-${itemId}`, itemId, variantId: "", quantity: 1, applyProductDiscount: true })),
            );
            setPackageDiscountPercent(String(record.discount ?? "0"));
          } else if (card.type === "توصيل") {
            const line = offerLines[0];
            setDeliveryProductId(line?.itemId ?? productIds[0] ?? "");
            setDeliveryVariantId(line?.variantId ?? "");
            setDeliveryQuantity(line?.quantity ?? 1);
          } else if (card.type !== "إعلان") {
            const line = offerLines[0];
            setDiscountProductId(line?.itemId ?? productIds[0] ?? "");
            setDiscountVariantId(line?.variantId ?? "");
            setDiscountQuantity(line?.quantity ?? 1);
            setDiscountPercent(String(record.discount ?? "0"));
          }
        })
        .catch((error) => {
          if (active) showSnackbar({ message: error instanceof Error ? error.message : "تعذر تحميل العرض.", tone: "danger" });
        });
    }

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [apiFetch, showSnackbar]);

  return (
    <OfferProductsContext.Provider
      value={{
        products: offerProducts,
        cities: serviceCities,
        citiesLoading: serviceCitiesLoading,
      }}
    >
    <div className="px-6 py-8">
      <PageTitle
        title={formMode === "edit" ? "تعديل العرض" : "إنشاء عرض"}
        description={
          formMode === "edit"
            ? `تعديل بيانات ${editingOffer?.title ?? "العرض"}`
            : selectedType === "إعلان"
              ? "اضبط رابط الإعلان، الجدولة، ومدة الظهور"
            : "اضبط نوع العرض، الجدولة، وحدود الاستخدام"
        }
        size="compact"
        actions={
          <>
            <Link
              href="/offers"
              className="inline-flex h-10 items-center justify-center gap-3 rounded-md border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
              <span>الرجوع للعروض</span>
            </Link>
            <Button
              className="h-10 px-5"
              disabled={savingOffer}
              onClick={saveOffer}
            >
              <CheckCircle2 className="size-4" />
              {savingOffer ? "جار الحفظ..." : formMode === "edit" ? "حفظ التعديل" : "إنشاء العرض"}
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-5">
        <div className="flex flex-col gap-5">
          <FormCard
            title="البيانات الأساسية"
            right={formMode === "edit" ? <RefBadge tone="blue">#{editingOffer?.id}</RefBadge> : null}
          >
            <div className="grid gap-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="العنوان بالعربي *">
                  <Input
                    dir="rtl"
                    value={offerTitle}
                    onChange={(event) => setOfferTitle(event.target.value)}
                    className="h-[92px] py-2 text-start"
                    placeholder="مثلاً: خصم 20% على البيتزا"
                  />
                </Field>
                <Field label="الوصف بالعربي">
                  <Textarea
                    dir="rtl"
                    minHeight="min-h-[92px]"
                    value={offerDescription}
                    onChange={(event) => setOfferDescription(event.target.value)}
                    placeholder="وصف مختصر يظهر للعميل..."
                  />
                </Field>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-3 lg:col-span-2">
                  <div className="text-sm font-medium">نطاق العرض *</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                      <span>
                        <span className="block text-sm font-semibold">يظهر في العام</span>
                      </span>
                      <Switch
                        checked={offerAppearsInGeneral}
                        disabled={offerAppearsInServiceCity}
                        onCheckedChange={setOfferGeneralEnabled}
                      />
                    </label>
                    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                      <span>
                        <span className="block text-sm font-semibold">يظهر في المدن</span>
                      </span>
                      <Switch
                        checked={offerAppearsInServiceCity}
                        disabled={offerAppearsInGeneral}
                        onCheckedChange={setOfferServiceCityEnabled}
                      />
                    </label>
                  </div>
                </div>
                {offerAppearsInServiceCity ? (
                  <div className="grid gap-3 lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">المدن</div>
                      <RefBadge tone="blue">{selectedOfferCityIds.length} مدينة</RefBadge>
                    </div>
                    <div>
                      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {serviceCitiesLoading ? (
                          <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground">
                            جاري تحميل المدن...
                          </div>
                        ) : serviceCities.length ? (
                          serviceCities.filter((city) => city.is_active !== false).map((city) => {
                            const cityId = String(city.id);
                            const selected = selectedOfferCityIds.includes(cityId);

                            return (
                              <button
                                key={city.id}
                                type="button"
                                aria-pressed={selected}
                                disabled={selectedOfferCityIds.length > 0 && !selected}
                                onClick={() => changeOfferCity(cityId)}
                                className={cn(
                                  "flex h-14 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold shadow-sm transition",
                                  selected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : selectedOfferCityIds.length > 0
                                      ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60"
                                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                                )}
                              >
                                <span className="truncate">{city.name}</span>
                                <span
                                  className={cn(
                                    "grid size-5 shrink-0 place-items-center rounded-full border",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-muted/40 text-transparent",
                                  )}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">
                            لا توجد مدن خدمة نشطة.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
                <label className="group relative flex aspect-[16/9] min-h-[138px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                  <input
                    accept="image/*"
                    className="sr-only"
                    onChange={handleOfferImageChange}
                    type="file"
                  />
                  {offerImagePreview ? (
                    <>
                      <DashboardImage
                        src={offerImagePreview}
                        placeholderType="offer"
                        alt="معاينة صورة العرض"
                        width={640}
                        height={360}
                        sizes="260px"
                        className="absolute inset-0 size-full"
                        imageClassName="object-cover"
                      />
                      <span className="absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/35" />
                      <span className="relative z-30 rounded-md bg-background/95 px-3 py-2 text-sm font-semibold opacity-0 shadow-sm transition group-hover:opacity-100">
                        تغيير الصورة
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center gap-2 px-5 text-sm text-muted-foreground">
                      <span className="flex size-10 items-center justify-center rounded-md bg-muted/50">
                        <ImagePlus className="size-5 text-primary" />
                      </span>
                      <span className="font-semibold text-foreground">اختيار صورة العرض</span>
                    </span>
                  )}
                </label>
                <div className="flex min-w-0 flex-col gap-3">
                  <div>
                    <div className="text-sm font-semibold">صورة العرض</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      استخدم صورة أفقية واضحة للبانر. الصيغ المدعومة PNG, JPG, WEBP.
                    </p>
                  </div>
                  <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate">
                      {offerImageName || "لم يتم اختيار صورة"}
                    </span>
                    {offerImagePreview ? (
                      <button
                        type="button"
                        onClick={removeOfferImage}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 px-3 py-1.5 font-semibold text-destructive transition hover:bg-destructive/10"
                      >
                        <X className="size-3.5" />
                        حذف الصورة
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </FormCard>

          <FormCard title="نوع العرض">
            <div>
              <div className="mb-3 text-sm font-medium">نوع العرض *</div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {offerTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const active = selectedType === option.label;
                  const disabled = Boolean(option.disabled);

                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => selectOfferType(option.label)}
                      className={cn(
                        "flex h-16 items-center gap-3 rounded-md border bg-background px-3 text-sm font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background",
                        active && "border-primary bg-primary/10 text-primary",
                      )}
                    >
                      <span className={cn("flex size-9 items-center justify-center rounded-md", option.bg, option.accent)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {disabled ? (
                          <span className="mt-0.5 block text-[10px] font-semibold text-muted-foreground">
                            معطل حاليا
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedType === "باكج" ? (
              <div key="package-settings" className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-4">
                  <Field label="نسبة خصم الباكج *">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={packageDiscountPercent}
                        onChange={(event) => setPackageDiscountPercent(event.target.value)}
                        className="h-10 ps-10"
                      />
                      <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        %
                      </span>
                    </div>
                  </Field>
                  <Field label="مجموع المنتجات">
                    <Input value={formatReferenceCurrency(packageSubtotal)} className="h-10" readOnly />
                  </Field>
                  <Field label="السعر بعد الخصم">
                    <Input value={formatReferenceCurrency(packageFinalPrice)} className="h-10" readOnly />
                  </Field>
                  <Field label="توفير العميل">
                    <Input value={formatReferenceCurrency(packageSaving)} className="h-10" readOnly />
                  </Field>
                </div>

                <div className="overflow-hidden rounded-md border bg-muted/10">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <button
                      type="button"
                      aria-expanded={packageProductsOpen}
                      onClick={() => setPackageProductsOpen((open) => !open)}
                      className="min-w-0 flex-1 rounded-md text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">منتجات الباكج</span>
                        <RefBadge tone="blue">{bundleItems.length} منتجات</RefBadge>
                        <RefBadge tone="blue">{packageMarkets.length} محل</RefBadge>
                        <RefBadge tone="gray">{formatReferenceCurrency(packageSubtotal)}</RefBadge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {packageMarketNames || packageProductNames || "اختار المنتجات اللي هتدخل في الباكج."}
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() => setPackageProductSearchOpen(true)}
                      >
                        <Plus className="size-4" />
                        إضافة منتج للباكج
                      </Button>
                      <button
                        type="button"
                        aria-expanded={packageProductsOpen}
                        onClick={() => setPackageProductsOpen((open) => !open)}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold text-primary shadow-sm transition hover:bg-accent"
                      >
                        {packageProductsOpen ? "إخفاء المنتجات" : "عرض المنتجات"}
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            packageProductsOpen && "rotate-180",
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {packageProductsOpen ? (
                    <div className="grid gap-3 border-t bg-background/30 p-3">
                      {bundleItems.map((line) => {
                        const item = selectedItemFrom(offerProducts, line.itemId);
                        if (!item) return null;
                        const lineTotal = lineUnitPrice(item, line) * line.quantity;

                        return (
                          <PackageProductCard
                            key={line.id}
                            line={line}
                            item={item}
                            lineTotal={lineTotal}
                            canRemove
                            showProductDiscountControl
                            onChange={(patch) => updateBundleLine(line.id, patch)}
                            onRemove={() => removeBundleLine(line.id)}
                          />
                        );
                      })}

                    </div>
                  ) : null}
                </div>
                <PackageProductSearchModal
                  open={packageProductSearchOpen}
                  selectedItemIds={packageProductIds}
                  onClose={() => setPackageProductSearchOpen(false)}
                  onSelect={addBundleProduct}
                />
              </div>
            ) : selectedType === "فلاش" ? (
              <div key="flash-settings" className="grid gap-4">
                <div className="grid gap-4">
                  <Field label="نسبة خصم الفلاش *">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={flashDiscountPercent}
                        onChange={(event) => setFlashDiscountPercent(event.target.value)}
                        className="h-10 ps-10"
                      />
                      <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
                    </div>
                  </Field>
                </div>
                <SingleOfferProductPanel
                  title="منتجات الفلاش"
                  description="اختار المنتج اللي هينطبق عليه خصم الفلاش، والمدة بتتحدد من الجدولة."
                  selectedItemId={flashProductIds[0] ?? ""}
                  onSelectItem={(itemId) => setFlashProductIds(itemId ? [itemId] : [])}
                  selectedVariantId={flashVariantId}
                  onSelectVariant={setFlashVariantId}
                  quantity={flashQuantity}
                  onChangeQuantity={setFlashQuantity}
                  badgeTone="yellow"
                  discountPercent={flashDiscountRate}
                  contextLabel="الفلاش"
                />
              </div>
            ) : selectedType === "توصيل" ? (
              <div key="delivery-settings" className="grid gap-4">
                <div className="grid gap-4">
                  <Field label="نوع عرض التوصيل">
                    <SelectBox className="h-10">توصيل مجاني</SelectBox>
                  </Field>
                </div>
                <SingleOfferProductPanel
                  title="منتجات التوصيل"
                  description="اختار المنتج اللي هيظهر عليه التوصيل المجاني، ويمكن اختيار منتج واحد فقط."
                  selectedItemId={deliveryProductId}
                  onSelectItem={setDeliveryProductId}
                  selectedVariantId={deliveryVariantId}
                  onSelectVariant={setDeliveryVariantId}
                  quantity={deliveryQuantity}
                  onChangeQuantity={setDeliveryQuantity}
                  badgeTone="green"
                  contextLabel="عرض التوصيل"
                />
              </div>
            ) : selectedType === "إعلان" ? (
              <div key="announcement-settings" className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <Field label="أولوية الظهور">
                    <Input type="number" min="0" value={announcementPriority} onChange={(event) => setAnnouncementPriority(event.target.value)} className="h-10" />
                  </Field>
                  <Field label="مدة العرض (ثانية)">
                    <Input type="number" min="1" value={announcementDisplaySeconds} onChange={(event) => setAnnouncementDisplaySeconds(event.target.value)} className="h-10" />
                  </Field>
                </div>
                <Field label="الرابط الخارجي (HTTPS) *">
                  <Input dir="rtl" type="url" className="h-10 text-right" placeholder="https://example.com/campaign" value={announcementUrl} onChange={(event) => setAnnouncementUrl(event.target.value)} />
                </Field>
                <Field label="نص زر الإعلان">
                  <Input className="h-10" value={announcementCtaLabel} onChange={(event) => setAnnouncementCtaLabel(event.target.value)} placeholder="تسوق الآن" />
                </Field>
              </div>
            ) : (
              <div key="discount-settings" className="grid gap-4">
                <div className="grid gap-4">
                  <Field label="نسبة الخصم *">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent}
                        onChange={(event) => setDiscountPercent(event.target.value)}
                        className="h-10 ps-10"
                      />
                      <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
                    </div>
                  </Field>
                </div>
                <SingleOfferProductPanel
                  title="منتجات الخصم"
                  description="اختار المنتج اللي هينطبق عليه الخصم، ويمكن اختيار منتج واحد فقط."
                  selectedItemId={discountProductId}
                  onSelectItem={setDiscountProductId}
                  selectedVariantId={discountVariantId}
                  onSelectVariant={setDiscountVariantId}
                  quantity={discountQuantity}
                  onChangeQuantity={setDiscountQuantity}
                  badgeTone="red"
                  discountPercent={discountRate}
                  contextLabel="الخصم"
                />
              </div>
            )}
          </FormCard>

          <FormCard title="إشعارات العرض">
            <label className="flex min-h-20 items-center justify-between gap-4 rounded-md border bg-background px-4 py-3 shadow-sm">
              <span>
                <span className="block text-sm font-semibold">إرسال إشعار للعملاء عند نشر العرض</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  سيصل الإشعار للعملاء الذين اختاروا نفس مدينة العرض.
                </span>
                {pushSentAt ? (
                  <span className="mt-1 block text-xs font-semibold text-emerald-600">
                    تم إرسال إشعار هذا العرض بالفعل.
                  </span>
                ) : null}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {pushSentAt ? <RefBadge tone="green">تم الإرسال</RefBadge> : null}
                <Switch
                  checked={sendPushNotification}
                  onCheckedChange={setSendPushNotification}
                />
              </div>
            </label>
          </FormCard>

          <FormCard title="الجدولة">
            <div className="grid gap-4 lg:grid-cols-4">
                  <Field label="تاريخ البداية *">
                    <ScheduleDateField
                      value={startDate}
                      onChange={setStartDate}
                      ariaLabel="تاريخ البداية"
                      rangeStart={startDate}
                      rangeEnd={endDate}
                      open={openScheduleDate === "start"}
                      onOpenChange={(open) => setScheduleDateOpen("start", open)}
                    />
                  </Field>
                  <Field label="تاريخ النهاية *">
                    <ScheduleDateField
                      value={endDate}
                      onChange={setEndDate}
                      ariaLabel="تاريخ النهاية"
                      rangeStart={startDate}
                      rangeEnd={endDate}
                      open={openScheduleDate === "end"}
                      onOpenChange={(open) => setScheduleDateOpen("end", open)}
                    />
                  </Field>
              <Field label="بداية الوقت">
                <ScheduleTimeField
                  value={startTime}
                  onChange={setStartTime}
                  ariaLabel="بداية الوقت"
                  open={openScheduleTime === "start"}
                  onOpenChange={(open) => setScheduleTimeOpen("start", open)}
                />
              </Field>
              <Field label="نهاية الوقت">
                <ScheduleTimeField
                  value={endTime}
                  onChange={setEndTime}
                  ariaLabel="نهاية الوقت"
                  open={openScheduleTime === "end"}
                  onOpenChange={(open) => setScheduleTimeOpen("end", open)}
                />
              </Field>
            </div>
          </FormCard>

            {selectedType !== "إعلان" ? <FormCard title="حدود الاستخدام">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="إجمالي الاستخدام">
                  <Input
                    className="h-10"
                    min="1"
                    onChange={(event) => setUseLimits(event.target.value)}
                    placeholder="غير محدود"
                    type="number"
                    value={useLimits}
                  />
                </Field>
                <Field label="الحد لكل عميل">
                  <Input
                    className="h-10"
                    min="1"
                    onChange={(event) => setUserLimit(event.target.value)}
                    placeholder="غير محدود"
                    type="number"
                    value={userLimit}
                  />
                </Field>
              </div>
            </FormCard> : null}
        </div>

      </div>
      {serviceCityClearConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-service-cities-title"
            className="w-full max-w-md overflow-hidden rounded-lg border bg-background shadow-2xl"
          >
            <div className="border-b px-5 py-4">
              <h2 id="clear-service-cities-title" className="text-base font-bold">
                مسح مدن الخدمة المختارة؟
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                إيقاف ظهور العرض في مدن الخدمة هيمسح المدن المختارة وأي منتجات مرتبطة بالنطاق الحالي.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceCityClearConfirmOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="button" variant="danger" onClick={confirmClearServiceCities}>
                مسح المدن
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </OfferProductsContext.Provider>
  );
}
