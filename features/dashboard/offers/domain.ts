import type { ComponentType } from "react";
import { Megaphone, Package, Percent, Truck, Zap } from "lucide-react";

import type { BackendRecord } from "../admin-api";

type OfferType = "package" | "flash" | "discount" | "announcement" | "delivery";
type OfferStatus = "active" | "inactive" | "expired";
type OfferEffectiveStatus = OfferStatus | "scheduled";
type OfferScope = "general" | "service_city";
type ActiveDay =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

type OfferDisplayStatus = "نشط" | "متوقف" | "مجدول" | "منتهي";

export const offerTypeOptions = [
  { label: "باكج", icon: Package, accent: "text-sky-400", bg: "bg-sky-500/15", disabled: false },
  { label: "فلاش", icon: Zap, accent: "text-amber-400", bg: "bg-amber-500/15", disabled: false },
  { label: "خصم", icon: Percent, accent: "text-rose-400", bg: "bg-rose-500/15", disabled: false },
  { label: "توصيل", icon: Truck, accent: "text-emerald-400", bg: "bg-emerald-500/15", disabled: false },
  { label: "إعلان", icon: Megaphone, accent: "text-fuchsia-400", bg: "bg-fuchsia-500/15", disabled: false },
] as const satisfies readonly {
  label: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  bg: string;
  disabled?: boolean;
}[];

export type ArabicOfferType = (typeof offerTypeOptions)[number]["label"];

function offerVisualMeta(type: string) {
  return offerTypeOptions.find((option) => option.label === type) ?? offerTypeOptions[2];
}

export type OfferCard = {
  id: string;
  title: string;
  description: string;
  type: ArabicOfferType;
  apiType: OfferType;
  discount: string;
  method: string;
  status: OfferDisplayStatus;
  backendStatus: OfferStatus;
  effectiveStatus: OfferEffectiveStatus;
  canSendNotification: boolean;
  lastNotificationSentAt: string | null;
  notificationSendCount: number;
  sendPushNotification: boolean;
  pushSentAt: string | null;
  showInGeneral: boolean;
  scope: OfferScope;
  marketId: string;
  marketName: string;
  serviceCityId: string;
  serviceCityName: string;
  serviceCityIds: string[];
  serviceCityNames: string[];
  productIds: string[];
  productNames: string[];
  activeDays: ActiveDay[];
  useLimits: string;
  userLimit: string;
  period: string;
  startsAt: string;
  endsAt: string;
  image?: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  iconBg: string;
  archivedAt: string | null;
  deletionMode: "delete" | "archive";
};

export type OfferMarket = {
  id: string;
  name: string;
  scope: OfferScope;
  status: string;
  serviceCityIds: string[];
};

const offerTypeLabels: Record<OfferType, ArabicOfferType> = {
  package: "باكج",
  flash: "فلاش",
  discount: "خصم",
  announcement: "إعلان",
  delivery: "توصيل",
};

export const offerTypeValues: Record<ArabicOfferType, OfferType> = {
  باكج: "package",
  فلاش: "flash",
  خصم: "discount",
  إعلان: "announcement",
  توصيل: "delivery",
};

export function offerDateLifecycle(startsAt: string, endsAt: string, now = Date.now()) {
  const startTime = new Date(startsAt).getTime();
  const endTime = new Date(endsAt).getTime();

  if (Number.isFinite(endTime) && endTime < now) return "expired";
  if (Number.isFinite(startTime) && startTime > now) return "scheduled";
  return "current";
}

function isOfferType(value: unknown): value is OfferType {
  return (
    value === "package" ||
    value === "flash" ||
    value === "discount" ||
    value === "announcement" ||
    value === "delivery"
  );
}

function isOfferStatus(value: unknown): value is OfferStatus {
  return value === "active" || value === "inactive" || value === "expired";
}

function isOfferEffectiveStatus(value: unknown): value is OfferEffectiveStatus {
  return isOfferStatus(value) || value === "scheduled";
}

function isActiveDay(value: unknown): value is ActiveDay {
  return (
    value === "sunday" ||
    value === "monday" ||
    value === "tuesday" ||
    value === "wednesday" ||
    value === "thursday" ||
    value === "friday" ||
    value === "saturday"
  );
}

