"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import type { TooltipContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/features/auth/auth-provider";
import {
  formatMoney,
  formatPercent,
  getDashboardOverview,
  safeNumber,
  translateOrderStatus,
  type BackendRecord,
  type DashboardOverview,
} from "../admin-api";
import {
  getMarketCount,
  getOrderMarketsSummary,
  type DashboardOrderLike,
} from "../order-display";
import {
  AnimatedChartWrapper,
  AnimatedNumber,
  AnimatedProgressBar,
} from "../animations";
import { AnimatedCircularStatCard } from "../animated-circular-stat-card";
import { Button, Card, CardHeader, HoverTooltip, PageTitle } from "../primitives";
import { useDashboardI18n } from "../i18n";
import { cn } from "@/lib/utils";

const revenueDotColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const dashboardEmptyState: DashboardOverview = {
  currency: "EGP",
  revenue: { total: 0, percentage: 0 },
  orders: { total: 0, completed: 0, incomplete: 0, completion_rate: 0 },
  customers: { new: 0, returning: 0, return_rate: 0 },
  top_products: [],
  active_orders: [],
  top_shops: [],
};

function valueText(record: BackendRecord | undefined, keys: string[], fallback = "") {
  if (!record) return fallback;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return fallback;
}

function firstValue(record: BackendRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && !value.trim()) continue;
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function fullNameFromNested(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const record = value as BackendRecord;
  const name = valueText(record, ["name"]);
  const fullName = [
    valueText(record, ["first_name"]),
    valueText(record, ["last_name"]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || fullName || valueText(record, ["username"]);
}

function clampedPercent(value: unknown) {
  return Math.min(Math.max(safeNumber(value), 0), 100);
}

function recordList(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is BackendRecord => Boolean(item && typeof item === "object"),
      )
    : [];
}

function productChartData(items: BackendRecord[]) {
  return items.map((item, index) => {
    const name = valueText(item, ["name", "product_name", "title"], "منتج");

    return {
      chartName: name.length > 14 ? `${name.slice(0, 14).trimEnd()}...` : name,
      name,
      revenue: safeNumber(firstValue(item, ["revenue", "total_revenue"])),
      orders: safeNumber(firstValue(item, ["orders_count", "order_count"])),
      sold: safeNumber(firstValue(item, ["quantity_sold", "quantity"])),
      key: `${name}-${index}`,
    };
  });
}

function activeOrderData(items: BackendRecord[]) {
  return items.map((order, index) => {
    const nestedCustomerName =
      fullNameFromNested(order.customer) || fullNameFromNested(order.user);
    const customerName =
      valueText(order, ["customer_name", "user_name"]) ||
      nestedCustomerName ||
      "عميل";
    const code =
      valueText(order, ["number", "order_number", "code", "description"]) ||
      `ORD-${valueText(order, ["id"], String(index + 1))}`;
    const orderId = valueText(order, ["id", "order_id"]);
    const orderLike = order as DashboardOrderLike;
    const marketSummary =
      valueText(order, ["market_names_summary"]) || getOrderMarketsSummary(orderLike);
    const marketCount = getMarketCount(orderLike);

    return {
      key: `${code}-${index}`,
      code,
      customerName,
      marketSummary,
      marketCount,
      href: orderId ? `/orders/view/${encodeURIComponent(orderId)}` : "/orders",
      amount: safeNumber(firstValue(order, ["total_price", "total", "amount"])),
      status: translateOrderStatus(order.status),
    };
  });
}

function topShopData(items: BackendRecord[]) {
  return items
    .map((shop, index) => {
      const name = valueText(shop, ["name", "market_name", "shop_name"], "محل");
      const branch = valueText(shop, ["branch", "branch_name"]);
      const zone = valueText(shop, ["zone"]);
      const revenue = safeNumber(firstValue(shop, ["revenue", "total_revenue"]));
      const orders = safeNumber(firstValue(shop, ["orders_count", "order_count"]));
      const average = safeNumber(firstValue(shop, ["average_items_per_order"]));

      return {
        key: `${name}-${index}`,
        rank: index + 1,
        name: branch ? `${name} - ${branch}` : name,
        zone,
        revenue,
        orders,
        average: Number.isFinite(average) ? average : 0,
      };
    })
    .sort((left, right) => right.revenue - left.revenue)
    .map((shop, index) => ({ ...shop, rank: index + 1 }));
}

function TopCategoriesCard({
  currency,
  shops,
}: {
  currency: string;
  shops: BackendRecord[];
}) {
  const { direction, numberLocale, t } = useDashboardI18n();
  const displayItems = topShopData(shops);
  const totalRevenue = displayItems.reduce((total, item) => total + item.revenue, 0);
  const currencyPrefix = `${currency} `;
  const currencySuffix = "";
  const progressColorClass = "bg-cyan-500";
  const rankBadgeClass =
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200";
  const zoneBadgeClass =
    "rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-[15px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200";
  const shopMeta = (item: (typeof displayItems)[number]) => {
    const parts = [
      `${item.orders.toLocaleString(numberLocale)} ${t("common.orders")}`,
    ];

    if (item.orders > 0) {
      const average = item.average.toLocaleString(numberLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      parts.push(
        `${t("overview.topItems.averageItems")} ${average} / ${t("common.order")}`,
      );
    }

    return parts.join(" · ");
  };
  const maxValue = Math.max(...displayItems.map((item) => item.revenue), 0);

  return (
    <Card className="mt-6 border-border bg-card text-card-foreground shadow-sm">
      <div
        className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between"
        dir={direction}
      >
        <div className="text-start">
          <div className="text-base font-bold leading-5 text-card-foreground">
            {t("overview.topItems.title")}
          </div>
          <div className="mt-1 text-sm leading-5 text-muted-foreground">
            {t("overview.topItems.revenueTab")}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-6" dir={direction}>
        <div className="text-start">
          <div className="text-sm leading-5 text-muted-foreground">
            {t("overview.topItems.totalRevenue")}
          </div>
          <div className="mt-1 text-3xl font-bold leading-9 text-card-foreground">
            <AnimatedNumber
              value={totalRevenue}
              decimals={2}
              locale={numberLocale}
              prefix={currencyPrefix}
              suffix={currencySuffix}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3.5">
          {displayItems.length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              لا توجد بيانات محلات في هذه الفترة
            </div>
          ) : null}
          {displayItems.map((item, index) => {
            const progress = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0;
            const delay = 120 + index * 70;

            return (
              <div key={item.key}>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        rankBadgeClass,
                      )}
                    >
                      {item.rank}
                    </div>
                    <div className="min-w-0 text-start">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-base font-semibold leading-5 text-card-foreground">
                          {item.name}
                        </span>
                        {item.zone ? (
                          <span className={zoneBadgeClass}>{item.zone}</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                        {shopMeta(item)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 pb-1 text-left text-sm font-bold leading-5 text-card-foreground">
                    <AnimatedNumber
                      value={item.revenue}
                      decimals={2}
                      delay={delay}
                      locale={numberLocale}
                      prefix={currencyPrefix}
                      suffix={currencySuffix}
                    />
                  </div>
                </div>
                <div
                  className="flex h-2 w-full justify-end overflow-hidden rounded-full bg-muted"
                  dir="ltr"
                >
                  <AnimatedProgressBar
                    value={progress}
                    className={cn("h-full rounded-full", progressColorClass)}
                    delay={delay}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function RevenueTooltip({
  active,
  label,
  payload,
  currency,
}: TooltipContentProps & { currency: string }) {
  const { numberLocale, t } = useDashboardI18n();

  if (!active || !payload?.length) {
    return null;
  }

  const value = Number(payload[0]?.value ?? 0);
  const item = payload[0]?.payload as
    | { sold?: number; orders?: number }
    | undefined;

  return (
    <div className="grid min-w-[9rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{label}</div>
      <div className="font-semibold" dir="ltr">
        {formatMoney(value, currency).replace(" ", "\u00A0")}
      </div>
      {item ? (
        <div className="text-muted-foreground">
          {typeof item.sold === "number"
            ? `${item.sold.toLocaleString(numberLocale)} ${t("overview.topItems.sold")}`
            : null}
          {typeof item.orders === "number"
            ? ` · ${item.orders.toLocaleString(numberLocale)} ${t("common.orders")}`
            : null}
        </div>
      ) : null}
    </div>
  );
}

function MetricTooltip({
  title,
  value,
  detail,
}: {
  title: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="font-semibold">{title}</div>
      <div className="font-bold" dir="ltr">
        {value}
      </div>
      {detail ? <div className="text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function UpdateCadenceLabel({
  children,
  cadence,
}: {
  children: React.ReactNode;
  cadence: React.ReactNode;
}) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-2">
      <span>{children}</span>
      <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-[15px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
        {cadence}
      </span>
    </span>
  );
}

function OrdersKpiCard({
  orders,
  height = "h-[388px]",
}: {
  orders: DashboardOverview["orders"];
  height?: string;
}) {
  const { numberLocale, t } = useDashboardI18n();
  const completedOrders = safeNumber(orders?.completed);
  const incompleteOrders = safeNumber(orders?.incomplete);
  const totalOrders = safeNumber(orders?.total);
  const completionRate = clampedPercent(orders?.completion_rate);

  return (
    <Card className={cn("flex flex-col shadow", height)}>
      <CardHeader
        title={t("overview.ordersSummary.title")}
        description={
          <UpdateCadenceLabel cadence={t("overview.period.daily")}>
            {t("overview.ordersSummary.subtitle")}
          </UpdateCadenceLabel>
        }
      />
      <div className="flex flex-1 flex-col justify-center px-6 pb-6 pt-3">
        <HoverTooltip
          content={
            <MetricTooltip
              title={t("overview.ordersSummary.label")}
              value={totalOrders.toLocaleString(numberLocale)}
              detail={`${completedOrders.toLocaleString(numberLocale)} ${t("common.completed")} / ${incompleteOrders.toLocaleString(numberLocale)} ${t("common.incomplete")}`}
            />
          }
          className="mx-auto w-full max-w-[300px] text-center"
        >
          <div className="text-4xl font-bold leading-none text-foreground">
            <AnimatedNumber
              value={totalOrders}
              locale={numberLocale}
              delay={80}
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {t("overview.ordersSummary.label")}
          </div>
        </HoverTooltip>

        <div className="mx-auto mt-8 w-full max-w-[300px] space-y-4">
          <HoverTooltip
            content={
              <MetricTooltip
                title={t("overview.ordersSummary.completionRate")}
                value={`${completionRate.toLocaleString(numberLocale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}%`}
                detail={`${completedOrders.toLocaleString(numberLocale)} ${t("common.completed")} / ${incompleteOrders.toLocaleString(numberLocale)} ${t("common.incomplete")}`}
              />
            }
          >
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {t("overview.ordersSummary.completionRate")}
                </span>
                <span className="font-semibold">
                  <AnimatedNumber
                    value={completionRate}
                    decimals={1}
                    suffix="%"
                    delay={80}
                    locale={numberLocale}
                  />
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <AnimatedProgressBar
                  value={completionRate}
                  className="h-full rounded-full bg-[var(--chart-2)]"
                  delay={80}
                />
              </div>
            </div>
          </HoverTooltip>

          <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
            <HoverTooltip
              content={
                <MetricTooltip
                  title={t("common.completed")}
                  value={completedOrders.toLocaleString(numberLocale)}
                  detail={t("overview.ordersSummary.label")}
                />
              }
            >
              <div className="text-center">
                <div className="font-semibold">
                  <AnimatedNumber
                    value={completedOrders}
                    delay={80}
                    locale={numberLocale}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("common.completed")}
                </div>
              </div>
            </HoverTooltip>
            <HoverTooltip
              content={
                <MetricTooltip
                  title={t("common.incomplete")}
                  value={incompleteOrders.toLocaleString(numberLocale)}
                  detail={t("overview.ordersSummary.label")}
                />
              }
            >
              <div className="text-center">
                <div className="font-semibold">
                  <AnimatedNumber
                    value={incompleteOrders}
                    delay={80}
                    locale={numberLocale}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("common.incomplete")}
                </div>
              </div>
            </HoverTooltip>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RevenuePerformanceChart({
  currency,
  products,
}: {
  currency: string;
  products: BackendRecord[];
}) {
  const revenueChartData = productChartData(products);

  if (revenueChartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
        لا توجد بيانات منتجات في هذه الفترة
      </div>
    );
  }

  return (
    <div
      data-chart="chart-revenue-performance"
      className="flex h-full w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-layer]:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60 [&_.recharts-surface]:outline-none"
    >
      <style>
        {`[data-chart=chart-revenue-performance] {
  --color-revenue: var(--chart-1);
}

.dark [data-chart=chart-revenue-performance] {
  --color-revenue: var(--chart-1);
}

@keyframes revenue-bar-rise {
  from {
    opacity: 0;
    transform: scaleY(0.82);
  }

  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

[data-chart=chart-revenue-performance] .recharts-bar-rectangle {
  animation: revenue-bar-rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transform-box: fill-box;
  transform-origin: center bottom;
}

@media (prefers-reduced-motion: reduce) {
  [data-chart=chart-revenue-performance] .recharts-bar-rectangle {
    animation: none;
    opacity: 1;
    transform: none;
  }
}`}
      </style>
      <AnimatedChartWrapper className="h-full w-full">
        {() => (
          <ResponsiveContainer minWidth={0} minHeight={0}>
            <BarChart
              data={revenueChartData}
              barCategoryGap="28%"
              margin={{ top: 18, right: 14, bottom: 0, left: 14 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.72}
              />
              <XAxis
                dataKey="chartName"
                axisLine={false}
                height={36}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickMargin={10}
                tickLine={false}
              />
              <YAxis hide domain={[0, "dataMax + 220"]} tickCount={4} />
              <Tooltip
                content={(props) => (
                  <RevenueTooltip {...props} currency={currency} />
                )}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar
                dataKey="revenue"
                radius={[8, 8, 3, 3]}
                maxBarSize={54}
                isAnimationActive={false}
              >
                {revenueChartData.map((item, index) => (
                  <Cell
                    key={`${item.chartName}-${index}`}
                    fill={revenueDotColors[index % revenueDotColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </AnimatedChartWrapper>
    </div>
  );
}

type DateField = "from" | "to";

type DateRange = {
  from: Date;
  to: Date;
};

function createMonthFormatter(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
}

function createDateButtonFormatter(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function createWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const sunday = new Date(2026, 4, 24);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return formatter.format(date);
  });
}

function sameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function atStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(value: Date) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function createDefaultDateRange(): DateRange {
  const today = atStartOfDay(new Date());

  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: today,
  };
}

function isInRange(date: Date, range: DateRange) {
  const time = atStartOfDay(date).getTime();
  return (
    time >= atStartOfDay(range.from).getTime() &&
    time <= atStartOfDay(range.to).getTime()
  );
}

function getCalendarCells(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = firstDay.getDay();
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    const date = new Date(year, month, dayNumber);

    return {
      date,
      currentMonth: date.getMonth() === month,
    };
  });
}

function OverviewDateActions({
  range,
  loading,
  onRangeChange,
  onRefresh,
}: {
  range: DateRange;
  loading: boolean;
  onRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
}) {
  const { direction, numberLocale, t } = useDashboardI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeField, setActiveField] = useState<DateField | null>(null);

  useEffect(() => {
    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setActiveField(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveField(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function updateDate(field: DateField, date: Date) {
    const nextDate = atStartOfDay(date);

    onRangeChange({
      ...range,
      [field]: nextDate,
    });
    setActiveField(null);
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label={t("common.dateRangeFilter")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground">{t("common.from")}</span>
        <DatePickerButton
          field="from"
          label={t("common.startDate")}
          date={range.from}
          range={range}
          activeField={activeField}
          onOpenChange={setActiveField}
          onSelect={updateDate}
          direction={direction}
          locale={numberLocale}
        />
        <span className="text-muted-foreground">-</span>
        <span className="text-foreground">{t("common.to")}</span>
        <DatePickerButton
          field="to"
          label={t("common.endDate")}
          date={range.to}
          range={range}
          activeField={activeField}
          onOpenChange={setActiveField}
          onSelect={updateDate}
          direction={direction}
          locale={numberLocale}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 w-[116px] self-start"
        disabled={loading}
        onClick={onRefresh}
      >
        <RefreshCcw
          className={cn(
            "size-4",
            loading && "animate-spin",
          )}
        />
        {loading ? t("common.loading") : t("common.refresh")}
      </Button>
    </div>
  );
}

function DatePickerButton({
  field,
  label,
  date,
  range,
  activeField,
  onOpenChange,
  onSelect,
  direction,
  locale,
}: {
  field: DateField;
  label: string;
  date: Date;
  range: DateRange;
  activeField: DateField | null;
  onOpenChange: (field: DateField | null) => void;
  onSelect: (field: DateField, date: Date) => void;
  direction: "rtl" | "ltr";
  locale: string;
}) {
  const open = activeField === field;
  const dateButtonFormatter = useMemo(
    () => createDateButtonFormatter(locale),
    [locale],
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "h-10 w-[186px] justify-between bg-background text-start font-normal text-foreground",
          open && "border-primary text-primary ring-1 ring-primary/20",
        )}
        onClick={() => onOpenChange(open ? null : field)}
      >
        <span className="truncate">{dateButtonFormatter.format(date)}</span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {open ? (
        <DatePickerPopover
          field={field}
          selectedDate={date}
          range={range}
          onSelect={onSelect}
          direction={direction}
          locale={locale}
        />
      ) : null}
    </div>
  );
}

function DatePickerPopover({
  field,
  selectedDate,
  range,
  onSelect,
  direction,
  locale,
}: {
  field: DateField;
  selectedDate: Date;
  range: DateRange;
  onSelect: (field: DateField, date: Date) => void;
  direction: "rtl" | "ltr";
  locale: string;
}) {
  const { t } = useDashboardI18n();
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const cells = useMemo(() => getCalendarCells(viewDate), [viewDate]);
  const monthFormatter = useMemo(() => createMonthFormatter(locale), [locale]);
  const weekdayLabels = useMemo(() => createWeekdayLabels(locale), [locale]);

  function moveMonth(offset: number) {
    setViewDate((currentDate) => {
      return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + offset,
        1,
      );
    });
  }

  return (
    <div
      className={cn(
        "absolute top-[calc(100%+8px)] z-40 w-[308px] rounded-lg border bg-background p-3 text-foreground shadow-xl",
        direction === "rtl" ? "right-0" : "left-0",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label={t("common.previousMonth")}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => moveMonth(-1)}
        >
          <ChevronRight className="size-4" />
        </button>
        <div className="text-sm font-semibold">
          {monthFormatter.format(viewDate)}
        </div>
        <button
          type="button"
          aria-label={t("common.nextMonth")}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => moveMonth(1)}
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {weekdayLabels.map((day) => (
          <div key={day} className="flex h-8 items-center justify-center">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map(({ date, currentMonth }) => {
          const selected = sameDate(date, selectedDate);
          const rangeEdge = sameDate(date, range.from) || sameDate(date, range.to);
          const insideRange = isInRange(date, range);

          return (
            <button
              type="button"
              key={date.toISOString()}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                !currentMonth && "text-muted-foreground/45",
                insideRange && "bg-primary/10 text-primary",
                rangeEdge && "font-semibold",
                selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
              onClick={() => onSelect(field, date)}
            >
              {date.getDate().toLocaleString(locale)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { apiFetch } = useAuth();
  const { direction, numberLocale, t } = useDashboardI18n();
  const [range, setRange] = useState<DateRange>(() => createDefaultDateRange());
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didLoadInitialData = useRef(false);
  const MoreArrow = direction === "rtl" ? ArrowLeft : ArrowRight;
  const data = dashboardData ?? dashboardEmptyState;
  const currency = data.currency?.trim() || "EGP";
  const currencyPrefix = `${currency} `;
  const currencySuffix = "";
  const revenueTotal = safeNumber(data.revenue?.total);
  const revenuePercentage = clampedPercent(data.revenue?.percentage);
  const customersReturnRate = clampedPercent(data.customers?.return_rate);
  const newCustomers = safeNumber(data.customers?.new);
  const returningCustomers = safeNumber(data.customers?.returning);
  const activeOrders = activeOrderData(recordList(data.active_orders));
  const topProducts = recordList(data.top_products);
  const topShops = recordList(data.top_shops);

  const loadDashboard = useCallback(
    async (selectedRange: DateRange) => {
      if (!isValidDate(selectedRange.from) || !isValidDate(selectedRange.to)) {
        setError("الرجاء اختيار تاريخ صحيح");
        return;
      }

      if (atStartOfDay(selectedRange.from) > atStartOfDay(selectedRange.to)) {
        setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const overview = await getDashboardOverview(
          apiFetch,
          formatDateParam(selectedRange.from),
          formatDateParam(selectedRange.to),
        );
        setDashboardData(overview);
      } catch (reason) {
        setDashboardData(null);
        const message =
          reason instanceof Error ? reason.message : "تعذر تحميل بيانات لوحة التحكم";

        setError(
          message.includes("جلسة") || message.includes("401")
            ? "انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى"
            : message || "تعذر تحميل بيانات لوحة التحكم",
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    if (didLoadInitialData.current) return;
    didLoadInitialData.current = true;
    void loadDashboard(range);
  }, [loadDashboard, range]);

  return (
    <div className="px-6 py-6">
      <PageTitle
        title={t("overview.title")}
        description={t("overview.description")}
        actions={
          <OverviewDateActions
            range={range}
            loading={loading}
            onRangeChange={setRange}
            onRefresh={() => void loadDashboard(range)}
          />
        }
      />

      {loading ? (
        <div className="mt-4 rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          جاري تحميل بيانات لوحة التحكم...
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <AnimatedCircularStatCard
          title={t("overview.totalRevenue.title")}
          subtitle={
            <UpdateCadenceLabel cadence={t("overview.period.monthly")}>
              {t("overview.totalRevenue.subtitle")}
            </UpdateCadenceLabel>
          }
          value={revenueTotal}
          percentage={revenuePercentage}
          label={t("overview.totalRevenue.realizedRate")}
          color="var(--chart-1)"
          decimals={2}
          locale={numberLocale}
          prefix={currencyPrefix}
          suffix={currencySuffix}
          tooltip={
            <MetricTooltip
              title={t("overview.totalRevenue.label")}
              value={formatMoney(revenueTotal, currency)}
              detail={t("overview.totalRevenue.note")}
            />
          }
          footer={
            <>
              <HoverTooltip
                content={
                  <MetricTooltip
                    title={t("overview.totalRevenue.realizedRate")}
                    value={formatPercent(revenuePercentage)}
                    detail={formatMoney(revenueTotal, currency)}
                  />
                }
              >
                <div className="flex items-center justify-center gap-1 font-medium leading-none">
                  {t("overview.totalRevenue.realizedRate")}{" "}
                  <AnimatedNumber
                    value={revenuePercentage}
                    decimals={Number.isInteger(revenuePercentage) ? 0 : 1}
                    suffix="%"
                    locale={numberLocale}
                  />
                </div>
              </HoverTooltip>
              <div className="text-xs leading-none text-muted-foreground">
                {t("overview.totalRevenue.note")}
              </div>
            </>
          }
        />
        <OrdersKpiCard orders={data.orders} />
        <AnimatedCircularStatCard
          title={t("overview.customerAnalysis.title")}
          subtitle={
            <UpdateCadenceLabel cadence={t("overview.period.monthly")}>
              {t("overview.customerAnalysis.subtitle")}
            </UpdateCadenceLabel>
          }
          value={customersReturnRate}
          percentage={customersReturnRate}
          label={t("overview.customerAnalysis.returnRateLabel")}
          color="var(--chart-1)"
          radius={85}
          strokeWidth={20}
          trackRadius={85}
          trackStrokeWidth={20}
          decimals={1}
          locale={numberLocale}
          suffix="%"
          delay={200}
          footerClassName="gap-2"
          tooltip={
            <MetricTooltip
              title={t("overview.customerAnalysis.returnRateLabel")}
              value={formatPercent(customersReturnRate)}
              detail={`${t("overview.customerAnalysis.newCustomers")} ${newCustomers.toLocaleString(numberLocale)} / ${t("overview.customerAnalysis.returningCustomers")} ${returningCustomers.toLocaleString(numberLocale)}`}
            />
          }
          footer={
            <>
              <HoverTooltip
                content={
                  <MetricTooltip
                    title={t("overview.customerAnalysis.returnRate")}
                    value={formatPercent(customersReturnRate)}
                    detail={`${t("overview.customerAnalysis.returningCustomers")} ${returningCustomers.toLocaleString(numberLocale)}`}
                  />
                }
              >
                <div className="flex items-center justify-center gap-1 font-medium leading-none">
                  {t("overview.customerAnalysis.returnRate")}{" "}
                  <AnimatedNumber
                    value={customersReturnRate}
                    decimals={1}
                    suffix="%"
                    delay={200}
                    locale={numberLocale}
                  />
                </div>
              </HoverTooltip>
              <div className="text-xs leading-none text-muted-foreground">
                {t("overview.customerAnalysis.newCustomers")}{" "}
                <AnimatedNumber
                  value={newCustomers}
                  delay={200}
                  locale={numberLocale}
                />{" "}
                · {t("overview.customerAnalysis.returningCustomers")}{" "}
                <AnimatedNumber
                  value={returningCustomers}
                  delay={200}
                  locale={numberLocale}
                />
              </div>
            </>
          }
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 xl:w-3/4">
          <Card className="group h-[509px]">
            <CardHeader
              title={t("overview.revenuePerformance.title")}
              description={t("overview.revenuePerformance.description")}
              className="min-h-[65px] border-b"
            />
            <div className="h-[442px] px-6 pb-4 pt-6">
              <RevenuePerformanceChart currency={currency} products={topProducts} />
            </div>
          </Card>
        </div>

        <div className="shrink-0 xl:w-1/4">
          <Card className="flex h-[509px] flex-col shadow">
            <CardHeader
              title={t("overview.activeOrders.title")}
              description={t("overview.activeOrders.description")}
              className="min-h-[65px]"
            />
            <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-2">
              <div className="space-y-2 pt-1">
                {activeOrders.length === 0 ? (
                  <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
                    لا توجد طلبات نشطة في هذه الفترة
                  </div>
                ) : null}
                {activeOrders.map((order, index) => (
                  <Link
                    key={order.key}
                    href={order.href}
                    className="flex min-h-[82px] items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-start transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bike className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-5">
                        {order.code}
                      </span>
                      <span className="block truncate text-xs leading-4 text-muted-foreground">
                        {order.customerName}
                      </span>
                      <span className="block truncate text-xs leading-4 text-muted-foreground">
                        {order.marketSummary}
                        {order.marketCount > 1 ? ` · ${order.marketCount} محلات` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold leading-5">
                        <AnimatedNumber
                          value={order.amount}
                          decimals={2}
                          locale={numberLocale}
                          prefix={currencyPrefix}
                          suffix={currencySuffix}
                          delay={120 + index * 60}
                        />
                      </span>
                      <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-[15px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
                        {order.status}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex justify-center px-3 pb-6">
              <Link
                href="/orders"
                className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t("common.viewMore")} <MoreArrow className="size-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <TopCategoriesCard currency={currency} shops={topShops} />
    </div>
  );
}
