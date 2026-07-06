export type OrderMoneyValue = string | number | null | undefined;

export type OrderNamedObject = {
  id?: string | number | null;
  name?: string | null;
  name_ar?: string | null;
  branch?: string | null;
  status?: string | null;
  delivery_price?: OrderMoneyValue;
  is_active?: boolean | null;
  service_city_id?: string | number | null;
};

export type OrderAddressLike = {
  id?: string | number | null;
  name?: string | null;
  details?: string | null;
  line1?: string | null;
  street?: string | null;
  manual_city?: string | null;
  manual_area?: string | null;
  service_city?: OrderNamedObject | null;
  service_city_id?: string | number | null;
  delivery_area?: OrderNamedObject | null;
  delivery_area_id?: string | number | null;
  delivery_type?: string | null;
  delivery_price_preview?: OrderMoneyValue;
};

export type OrderItemLike = {
  id?: string | number | null;
  section_id?: string | number | null;
  variant_id?: string | number | null;
  quantity?: string | number | null;
  unit_price?: OrderMoneyValue;
  subtotal?: OrderMoneyValue;
  product_name?: string | null;
  variant_name?: string | null;
  variant?: {
    id?: string | number | null;
    sku?: string | null;
    price?: OrderMoneyValue;
    product?: {
      id?: string | number | null;
      name?: string | null;
      market?: OrderNamedObject | null;
    } | null;
  } | null;
  product?: {
    id?: string | number | null;
    name?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
};

export type OrderOfferLike = {
  id?: string | number | null;
  section_id?: string | number | null;
  offer_id?: string | number | null;
  title?: string | null;
  discount_amount?: OrderMoneyValue;
  created_at?: string | null;
  offer?: {
    id?: string | number | null;
    title?: string | null;
    description?: string | null;
    type?: string | null;
    discount?: OrderMoneyValue;
  } | null;
};

export type OrderMarketSectionLike = {
  id?: string | number | null;
  market_id?: string | number | null;
  market?: OrderNamedObject | null;
  subtotal_price?: OrderMoneyValue;
  discount?: OrderMoneyValue;
  total_price?: OrderMoneyValue;
  pickup_status?: string | null;
  picked_up_at?: string | null;
  sort_order?: string | number | null;
  items?: OrderItemLike[] | null;
  offers?: OrderOfferLike[] | null;
};

export type OrderPickupStopLike = {
  market_id?: string | number | null;
  market?: OrderNamedObject | null;
  pickup_status?: string | null;
  picked_up_at?: string | null;
  sort_order?: string | number | null;
};

export type DashboardOrderLike = {
  id?: string | number | null;
  market_id?: string | number | null;
  market?: OrderNamedObject | null;
  order_scope?: string | null;
  service_city?: OrderNamedObject | null;
  service_city_id?: string | number | null;
  delivery_area?: OrderNamedObject | null;
  delivery_area_id?: string | number | null;
  delivery_address?: OrderAddressLike | null;
  delivery_type?: string | null;
  delivery_price?: OrderMoneyValue;
  subtotal_price?: OrderMoneyValue;
  discount?: OrderMoneyValue;
  total_price?: OrderMoneyValue;
  is_multi_market?: boolean | null;
  market_count?: string | number | null;
  market_names_summary?: string | null;
  market_sections?: OrderMarketSectionLike[] | null;
  grouped_items?: unknown;
  grouped_offers?: unknown;
  pickup_stops?: OrderPickupStopLike[] | null;
  items?: OrderItemLike[] | null;
  offers?: OrderOfferLike[] | null;
};

export const unknownLabel = "غير محدد";
export const deliveryLaterLabel = "يحدد لاحقاً";

export const orderStatusLabels = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  under_preparation: "قيد التجهيز",
  ready: "جاهز للإسناد",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  failed_delivery: "تعذر التوصيل",
  cancelled: "ملغي",
} as const;

export const orderReviewStatusLabels = {
  pending_review: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
} as const;