function recordDisplayName(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as BackendRecord;
    for (const key of ["name_ar", "name", "title"]) {
      const text = record[key];
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return fallback;
}

export function offerMarketFromApi(record: BackendRecord): OfferMarket | null {
  const id = record.id == null ? "" : String(record.id);
  if (!id) return null;
  const serviceCities = Array.isArray(record.service_cities)
    ? record.service_cities.filter((city): city is BackendRecord =>
        Boolean(city && typeof city === "object"),
      )
    : [];

  return {
    id,
    name: recordDisplayName(record, `سوق #${id}`),
    scope: record.scope === "service_city" ? "service_city" : "general",
    status: String(record.status ?? "active").toLowerCase(),
    serviceCityIds: serviceCities
      .map((city) => String(city.id ?? ""))
      .filter(Boolean),
  };
}

export function offerCardFromApi(record: BackendRecord): OfferCard {
  const apiType = isOfferType(record.type) ? record.type : "discount";
  const type = offerTypeLabels[apiType];
  const meta = offerVisualMeta(type);
  const startsAt = String(record.start_time ?? "");
  const endsAt = String(record.end_time ?? "");
  const rawStatus = String(record.status ?? "active").toLowerCase();
  const backendStatus = isOfferStatus(rawStatus) ? rawStatus : "active";
  const rawEffectiveStatus = String(record.effective_status ?? "").toLowerCase();
  const dateLifecycle = offerDateLifecycle(startsAt, endsAt);
  const effectiveStatus: OfferEffectiveStatus = isOfferEffectiveStatus(rawEffectiveStatus)
    ? rawEffectiveStatus
    : backendStatus === "inactive"
      ? "inactive"
      : dateLifecycle === "current"
        ? "active"
        : dateLifecycle;
  const market = record.market && typeof record.market === "object" ? (record.market as BackendRecord) : null;
  const serviceCities = Array.isArray(record.service_cities)
    ? record.service_cities.filter((city): city is BackendRecord =>
        Boolean(city && typeof city === "object"),
      )
    : [];
  const products = Array.isArray(record.products)
    ? record.products.filter((product): product is BackendRecord =>
        Boolean(product && typeof product === "object"),
      )
    : [];
  const productIds = Array.isArray(record.product_ids)
    ? record.product_ids.map(String)
    : products.map((product) => String(product.id ?? "")).filter(Boolean);
  const activeDays = Array.isArray(record.active_days)
    ? record.active_days.map(String).filter(isActiveDay)
    : [];
  const serviceCityIds = Array.isArray(record.service_city_ids)
    ? record.service_city_ids.map(String)
    : serviceCities.map((city) => String(city.id ?? "")).filter(Boolean);
  const serviceCityNames = serviceCities
    .map((city) => recordDisplayName(city, city.id ? `مدينة #${city.id}` : ""))
    .filter(Boolean);

  return {
    id: String(record.id),
    title: String(record.title ?? `عرض #${record.id}`),
    description: String(record.description ?? ""),
    type,
    apiType,
    discount: String(record.discount ?? "0"),
    method: "تطبيق تلقائي",
    status: effectiveStatus === "active" ? "نشط" : effectiveStatus === "inactive" ? "متوقف" : effectiveStatus === "scheduled" ? "مجدول" : "منتهي",
    backendStatus,
    effectiveStatus,
    canSendNotification: Boolean(record.can_send_notification),
    lastNotificationSentAt: typeof record.last_notification_sent_at === "string" ? record.last_notification_sent_at : null,
    notificationSendCount: Number(record.notification_send_count ?? 0),
    sendPushNotification: Boolean(record.send_push_notification),
    pushSentAt: typeof record.push_sent_at === "string" ? record.push_sent_at : null,
    showInGeneral: Boolean(record.show_in_general),
    scope: serviceCityIds.length && !record.show_in_general ? "service_city" : "general",
    marketId: String(record.market_id ?? market?.id ?? ""),
    serviceCityId: serviceCityIds[0] ?? "",
    serviceCityName: serviceCityNames.length ? serviceCityNames.join("، ") : "-",
    marketName: recordDisplayName(market, record.market_id ? `سوق #${record.market_id}` : "-"),
    serviceCityIds: Array.isArray(record.service_city_ids)
      ? record.service_city_ids.map(String)
      : serviceCities.map((city) => String(city.id ?? "")).filter(Boolean),
    serviceCityNames: serviceCities
      .map((city) => recordDisplayName(city, city.id ? `مدينة #${city.id}` : ""))
      .filter(Boolean),
    productIds,
    productNames: products.map((product) => recordDisplayName(product, `منتج #${product.id ?? ""}`)).filter(Boolean),
    activeDays,
    useLimits: record.use_limits == null ? "غير محدود" : String(record.use_limits),
    userLimit: record.user_limit == null ? "غير محدود" : String(record.user_limit),
    period: `${startsAt ? new Date(startsAt).toLocaleDateString("ar-EG") : "—"} → ${endsAt ? new Date(endsAt).toLocaleDateString("ar-EG") : "—"}`,
    startsAt,
    endsAt,
    image: typeof record.image === "string" ? record.image : undefined,
    icon: meta.icon,
    accent: meta.accent,
    iconBg: meta.bg,
    archivedAt: typeof record.archived_at === "string" ? record.archived_at : null,
    deletionMode: record.deletion_mode === "archive" ? "archive" : "delete",
  };
}

