"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Loader2,
  PackageCheck,
  RefreshCw,
  Send,
  ShieldAlert,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import {
  dashboardOrdersChangedEvent,
  deliveryLaterLabel,
  formatEgyptPhoneForDisplay,
  getDeliveryAreaName as orderDeliveryAreaName,
  getDeliveryDestination,
  getDeliveryPriceLabel,
  getDashboardOrderTypeLabel,
  getManualArea,
  getManualCity,
  getMarketCount,
  getMarketSections,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  getServiceCityName as orderServiceCityName,
  isGeneralOrder,
  isMultiMarket,
  isServiceCityOrder,
  notifyDashboardOrdersChanged,
  type DashboardOrderLike,
} from "./order-display";
import { useDashboardNotifications } from "./notifications-context";
import { Badge, Button, CurrencyText } from "./primitives";
import { useSnackbar } from "./snackbar";
import { apiResponseData, firstApiError } from "./users/api-users";

type BlockerPhase =
  | "idle"
  | "checking"
  | "blocked"
  | "approving"
  | "selecting_representative"
  | "assigning"
  | "rejecting"
  | "error";

type ApiRecord = Record<string, unknown>;

type RepresentativeListResult = {
  present: boolean;
  representatives: ApiRecord[];
};

const pollIntervalMs = 180_000;
const hiddenRejectionReason = "تم رفض الطلب من الإدارة";

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function recordAt(record: ApiRecord, path: string[]) {
  let current: unknown = record;

  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }

  return isRecord(current) ? current : null;
}

function valueAt(record: ApiRecord, path: string[]) {
  let current: unknown = record;

  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }

  return current;
}

function textValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function textAt(record: ApiRecord, paths: string[][], fallback = "-") {
  for (const path of paths) {
    const value = textValue(valueAt(record, path));
    if (value) return value;
  }

  return fallback;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numberAt(record: ApiRecord, paths: string[][], fallback = 0) {
  for (const path of paths) {
    const value = numericValue(valueAt(record, path));
    if (value !== null) return value;
  }

  return fallback;
}

function boolValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "available", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "unavailable", "inactive"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function apiRecordList(value: unknown): ApiRecord[] {
  const list =
    Array.isArray(value)
      ? value
      : isRecord(value) && Array.isArray(value.results)
        ? value.results
        : isRecord(value) && Array.isArray(value.data)
          ? value.data
          : isRecord(value) && isRecord(value.data) && Array.isArray(value.data.results)
            ? value.data.results
            : [];

  return list.filter(isRecord);
}

function blockerOrders(value: unknown) {
  if (!isRecord(value)) return [];
  return Array.isArray(value.orders) ? value.orders.filter(isRecord) : [];
}

function orderId(order: ApiRecord | null) {
  if (!order) return "";
  return textAt(order, [["id"], ["order_id"], ["orderId"]], "");
}

function orderLike(order: ApiRecord): DashboardOrderLike {
  return order as DashboardOrderLike;
}

function customerName(order: ApiRecord) {
  const customer = recordAt(order, ["customer"]);
  if (customer) {
    const direct = textAt(customer, [["name"], ["full_name"], ["fullName"]], "");
    if (direct) return direct;

    const split = [
      textAt(customer, [["first_name"], ["firstName"]], ""),
      textAt(customer, [["last_name"], ["lastName"]], ""),
    ]
      .filter(Boolean)
      .join(" ");
    if (split) return split;
  }

  return textAt(order, [["customer_name"], ["customerName"], ["client_name"]]);
}

function marketName(order: ApiRecord) {
  return getOrderMarketsSummary(orderLike(order));
}

function marketBranch(order: ApiRecord) {
  return textAt(order, [["market", "branch"], ["branch"], ["market_branch"]]);
}

function serviceCityName(order: ApiRecord) {
  return orderServiceCityName(orderLike(order)) || "-";
}

function deliveryAreaName(order: ApiRecord) {
  return orderDeliveryAreaName(orderLike(order)) || getManualArea(orderLike(order)) || "";
}

function moneyLabel(value: unknown, missing = "-") {
  const number = numericValue(value);
  if (number === null) {
    const text = textValue(value);
    return text || missing;
  }

  return `${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EGP`;
}

function dateTimeLabel(value: unknown) {
  const text = textValue(value);
  if (!text) return "-";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function deliveryDetails(order: ApiRecord) {
  const typedOrder = orderLike(order);
  const fixedArea = isServiceCityOrder(typedOrder) && Boolean(orderDeliveryAreaName(typedOrder));

  if (isGeneralOrder(typedOrder)) {
    return {
      type: "دليفري يدوي",
      city: getManualCity(typedOrder),
      area: getManualArea(typedOrder),
      price: deliveryLaterLabel,
      destination: getDeliveryDestination(typedOrder),
      tone: "blue" as const,
    };
  }

  if (fixedArea) {
    return {
      type: "توصيل ثابت",
      city: serviceCityName(order),
      area: deliveryAreaName(order) || "-",
      price: getDeliveryPriceLabel(typedOrder),
      destination: getDeliveryDestination(typedOrder),
      tone: "green" as const,
    };
  }

  return {
    type: getDashboardOrderTypeLabel(typedOrder),
    city: serviceCityName(order),
    area: deliveryAreaName(order) || "-",
    price: deliveryLaterLabel,
    destination: getDeliveryDestination(typedOrder),
    tone: "blue" as const,
  };
}

function representativeListFromApprove(value: unknown): RepresentativeListResult {
  if (!isRecord(value)) return { present: false, representatives: [] };
  if (!Array.isArray(value.available_representatives)) {
    return { present: false, representatives: [] };
  }

  return {
    present: true,
    representatives: value.available_representatives.filter(isRecord),
  };
}

function representativeListFromResponse(value: unknown) {
  if (!isRecord(value)) return apiRecordList(value);
  if (Array.isArray(value.representatives)) {
    return value.representatives.filter(isRecord);
  }
  return apiRecordList(value);
}

function representativeId(representative: ApiRecord) {
  return textAt(representative, [["representative_id"], ["id"], ["user_id"], ["user", "id"]], "");
}

function representativeName(representative: ApiRecord) {
  const direct = textAt(representative, [["name"], ["full_name"], ["fullName"], ["user", "name"]], "");
  if (direct) return direct;

  const split = [
    textAt(representative, [["first_name"], ["user", "first_name"]], ""),
    textAt(representative, [["last_name"], ["user", "last_name"]], ""),
  ]
    .filter(Boolean)
    .join(" ");

  return split || `مندوب #${representativeId(representative) || "-"}`;
}

function representativePhone(representative: ApiRecord) {
  return textAt(representative, [["phone"], ["user", "phone"]]);
}

function representativeCity(representative: ApiRecord) {
  return textAt(representative, [
    ["service_city", "name"],
    ["service_city"],
    ["service_city_name"],
    ["delivery_area_name"],
    ["city", "name"],
  ]);
}

function representativeLoad(representative: ApiRecord) {
  const active = textAt(representative, [
    ["active_order_count"],
    ["current_order_count"],
    ["active_orders"],
    ["current_orders_count"],
  ], "");
  const capacity = textAt(representative, [["max_active_orders"], ["capacity"]], "");

  if (active && capacity) return `${active} / ${capacity}`;
  return active || capacity || "-";
}

function representativeAvailability(representative: ApiRecord) {
  const availability = boolValue(
    valueAt(representative, ["is_available"]) ??
      valueAt(representative, ["available"]) ??
      valueAt(representative, ["availability"]),
  );
  if (availability === true) return { label: "متاح", tone: "green" as const };
  if (availability === false) return { label: "غير متاح", tone: "red" as const };

  return {
    label: textAt(representative, [["availability"], ["status"]], "غير محدد"),
    tone: "secondary" as const,
  };
}

function localizedApiError(value: unknown, fallback: string) {
  if (isRecord(value) && "representative_id" in value) {
    const representativeMessage = firstApiError(value.representative_id);
    if (representativeMessage) return representativeMessage;
  }

  const message = firstApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("already") && normalized.includes("review")) {
    return "تمت مراجعة الطلب بالفعل. حدّث التنبيه.";
  }
  if (normalized.includes("approved before assignment") || normalized.includes("must be approved")) {
    return "يجب قبول الطلب قبل إسناده للمندوب.";
  }
  if (normalized.includes("same service city") || normalized.includes("service city")) {
    return "المندوب ليس في نفس مدينة خدمة الطلب.";
  }
  if (normalized.includes("unauthorized") || normalized.includes("authentication")) {
    return "انتهت الجلسة أو لا تملك صلاحية تنفيذ هذا الإجراء.";
  }

  return message;
}

function playAlarmBeep(context: AudioContext) {
  if (context.state !== "running") return;

  const now = context.currentTime;
  [0, 0.16, 0.32].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime([1240, 980, 1240][index], now + offset);
    filter.type = "highpass";
    filter.frequency.setValueAtTime(420, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.75, now + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.16);
  });
}