export function cleanText(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatOrderMoney(value: OrderMoneyValue, missing = deliveryLaterLabel) {
  const amount = numberValue(value);
  if (amount === null) {
    const text = cleanText(value);
    return text || missing;
  }

  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EGP`;
}

export function objectName(value: OrderNamedObject | null | undefined) {
  return cleanText(value?.name_ar) || cleanText(value?.name);
}

export function isGeneralOrder(order: DashboardOrderLike) {
  return cleanText(order.order_scope).toLowerCase() === "general";
}

export function isServiceCityOrder(order: DashboardOrderLike) {
  return cleanText(order.order_scope).toLowerCase() === "service_city";
}

export function getOrderScopeLabel(order: DashboardOrderLike) {
  if (isGeneralOrder(order)) return "عام";
  if (isServiceCityOrder(order)) return "مدينة خدمة";
  return cleanText(order.order_scope) || unknownLabel;
}

export function getDeliveryTypeLabel(order: DashboardOrderLike) {
  const deliveryType = cleanText(order.delivery_type).toLowerCase();
  if (deliveryType === "fixed_area") return "توصيل ثابت";
  if (deliveryType === "delivery" || deliveryType === "manual_quote") {
    return isServiceCityOrder(order) && !getDeliveryAreaName(order)
      ? "دليفري يدوي داخل مدينة خدمة"
      : "دليفري يدوي";
  }
  return cleanText(order.delivery_type) || unknownLabel;
}

export function getDeliveryPriceLabel(order: DashboardOrderLike) {
  if (order.delivery_price === null || order.delivery_price === undefined || order.delivery_price === "") {
    return deliveryLaterLabel;
  }
  return formatOrderMoney(order.delivery_price);
}

export function getServiceCityName(order: DashboardOrderLike) {
  return (
    objectName(order.service_city) ||
    objectName(order.delivery_address?.service_city)
  );
}

export function getDeliveryAreaName(order: DashboardOrderLike) {
  return (
    objectName(order.delivery_area) ||
    objectName(order.delivery_address?.delivery_area)
  );
}

export function getAddressDetails(order: DashboardOrderLike) {
  const address = order.delivery_address;
  return (
    cleanText(address?.details) ||
    cleanText(address?.line1) ||
    cleanText(address?.street) ||
    cleanText(address?.name)
  );
}

function unknownList(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function unknownRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function groupedMarketSections(order: DashboardOrderLike): OrderMarketSectionLike[] {
  const sections = new Map<string, OrderMarketSectionLike>();

  function ensureSection(value: unknown, index: number) {
    const record = unknownRecord(value);
    if (!record) return null;
    const market = unknownRecord(record.market) as OrderNamedObject | null;
    const marketId = record.market_id ?? market?.id ?? `group-${index}`;
    const key = cleanText(marketId) || `group-${index}`;
    const existing = sections.get(key);
    if (existing) return existing;

    const section: OrderMarketSectionLike = {
      id: key,
      market_id: marketId as string | number | null,
      market,
      subtotal_price: null,
      discount: null,
      total_price: null,
      pickup_status: null,
      picked_up_at: null,
      sort_order: index,
      items: [],
      offers: [],
    };
    sections.set(key, section);
    return section;
  }

  unknownList(order.grouped_items).forEach((value, index) => {
    const section = ensureSection(value, index);
    const record = unknownRecord(value);
    if (!section || !record) return;
    section.items = unknownList(record.items) as OrderItemLike[];
  });

  unknownList(order.grouped_offers).forEach((value, index) => {
    const section = ensureSection(value, index);
    const record = unknownRecord(value);
    if (!section || !record) return;
    section.offers = unknownList(record.offers) as OrderOfferLike[];
  });

  return Array.from(sections.values()).sort((first, second) => {
    const firstOrder = numberValue(first.sort_order) ?? 0;
    const secondOrder = numberValue(second.sort_order) ?? 0;
    return firstOrder - secondOrder;
  });
}

export function getMarketSections(order: DashboardOrderLike): OrderMarketSectionLike[] {
  if (Array.isArray(order.market_sections) && order.market_sections.length > 0) {
    return order.market_sections;
  }

  const groupedSections = groupedMarketSections(order);
  if (groupedSections.length > 0) return groupedSections;

  const hasFlatLines =
    (Array.isArray(order.items) && order.items.length > 0) ||
    (Array.isArray(order.offers) && order.offers.length > 0);
  if (!order.market && !hasFlatLines) return [];

  return [
    {
      id: "fallback",
      market_id: order.market_id ?? order.market?.id ?? null,
      market: order.market ?? null,
      subtotal_price: order.subtotal_price,
      discount: order.discount,
      total_price: order.total_price,
      pickup_status: null,
      picked_up_at: null,
      sort_order: 0,
      items: order.items ?? [],
      offers: order.offers ?? [],
    },
  ];
}

export function getMarketCount(order: DashboardOrderLike) {
  const explicitCount = numberValue(order.market_count);
  if (explicitCount !== null && explicitCount > 0) return explicitCount;
  const sections = getMarketSections(order);
  if (sections.length > 0) return sections.length;
  return order.market ? 1 : 0;
}

export function getOrderMarketsSummary(order: DashboardOrderLike) {
  const explicit = cleanText(order.market_names_summary);
  if (explicit) return explicit;

  const sectionNames = getMarketSections(order)
    .map((section) => objectName(section.market))
    .filter(Boolean);
  if (sectionNames.length > 0) return sectionNames.join(", ");

  return objectName(order.market) || unknownLabel;
}

export function isMultiMarket(order: DashboardOrderLike) {
  return Boolean(order.is_multi_market) || getMarketCount(order) > 1;
}

export function getPickupStops(order: DashboardOrderLike): OrderPickupStopLike[] {
  if (Array.isArray(order.pickup_stops) && order.pickup_stops.length > 0) {
    return order.pickup_stops;
  }

  return getMarketSections(order).map((section) => ({
    market_id: section.market_id,
    market: section.market,
    pickup_status: section.pickup_status,
    picked_up_at: section.picked_up_at,
    sort_order: section.sort_order,
  }));
}

export function getPickupStatusLabel(value: unknown) {
  const status = cleanText(value).toLowerCase();
  if (status === "picked_up") return "تم الاستلام";
  if (status === "pending") return "في انتظار الاستلام";
  return cleanText(value) || "في انتظار الاستلام";
}

export function getDeliveryDestination(order: DashboardOrderLike) {
  const address = order.delivery_address;
  const details = getAddressDetails(order);

  if (isGeneralOrder(order)) {
    return [
      cleanText(address?.manual_city),
      cleanText(address?.manual_area),
      details,
    ].filter(Boolean).join(" - ") || unknownLabel;
  }

  const city = getServiceCityName(order);
  const area = getDeliveryAreaName(order) || cleanText(address?.manual_area);
  return [city, area, details].filter(Boolean).join(" - ") || unknownLabel;
}

export function getManualCity(order: DashboardOrderLike) {
  return cleanText(order.delivery_address?.manual_city) || "-";
}

export function getManualArea(order: DashboardOrderLike) {
  return cleanText(order.delivery_address?.manual_area) || "-";
}