function useOrderReviewAlarm(active: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    runningRef.current = false;
    if (contextRef.current?.state === "running") {
      void contextRef.current.suspend().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startAlarm() {
      if (runningRef.current) return;

      try {
        const AudioContextConstructor =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextConstructor) return;

        const context = contextRef.current ?? new AudioContextConstructor();
        contextRef.current = context;

        if (context.state === "suspended") {
          await context.resume();
        }
        if (cancelled) return;

        playAlarmBeep(context);
        intervalRef.current = window.setInterval(
          () => playAlarmBeep(context),
          850,
        );
        runningRef.current = true;
      } catch {
        runningRef.current = false;
      }
    }

    function retryAlarm() {
      if (active && !runningRef.current) {
        void startAlarm();
      }
    }

    if (active) {
      void startAlarm();
      window.addEventListener("pointerdown", retryAlarm, { capture: true });
      window.addEventListener("keydown", retryAlarm, { capture: true });
    } else {
      stopAlarm();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", retryAlarm, { capture: true });
      window.removeEventListener("keydown", retryAlarm, { capture: true });
      stopAlarm();
    };
  }, [active, stopAlarm]);
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 min-h-5 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function InlineError({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-200",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function OrderDetails({ order }: { order: ApiRecord }) {
  const typedOrder = orderLike(order);
  const delivery = deliveryDetails(order);
  const total = moneyLabel(valueAt(order, ["total_price"]));
  const sections = getMarketSections(typedOrder);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="رقم الطلب" value={orderId(order) || "-"} />
        <DetailItem label="العميل" value={customerName(order)} />
        <DetailItem
          label="هاتف العميل"
          value={
            <span dir="ltr" className="[unicode-bidi:plaintext]">
              {formatEgyptPhoneForDisplay(textAt(order, [["customer", "phone"], ["customer_phone"], ["phone"]]))}
            </span>
          }
        />
        <DetailItem label="نوع الطلب" value={getDashboardOrderTypeLabel(typedOrder)} />
        <DetailItem label="محلات الطلب" value={marketName(order)} />
        <DetailItem label="عدد المحلات" value={String(getMarketCount(typedOrder) || "-")} />
        <DetailItem label="نوع التجميع" value={isMultiMarket(typedOrder) ? "متعدد المحلات" : "محل واحد"} />
        <DetailItem label="مدينة الخدمة" value={isGeneralOrder(typedOrder) ? "-" : serviceCityName(order)} />
        {isGeneralOrder(typedOrder) ? (
          <DetailItem label="المدينة اليدوية" value={getManualCity(typedOrder)} />
        ) : null}
        <DetailItem label={isGeneralOrder(typedOrder) ? "المنطقة اليدوية" : "الفرع"} value={isGeneralOrder(typedOrder) ? getManualArea(typedOrder) : marketBranch(order)} />
        <DetailItem
          label="عنوان التوصيل"
          value={delivery.destination}
        />
        <DetailItem
          label="الإجمالي"
          value={
            <CurrencyText className="tabular-nums text-emerald-700 dark:text-emerald-300">
              {total}
            </CurrencyText>
          }
        />
        <DetailItem
          label="تاريخ الإنشاء"
          value={dateTimeLabel(valueAt(order, ["created_at"]) ?? valueAt(order, ["createdAt"]))}
        />
      </div>

      <div className="rounded-md border border-border/70 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Truck className="size-4 text-primary" />
          <span className="font-bold">بيانات التوصيل</span>
          <Badge tone={delivery.tone}>{delivery.type}</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <DetailItem label="المدينة" value={delivery.city} />
          <DetailItem label="المنطقة" value={delivery.area} />
          <DetailItem label="سعر التوصيل" value={delivery.price} />
        </div>
      </div>

      {sections.length > 0 ? (
        <div className="rounded-md border border-border/70 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PackageCheck className="size-4 text-primary" />
            <span className="font-bold">محلات الطلب</span>
            <Badge tone={sections.length > 1 ? "green" : "secondary"}>
              {sections.length.toLocaleString("en-US")} {sections.length > 1 ? "محلات" : "محل"}
            </Badge>
          </div>
          <div className="grid gap-2">
            {sections.map((section, index) => {
              const marketNameText =
                textValue(section.market?.name_ar) ||
                textValue(section.market?.name) ||
                (section.market_id ? `محل #${section.market_id}` : `محل ${index + 1}`);
              const itemsCount = section.items?.length ?? 0;
              const offersCount = section.offers?.length ?? 0;

              return (
                <div
                  key={`${section.id ?? section.market_id ?? index}`}
                  className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{marketNameText}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    المنتجات: {itemsCount.toLocaleString("en-US")} - العروض: {offersCount.toLocaleString("en-US")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RepresentativeCard({
  representative,
  selected,
  disabled,
  onSelect,
}: {
  representative: ApiRecord;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const availability = representativeAvailability(representative);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "grid w-full gap-3 rounded-md border bg-card p-4 text-start shadow-sm transition hover:border-primary/40 hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-60",
        selected && "border-primary bg-primary/10 ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-4" />
            </span>
            <span className="truncate font-bold">{representativeName(representative)}</span>
            <Badge tone={availability.tone}>{availability.label}</Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground" dir="ltr">
            {representativePhone(representative)}
          </div>
        </div>
        {selected ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : null}
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <span className="rounded-md bg-muted px-2 py-1">
          ID: {representativeId(representative) || "-"}
        </span>
        <span className="rounded-md bg-muted px-2 py-1">
          المدينة: {representativeCity(representative)}
        </span>
        <span className="rounded-md bg-muted px-2 py-1">
          الطلبات: {representativeLoad(representative)}
        </span>
      </div>
    </button>
  );
}

export function AdminOrderReviewBlocker() {
  const { apiFetch, status, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { refreshUnreadCount } = useDashboardNotifications();
  const [phase, setPhase] = useState<BlockerPhase>("idle");
  const [blocked, setBlocked] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [orders, setOrders] = useState<ApiRecord[]>([]);
  const [representatives, setRepresentatives] = useState<ApiRecord[]>([]);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [representativesLoading, setRepresentativesLoading] = useState(false);
  const requestInFlightRef = useRef(false);
  const phaseRef = useRef<BlockerPhase>("idle");

  const currentOrder = orders[0] ?? null;
  const currentOrderId = orderId(currentOrder);
  const currentOrderIsGeneral = currentOrder ? isGeneralOrder(orderLike(currentOrder)) : false;
  const currentOrderNeedsRepresentative = Boolean(currentOrder);
  const shouldRun = status === "authenticated" && user?.role === "admin";
  const actionBusy =
    phase === "approving" ||
    phase === "selecting_representative" ||
    phase === "assigning" ||
    phase === "rejecting";
  const modalActive = blocked || actionBusy;

  useOrderReviewAlarm(modalActive);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!modalActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalActive]);

  const resetActionState = useCallback(() => {
    setRepresentatives([]);
    setSelectedRepresentativeId("");
    setConfirmReject(false);
    setRepresentativesLoading(false);
  }, []);

  const fetchPendingOrderDetails = useCallback(async () => {
    const response = await apiFetch("orders/?status=pending");
    const data = await apiResponseData(response);
    if (!response.ok) {
      throw new Error(localizedApiError(data, "تعذر تحميل تفاصيل الطلبات المعلقة."));
    }

    const list = apiRecordList(data);
    const pendingReview = list.filter((order) => {
      const reviewStatus = textAt(order, [["review_status"], ["reviewStatus"]], "")
        .toLowerCase();
      if (reviewStatus) return reviewStatus === "pending_review";

      return textAt(order, [["status"]], "").toLowerCase() === "pending";
    });

    return pendingReview.length ? pendingReview : list;
  }, [apiFetch]);

  const loadBlocker = useCallback(
    async ({
      silent = false,
      ignoreBusy = false,
    }: {
      silent?: boolean;
      ignoreBusy?: boolean;
    } = {}) => {
      if (!shouldRun) return;
      if (requestInFlightRef.current) return;
      if (!ignoreBusy && actionBusy) return;

      requestInFlightRef.current = true;
      if (!silent && !blocked) setPhase("checking");

      try {
        const response = await apiFetch("admin/order-review/blocker/");
        const data = await apiResponseData(response);

        if (response.status === 401 || response.status === 403) {
          setBlocked(false);
          setPendingCount(0);
          setOrders([]);
          setError(null);
          setPhase("idle");
          resetActionState();
          return;
        }

        if (!response.ok) {
          throw new Error(localizedApiError(data, "تعذر فحص طلبات المراجعة."));
        }
        if (!isRecord(data)) {
          throw new Error("استجابة فحص طلبات المراجعة غير مكتملة.");
        }

        const nextBlocked = Boolean(data.blocked);
        let nextOrders = blockerOrders(data);
        let detailsError: string | null = null;

        if (nextBlocked && nextOrders.length === 0) {
          try {
            nextOrders = await fetchPendingOrderDetails();
          } catch (reason) {
            detailsError =
              reason instanceof Error
                ? reason.message
                : "تعذر تحميل تفاصيل الطلبات المعلقة.";
          }
        }

        const nextPendingCount = numberAt(data, [["pending_count"], ["pendingCount"]], nextOrders.length);
        setBlocked(nextBlocked);
        setPendingCount(nextPendingCount);
        setOrders(nextBlocked ? nextOrders : []);
        setError(detailsError);

        if (nextBlocked) {
          setPhase("blocked");
          resetActionState();
        } else {
          setPhase("idle");
          resetActionState();
        }
      } catch (reason) {
        const message =
          reason instanceof Error ? reason.message : "تعذر فحص طلبات المراجعة.";

        if (blocked || phaseRef.current !== "idle") {
          setError(message);
          setPhase(blocked ? "blocked" : "error");
        } else {
          setError(null);
          setPhase("idle");
        }
      } finally {
        requestInFlightRef.current = false;
      }
    },
    [
      actionBusy,
      apiFetch,
      blocked,
      fetchPendingOrderDetails,
      resetActionState,
      shouldRun,
    ],
  );

  useEffect(() => {
    if (!shouldRun) return;

    function handleOrdersChanged() {
      void loadBlocker({ silent: true, ignoreBusy: true });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadBlocker({ silent: true });
      }
    }

    const initialTimer = window.setTimeout(() => {
      void loadBlocker({ silent: true });
    }, 0);
    const timer = window.setInterval(() => {
      void loadBlocker({ silent: true });
    }, pollIntervalMs);
    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadBlocker, shouldRun]);

  useEffect(() => {
    if (shouldRun) return;

    const timer = window.setTimeout(() => {
      setBlocked(false);
      setPendingCount(0);
      setOrders([]);
      setError(null);
      setPhase("idle");
      resetActionState();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [resetActionState, shouldRun]);

  const fetchRepresentatives = useCallback(
    async (targetOrderId: string) => {
      const response = await apiFetch(
        `admin/orders/${targetOrderId}/service-city-representatives/`,
      );
      const data = await apiResponseData(response);
      if (!response.ok) {
        throw new Error(localizedApiError(data, "تعذر تحميل مندوبين مدينة الخدمة."));
      }

      return representativeListFromResponse(data);
    },
    [apiFetch],
  );

  const approveCurrentOrder = useCallback(async () => {
    if (!currentOrderId) {
      setError("تعذر تحديد الطلب الحالي.");
      return;
    }

    setPhase("approving");
    setError(null);
    setConfirmReject(false);
    setRepresentatives([]);
    setSelectedRepresentativeId("");

    try {
      const response = await apiFetch(`admin/orders/${currentOrderId}/approve/`, {
        method: "POST",
      });
      const data = await apiResponseData(response);
      if (!response.ok) {
        throw new Error(localizedApiError(data, "تعذر قبول الطلب."));
      }
      notifyDashboardOrdersChanged(currentOrderId);

      const approvedRepresentatives = representativeListFromApprove(data);
      let nextRepresentatives = approvedRepresentatives.representatives;
      let representativesError: string | null = null;

      if (!approvedRepresentatives.present) {
        try {
          nextRepresentatives = await fetchRepresentatives(currentOrderId);
        } catch (reason) {
          representativesError =
            reason instanceof Error
              ? reason.message
              : "تعذر تحميل مندوبين مدينة الخدمة.";
        }
      }

      setRepresentatives(nextRepresentatives);
      setError(representativesError);
      setPhase("selecting_representative");
      void refreshUnreadCount();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر قبول الطلب.");
      setPhase("blocked");
    }
  }, [
    apiFetch,
    currentOrderId,
    fetchRepresentatives,
    refreshUnreadCount,
  ]);

  const refreshRepresentatives = useCallback(async () => {
    if (!currentOrderId) {
      setError("تعذر تحديد الطلب الحالي.");
      return;
    }

    setRepresentativesLoading(true);
    setError(null);
    try {
      const nextRepresentatives = await fetchRepresentatives(currentOrderId);
      setRepresentatives(nextRepresentatives);
      if (nextRepresentatives.length === 0) {
        setError(
          currentOrderIsGeneral
            ? "لا يوجد مندوبين متاحين حاليًا."
            : "لا يوجد مندوبين متاحين لهذه المدينة حاليًا.",
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر تحميل مندوبين مدينة الخدمة.",
      );
    } finally {
      setRepresentativesLoading(false);
    }
  }, [currentOrderId, currentOrderIsGeneral, fetchRepresentatives]);

  const assignRepresentative = useCallback(async () => {
    if (!currentOrderId) {
      setError("تعذر تحديد الطلب الحالي.");
      return;
    }
    if (!selectedRepresentativeId) {
      setError("اختر مندوبًا قبل إرسال الطلب.");
      return;
    }

    setPhase("assigning");
    setError(null);
    try {
      const representativeIdValue = numericValue(selectedRepresentativeId) ?? selectedRepresentativeId;
      const response = await apiFetch(`orders/${currentOrderId}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representative_id: representativeIdValue }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) {
        throw new Error(localizedApiError(data, "تعذر إسناد الطلب للمندوب."));
      }

      showSnackbar({
        message: "تم قبول الطلب وإرساله للمندوب.",
        tone: "success",
      });
      notifyDashboardOrdersChanged(currentOrderId);
      await Promise.all([
        loadBlocker({ silent: true, ignoreBusy: true }),
        refreshUnreadCount(),
      ]);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر إسناد الطلب للمندوب.",
      );
      setPhase("selecting_representative");
    }
  }, [
    apiFetch,
    currentOrderId,
    loadBlocker,
    refreshUnreadCount,
    selectedRepresentativeId,
    showSnackbar,
  ]);

  const saveApprovedOrder = useCallback(async () => {
    if (!currentOrderId) {
      setError("تعذر تحديد الطلب الحالي.");
      return;
    }

    setError(null);
    showSnackbar({
      message: "تم حفظ الطلب بدون إسناد مندوب.",
      tone: "success",
    });
    notifyDashboardOrdersChanged(currentOrderId);
    await Promise.all([
      loadBlocker({ silent: true, ignoreBusy: true }),
      refreshUnreadCount(),
    ]);
  }, [currentOrderId, loadBlocker, refreshUnreadCount, showSnackbar]);

  const rejectCurrentOrder = useCallback(async () => {
    if (!currentOrderId) {
      setError("تعذر تحديد الطلب الحالي.");
      return;
    }

    setPhase("rejecting");
    setError(null);
    try {
      const response = await apiFetch(`admin/orders/${currentOrderId}/reject/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: hiddenRejectionReason }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) {
        throw new Error(localizedApiError(data, "تعذر رفض الطلب."));
      }

      showSnackbar({
        message: "تم رفض الطلب.",
        tone: "success",
      });
      notifyDashboardOrdersChanged(currentOrderId);
      await Promise.all([
        loadBlocker({ silent: true, ignoreBusy: true }),
        refreshUnreadCount(),
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر رفض الطلب.");
      setPhase("blocked");
    }
  }, [apiFetch, currentOrderId, loadBlocker, refreshUnreadCount, showSnackbar]);

  const orderSummary = useMemo(() => {
    if (!currentOrder) return null;
    const delivery = deliveryDetails(currentOrder);

    return {
      id: orderId(currentOrder),
      customer: customerName(currentOrder),
      market: marketName(currentOrder),
      scope: getOrderScopeLabel(orderLike(currentOrder)),
      marketCount: getMarketCount(orderLike(currentOrder)),
      marketMode: isMultiMarket(orderLike(currentOrder)) ? "متعدد المحلات" : "محل واحد",
      total: moneyLabel(valueAt(currentOrder, ["total_price"])),
      delivery,
    };
  }, [currentOrder]);

  if (!shouldRun || !modalActive) return null;

  const loading =
    phase === "checking" ||
    phase === "approving" ||
    phase === "assigning" ||
    phase === "rejecting";
  const canUseMainActions = phase === "blocked" && Boolean(currentOrderId);
  const pendingLabel = pendingCount > 0 ? pendingCount : orders.length;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-none bg-foreground/60 px-4 py-5 backdrop-blur-sm sm:px-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-review-blocker-title"
        className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl items-center"
      >
        <div className="my-auto w-full overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl">
          <div className="border-b border-border bg-card px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="red">
                    <span className="inline-flex items-center gap-1.5">
                      <BellRing className="size-3.5" />
                      طلب جديد يحتاج مراجعة
                    </span>
                  </Badge>
                  <Badge tone="secondary">عدد الطلبات المعلقة: {pendingLabel}</Badge>
                </div>
                <h2
                  id="admin-order-review-blocker-title"
                  className="text-xl font-extrabold tracking-normal sm:text-2xl"
                >
                  مراجعة طلب قبل متابعة استخدام لوحة التحكم
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  يجب قبول الطلب أو رفضه قبل الرجوع للوحة التحكم، ويتم إسناد المندوب فقط للطلبات التي تحتاج ذلك.
                </p>
              </div>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300">
                <ShieldAlert className="size-6" />
              </span>
            </div>
          </div>

          <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-5 py-5 sm:px-6">
            {error ? <InlineError className="mb-4">{error}</InlineError> : null}

            {!currentOrder ? (
              <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                <div>
                  <AlertTriangle className="mx-auto size-9 text-destructive" />
                  <h3 className="mt-3 text-lg font-bold">تعذر عرض تفاصيل الطلب</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    يوجد طلب معلق حسب نظام الحظر، لكن تفاصيله غير متاحة للواجهة.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    disabled={loading}
                    onClick={() => void loadBlocker({ ignoreBusy: true })}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    إعادة الفحص
                  </Button>
                </div>
              </div>
            ) : currentOrderNeedsRepresentative &&
              (phase === "selecting_representative" || phase === "assigning") ? (
              <div className="grid gap-5">
                {orderSummary ? (
                  <div className="rounded-md border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <PackageCheck className="size-4 text-primary" />
                      <span className="font-bold">تم قبول الطلب</span>
                      <span dir="ltr" className="font-semibold text-primary">
                        #{orderSummary.id}
                      </span>
                      <span className="text-muted-foreground">
                        {orderSummary.customer} - {orderSummary.market}
                      </span>
                      <Badge tone="secondary">{orderSummary.scope}</Badge>
                      <Badge tone={orderSummary.marketMode === "متعدد المحلات" ? "green" : "secondary"}>
                        {orderSummary.marketMode}
                      </Badge>
                      <span className="text-muted-foreground">
                        عدد المحلات: {orderSummary.marketCount || "-"}
                      </span>
                      <Badge tone={orderSummary.delivery.tone}>{orderSummary.delivery.type}</Badge>
                      <span className="text-muted-foreground">
                        {orderSummary.delivery.destination}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold">اختيار المندوب</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentOrderIsGeneral
                          ? "طلب عام - اختر أي مندوب متاح يدوياً"
                          : "اختر مندوبًا من نفس مدينة الخدمة لإرسال الطلب."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={representativesLoading || phase === "assigning"}
                      onClick={() => void refreshRepresentatives()}
                    >
                      {representativesLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      تحديث المندوبين
                    </Button>
                  </div>

                  {representatives.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                      {currentOrderIsGeneral
                        ? "لا يوجد مندوبين متاحين حاليًا."
                        : "لا يوجد مندوبين متاحين لهذه المدينة حاليًا."}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {representatives.map((representative, index) => {
                        const id = representativeId(representative);
                        return (
                          <RepresentativeCard
                            key={id || index}
                            representative={representative}
                            selected={id === selectedRepresentativeId}
                            disabled={phase === "assigning"}
                            onSelect={() => setSelectedRepresentativeId(id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-5">
                <OrderDetails order={currentOrder} />

                {confirmReject ? (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                      <div>
                        <h3 className="font-bold text-red-700 dark:text-red-200">
                          هل أنت متأكد من رفض الطلب؟
                        </h3>
                        <p className="mt-1 text-sm text-red-700/80 dark:text-red-200/80">
                          سيتم رفض الطلب مباشرة بدون طلب سبب من الإدارة.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card px-5 py-4 sm:px-6">
            {currentOrderNeedsRepresentative &&
            (phase === "selecting_representative" || phase === "assigning") ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={phase === "assigning"}
                  onClick={() => void saveApprovedOrder()}
                >
                  <CheckCircle2 className="size-4" />
                  حفظ الطلب
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                  disabled={!selectedRepresentativeId || phase === "assigning"}
                  onClick={() => void assignRepresentative()}
                >
                  {phase === "assigning" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  إرسال للمندوب
                </Button>
              </div>
            ) : confirmReject ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={phase === "rejecting"}
                  onClick={() => setConfirmReject(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={phase === "rejecting"}
                  onClick={() => void rejectCurrentOrder()}
                >
                  {phase === "rejecting" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  تأكيد الرفض
                </Button>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void loadBlocker({ ignoreBusy: true })}
                >
                  {phase === "checking" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  تحديث
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={!canUseMainActions || loading}
                    onClick={() => setConfirmReject(true)}
                  >
                    <XCircle className="size-4" />
                    رفض الطلب
                  </Button>
                  <Button
                    type="button"
                    disabled={!canUseMainActions || loading}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                    onClick={() => void approveCurrentOrder()}
                  >
                    {phase === "approving" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    قبول الطلب
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
