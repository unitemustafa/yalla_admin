"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  ImagePlus,
  Megaphone,
  Package,
  PauseCircle,
  Percent,
  PlayCircle,
  Plus,
  RefreshCw,
  RefreshCcw,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Truck,
  UserRound,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import { type AddonRow, type ItemRow } from "../data";
import { useAuth } from "@/features/auth/auth-provider";
import {
  addonRowFromApi,
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
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import {
  AppSelect,
  Button,
  Card,
  CurrencyText,
  DataTable,
  Field,
  FormCard,
  Input,
  PageTitle,
  Pagination,
  SelectBox,
  Switch,
} from "../primitives";
import { cn } from "@/lib/utils";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { dashboardUsers, type DashboardUser } from "../users/default-dashboard-users";
import { type DashboardOrder } from "../static-data";
import { useServiceCities, type ServiceCity } from "../cities-api";

const currency = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatReferenceCurrency(value: number) {
  return `${currency.format(value)} EGP`;
}


function normalizeCustomerPhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function customerForOrder(order: { customer: string; phone: string }) {
  const orderPhone = normalizeCustomerPhone(order.phone);
  const orderCustomer = order.customer.trim().toLowerCase();

  return dashboardUsers.find((customer) => {
    return (
      normalizeCustomerPhone(customer.phone) === orderPhone ||
      customer.name.trim().toLowerCase() === orderCustomer
    );
  });
}

function customerAvatarForOrder(order: { customer: string; phone: string }) {
  return customerForOrder(order)?.avatar;
}

function CustomerAvatar({
  order,
  className,
}: {
  order: { customer: string; phone: string };
  className?: string;
}) {
  return (
    <DashboardImage
      src={customerAvatarForOrder(order)}
      placeholderType="customer"
      alt={order.customer}
      width={40}
      height={40}
      className={cn(
        "size-10 shrink-0 rounded-md border bg-muted",
        className,
      )}
      imageClassName="object-cover"
    />
  );
}

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

function MetricCards({
  cards,
}: {
  cards: Array<[string, string, React.ComponentType<{ className?: string }>, string]>;
}) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, tone]) => (
        <Card key={label} className="h-[75px] rounded-[12px]">
          <div className="flex h-full items-center gap-3 px-6">
            <div className={cn("rounded-full bg-muted/50 p-3", tone)}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <CurrencyText className="block text-xl font-semibold leading-tight">{value}</CurrencyText>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

type DateRangeKey = "today" | "yesterday" | "week" | "month" | "custom";

type DateRange = {
  start: Date;
  end: Date;
};

type DateRangeOption = {
  key: DateRangeKey;
  label: string;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const arabicMonthNames = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const arabicMonthIndexes = new Map(
  arabicMonthNames.map((month, index) => [month, index]),
);

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = startOfDay(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseInputDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatInputDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortArabicDate(date: Date) {
  return `${date.getDate()} ${arabicMonthNames[date.getMonth()]}`;
}

function dateRangeLabel(range: DateRange) {
  const start = formatShortArabicDate(range.start);
  const end = formatShortArabicDate(range.end);

  return start === end ? start : `${start} - ${end}`;
}

function parseOrderDate(order: DashboardOrder, fallbackYear: number) {
  const numberDateMatch = order.number.match(/ORD-(\d{4})(\d{2})(\d{2})/);

  if (numberDateMatch) {
    const [, year, month, day] = numberDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dateText = order.date.replace("،", " ");
  const dayMatch = dateText.match(/\d+/);
  const monthEntry = [...arabicMonthIndexes.entries()].find(([month]) =>
    dateText.includes(month),
  );

  if (!dayMatch || !monthEntry) {
    return null;
  }

  return new Date(fallbackYear, monthEntry[1], Number(dayMatch[0]));
}

function latestOrderDate(orders: DashboardOrder[]) {
  const fallback = startOfDay(new Date());
  const dates = orders
    .map((order) => parseOrderDate(order, fallback.getFullYear()))
    .filter((date): date is Date => Boolean(date));

  if (!dates.length) {
    return fallback;
  }

  return dates.reduce((latest, date) => (date > latest ? date : latest), dates[0]);
}

function rangeForDateKey(
  key: DateRangeKey,
  anchorDate: Date,
  customRange: { start: string; end: string },
) {
  const anchor = startOfDay(anchorDate);

  if (key === "yesterday") {
    const yesterday = addDays(anchor, -1);
    return { start: yesterday, end: yesterday };
  }

  if (key === "week") {
    return { start: addDays(anchor, -6), end: anchor };
  }

  if (key === "month") {
    return {
      start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      end: anchor,
    };
  }

  if (key === "custom") {
    const start = parseInputDate(customRange.start) ?? anchor;
    const end = parseInputDate(customRange.end) ?? start;

    return start <= end ? { start, end } : { start: end, end: start };
  }

  return { start: anchor, end: anchor };
}

function orderDateWithinRange(
  order: DashboardOrder,
  range: DateRange,
  fallbackYear: number,
) {
  const orderDate = parseOrderDate(order, fallbackYear);

  if (!orderDate) {
    return false;
  }

  const date = startOfDay(orderDate);

  return date >= range.start && date <= range.end;
}

function dateRangeOptions(anchorDate: Date, customRange: { start: string; end: string }) {
  const weekRange = rangeForDateKey("week", anchorDate, customRange);
  const monthRange = rangeForDateKey("month", anchorDate, customRange);

  return [
    { key: "today", label: "النهارده" },
    { key: "yesterday", label: "امبارح" },
    { key: "week", label: "الأسبوع ده", sublabel: dateRangeLabel(weekRange) },
    { key: "month", label: "الشهر ده", sublabel: dateRangeLabel(monthRange) },
    { key: "custom", label: "مخصص", icon: Calendar },
  ] satisfies DateRangeOption[];
}

function DateSegmentedControl({
  activeDate,
  anchorDate,
  customRange,
  onChange,
}: {
  activeDate: DateRangeKey;
  anchorDate: Date;
  customRange: { start: string; end: string };
  onChange: (dateKey: DateRangeKey) => void;
}) {
  return (
    <div className="hidden items-center gap-1 xl:flex">
      {dateRangeOptions(anchorDate, customRange).map(({ key, label, sublabel, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={activeDate === key}
          className={cn(
            "flex h-9 items-center justify-center gap-2 rounded-md border px-4 text-sm shadow-sm transition",
            activeDate === key
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground",
            sublabel && "flex-col gap-0 px-5 text-xs leading-none",
          )}
        >
          <span className="inline-flex items-center gap-2">
            {Icon ? <Icon className="size-4" /> : null}
            {label}
          </span>
          {sublabel ? (
            <span className="text-[10px] opacity-70">{sublabel}</span>
          ) : null}
        </button>
      ))}
    </div>
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

function EmptyStateTable({
  headers,
  minWidth = 980,
}: {
  headers: React.ReactNode[];
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="h-10 border-b bg-muted/40">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-3 text-start text-xs font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={headers.length} className="h-24 text-center font-medium">
              مفيش بيانات
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function addonMatchesSearch(addon: AddonRow, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    addon.id,
    addon.name,
    addon.nameAr,
    addon.price,
    addon.category,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

type AddonCategoryRecord = {
  id: string;
  name: string;
};

function translateAddonCategoryDeleteError(message: string) {
  if (/cannot delete addition classification while product additions are using it/i.test(message)) {
    return "لا يمكن حذف التصنيف لأنه مستخدم في إضافات حالية.";
  }
  return message;
}

function AddonRowIconButton({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-accent",
        tone === "danger" ? "border-destructive/35 text-destructive hover:bg-destructive/10" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function AddonEditPanel({
  draft,
  categoryOptions,
  onChange,
  onImageChange,
  onCancel,
  onSave,
}: {
  draft: AddonRow;
  categoryOptions: string[];
  onChange: (draft: AddonRow) => void;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <form
      className="rounded-md border border-primary/25 bg-primary/5 p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-3 lg:grid-cols-[76px_minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium leading-none">
          الصورة
          <span className="group relative flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
            <input
              accept="image/*"
              className="sr-only"
              onChange={onImageChange}
              type="file"
            />
            <DashboardImage
              alt={draft.nameAr}
              src={draft.image}
              placeholderType="addon"
              width={96}
              height={96}
              sizes="64px"
              className="absolute inset-0 size-full"
              imageClassName="object-contain"
            />
            <span className="absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/30" />
            <span className="relative z-30 rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold opacity-0 shadow-sm transition group-hover:opacity-100">
              تغيير
            </span>
          </span>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="الاسم بالعربي">
            <Input
              value={draft.nameAr}
              className="h-9"
              onChange={(event) =>
                onChange({ ...draft, nameAr: event.target.value })
              }
            />
          </Field>
          <Field label="سعر الإضافة">
            <Input
              dir="ltr"
              value={draft.price}
              className="h-9"
              onChange={(event) => onChange({ ...draft, price: event.target.value })}
            />
          </Field>
          <Field label="تصنيف الإضافة">
            <AppSelect
              value={draft.category}
              onValueChange={(category) => onChange({ ...draft, category })}
              ariaLabel="اختيار تصنيف الإضافة"
              className="h-9 bg-input"
              options={categoryOptions.map((category) => ({
                value: category,
                label: category,
              }))}
            />
          </Field>
        </div>
        <div className="flex gap-2 lg:pb-0">
          <Button type="button" variant="outline" className="h-9" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" className="h-9">
            حفظ
          </Button>
        </div>
      </div>
    </form>
  );
}

function splitAddonPrice(price: string) {
  const normalizedPrice = price.trim();
  const match = normalizedPrice.match(/^(.*?)(?:\s*(EGP|جنيه|جنية))$/i);

  if (!match) {
    return { amount: normalizedPrice, currency: "" };
  }

  return {
    amount: match[1].trim(),
    currency: match[2],
  };
}

function AddonIdentity({ addon }: { addon: AddonRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1">
      <DashboardImage
        alt={addon.nameAr}
        src={addon.image}
        placeholderType="addon"
        width={52}
        height={52}
        sizes="52px"
        className="size-[52px] shrink-0 rounded-md border bg-muted/35 shadow-sm"
        imageClassName="object-contain p-1"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[13px] font-black leading-5">{addon.nameAr}</h3>
          <span className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-xs font-bold",
            addon.active !== false
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}>
            {addon.active !== false ? "مفعلة" : "معطلة"}
          </span>
        </div>
      </div>
    </div>
  );
}

function AddonInfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-semibold text-foreground">
      <span className="truncate">{children}</span>
    </span>
  );
}

function AddonPriceCell({ price }: { price: string }) {
  const { amount, currency } = splitAddonPrice(price);

  return (
    <div className="inline-flex min-w-[78px] items-baseline justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary">
      <span className="text-sm font-black leading-none">{amount}</span>
      {currency ? <span className="currency-text text-[11px] font-bold">{currency}</span> : null}
    </div>
  );
}

type OrderFilters = {
  search: string;
  status: string;
};

const defaultOrderFilters: OrderFilters = {
  search: "",
  status: "all",
};

const dashboardListPageSize = 10;

function uniqueOrderValues(rows: DashboardOrder[], key: "status") {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean)));
}

function orderMatchesFilters(order: DashboardOrder, filters: OrderFilters) {
  const search = filters.search.trim().toLowerCase();
  const matchesSearch =
    !search ||
    [order.number, order.customer, order.phone, order.total.toString()]
      .join(" ")
      .toLowerCase()
      .includes(search);
  const matchesStatus =
    filters.status === "all" || order.status === filters.status;

  return matchesSearch && matchesStatus;
}

function orderStatusTone(status: string): "green" | "yellow" | "blue" | "red" | "gray" {
  if (status === "تم التسليم") return "gray";
  if (status === "مؤكد") return "blue";
  if (status === "ملغي") return "red";
  return "yellow";
}

function OrdersFilters({
  filters,
  statuses,
  onChange,
}: {
  filters: OrderFilters;
  statuses: string[];
  onChange: (filters: OrderFilters) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)] md:items-end">
      <label className="grid gap-2 text-sm">
        بحث
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="رقم الطلب أو العميل..."
          className="h-9 rounded-md border border-border bg-input px-3 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
        />
      </label>
      <label className="grid gap-2 text-sm">
        الحالة
        <AppSelect
          value={filters.status}
          onValueChange={(status) => onChange({ ...filters, status })}
          options={[
            { value: "all", label: "الكل" },
            ...statuses.map((status) => ({ value: status, label: status })),
          ]}
          className="h-9 bg-input"
          contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
          ariaLabel="الحالة"
        />
      </label>
    </div>
  );
}

function OrdersMobileCards({
  orders,
}: {
  orders: DashboardOrder[];
}) {
  return (
    <div className="mt-4 grid min-w-0 gap-3 lg:hidden">
      {orders.map((order) => (
        <article
          key={order.number}
          className="min-w-0 overflow-hidden rounded-md border bg-card p-3 text-card-foreground shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/orders/view/${encodeURIComponent(order.number)}`}
              className="flex min-w-0 items-start gap-3 hover:text-primary"
            >
              <CustomerAvatar order={order} />
              <span className="min-w-0">
                <span className="block break-all text-sm font-semibold">
                  {order.number}
                </span>
                <span className="mt-1 block truncate text-sm">{order.customer}</span>
                <span
                  dir="ltr"
                  className="block truncate text-xs text-muted-foreground"
                >
                  {order.phone}
                </span>
              </span>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RefBadge tone={orderStatusTone(order.status)}>{order.status}</RefBadge>
            <RefBadge tone="gray">{order.type}</RefBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <div className="text-muted-foreground">الإجمالي</div>
              <div className="mt-1 font-semibold">
                {formatReferenceCurrency(order.total)}
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <div className="text-muted-foreground">التاريخ</div>
              <div className="mt-1 font-medium">{order.date}</div>
              <div className="text-muted-foreground">{order.time}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CustomDateRangePicker({
  activeDate,
  customRange,
  onChange,
}: {
  activeDate: DateRangeKey;
  customRange: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
}) {
  const [openField, setOpenField] = useState<"start" | "end" | null>(null);

  if (activeDate !== "custom") {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm">
        {"\u0645\u0646"}
        <ScheduleDateField
          value={customRange.start}
          onChange={(start) => onChange({ ...customRange, start })}
          ariaLabel={"\u0645\u0646"}
          rangeStart={customRange.start}
          rangeEnd={customRange.end}
          open={openField === "start"}
          onOpenChange={(open) => setOpenField(open ? "start" : null)}
          popoverClassName="sm:w-[24rem]"
          compactCalendar
        />
      </label>
      <label className="grid gap-2 text-sm">
        {"\u0625\u0644\u0649"}
        <ScheduleDateField
          value={customRange.end}
          onChange={(end) => onChange({ ...customRange, end })}
          ariaLabel={"\u0625\u0644\u0649"}
          rangeStart={customRange.start}
          rangeEnd={customRange.end}
          open={openField === "end"}
          onOpenChange={(open) => setOpenField(open ? "end" : null)}
          popoverClassName="sm:w-[24rem]"
          popoverAlign="end"
          compactCalendar
        />
      </label>
    </div>
  );
}

function MobileDateFilters({
  activeDate,
  anchorDate,
  customRange,
  onChange,
}: {
  activeDate: DateRangeKey;
  anchorDate: Date;
  customRange: { start: string; end: string };
  onChange: (dateKey: DateRangeKey) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 xl:hidden">
      {dateRangeOptions(anchorDate, customRange).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={activeDate === key}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs shadow-sm transition",
            activeDate === key
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {Icon ? <Icon className="size-3.5" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

export function OrdersPage() {
  const [orders] = useState<DashboardOrder[]>([]);
  const [filters, setFilters] = useState<OrderFilters>(defaultOrderFilters);
  const [loading] = useState(false);
  const [error] = useState("");
  const [activeDate, setActiveDate] = useState<DateRangeKey>("today");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const anchorDate = useMemo(() => latestOrderDate(orders), [orders]);
  const activeRange = useMemo(
    () => rangeForDateKey(activeDate, anchorDate, customRange),
    [activeDate, anchorDate, customRange],
  );
  const dateFilteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        orderDateWithinRange(order, activeRange, anchorDate.getFullYear()),
      ),
    [activeRange, anchorDate, orders],
  );
  const visibleOrders = useMemo(
    () => dateFilteredOrders.filter((order) => orderMatchesFilters(order, filters)),
    [dateFilteredOrders, filters],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(visibleOrders.length / dashboardListPageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * dashboardListPageSize;
  const pagedOrders = visibleOrders.slice(
    pageStartIndex,
    pageStartIndex + dashboardListPageSize,
  );
  const statuses = useMemo(
    () => uniqueOrderValues(dateFilteredOrders, "status"),
    [dateFilteredOrders],
  );
  const waitingCount = dateFilteredOrders.filter(
    (order) => order.status === "قيد الانتظار",
  ).length;
  const completedCount = dateFilteredOrders.filter(
    (order) => order.status === "تم التسليم",
  ).length;
  const cancelledCount = dateFilteredOrders.filter(
    (order) => order.status === "ملغي",
  ).length;

  function changeActiveDate(dateKey: DateRangeKey) {
    setActiveDate(dateKey);
    setCurrentPage(1);

    if (dateKey === "custom" && (!customRange.start || !customRange.end)) {
      const date = formatInputDate(anchorDate);
      setCustomRange({ start: date, end: date });
    }
  }

  return (
    <div className="px-6 py-8">
      <PageTitle
        title="الطلبات"
        description="عرض وإدارة كل الطلبات الواردة"
        size="compact"
        actions={
          <>
            <DateSegmentedControl
              activeDate={activeDate}
              anchorDate={anchorDate}
              customRange={customRange}
              onChange={changeActiveDate}
            />
            <Link
              href="/orders/create"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <Plus className="size-4" />
              إنشاء طلب جديد
            </Link>
          </>
        }
      />

      <MetricCards
        cards={[
          ["إجمالي الطلبات", String(dateFilteredOrders.length), ShoppingCart, "text-primary"],
          ["قيد الانتظار", String(waitingCount), Calendar, "text-amber-500"],
          ["تم التسليم", String(completedCount), CheckCircle2, "text-green-500"],
          ["ملغي", String(cancelledCount), XCircle, "text-destructive"],
        ]}
      />

      <div className="mt-6">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}
        <MobileDateFilters
          activeDate={activeDate}
          anchorDate={anchorDate}
          customRange={customRange}
          onChange={changeActiveDate}
        />
        <CustomDateRangePicker
          activeDate={activeDate}
          customRange={customRange}
          onChange={(nextRange) => {
            setCustomRange(nextRange);
            setCurrentPage(1);
          }}
        />
        <OrdersFilters
          filters={filters}
          statuses={statuses}
          onChange={(nextFilters) => {
            setFilters(nextFilters);
            setCurrentPage(1);
          }}
        />
        {loading ? (
          <div className="mt-4 flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground lg:hidden">
            جاري تحميل الطلبات...
          </div>
        ) : visibleOrders.length ? (
          <OrdersMobileCards
            orders={pagedOrders}
          />
        ) : (
          <div className="mt-4 flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground lg:hidden">
            لا توجد نتائج مطابقة.
          </div>
        )}
        <div className="mt-4 hidden overflow-hidden rounded-md border lg:block">
          <div className="overflow-x-auto">
            <table
              className="w-full caption-bottom text-sm"
              style={{ minWidth: 980, tableLayout: "fixed" }}
            >
              <colgroup>
                {[48, 215, 215, 135, 150, 165, 140].map((width, index) => (
                  <col key={index} style={{ width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="h-10 border-b transition-colors hover:bg-muted/50">
                  <th className="h-10 px-2 text-center align-middle text-xs font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground">
                    رقم الطلب
                  </th>
                  <th className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground">
                    بيانات العميل
                  </th>
                  <th className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground">
                    <button type="button" className="inline-flex items-center gap-2">
                      نوع الطلب
                      <ArrowUpDown className="size-4" />
                    </button>
                  </th>
                  <th className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground">
                    <button type="button" className="inline-flex items-center gap-2">
                      حالة الطلب
                      <ArrowUpDown className="size-4" />
                    </button>
                  </th>
                  <th className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground">
                    السعر
                  </th>
                  <th className="h-10 px-2 text-start align-middle text-xs font-medium text-muted-foreground">
                    تاريخ الطلب
                  </th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : pagedOrders).flatMap((order, rowIndex) => [
                  <tr
                    key={`row-${order.number}`}
                    className="h-[53px] border-b transition-colors hover:bg-muted/40"
                  >
                    <td className="p-0 text-center align-middle">
                      <span className="block px-2 tabular-nums">
                        {pageStartIndex + rowIndex + 1}
                      </span>
                    </td>
                    <td className="p-2 align-middle">
                      <Link
                        href={`/orders/view/${encodeURIComponent(order.number)}`}
                        className="font-medium hover:text-primary"
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td className="p-2 align-middle">
                      <Link
                        href={`/orders/view/${encodeURIComponent(order.number)}`}
                        className="flex min-w-0 items-center gap-3 rounded-md transition hover:text-primary"
                      >
                        <CustomerAvatar order={order} />
                        <span className="min-w-0">
                          <span className="block truncate">{order.customer}</span>
                          <span
                            dir="ltr"
                            className="block truncate text-xs text-muted-foreground"
                          >
                            {order.phone}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="p-2 align-middle">{order.type}</td>
                    <td className="p-2 align-middle">
                      <RefBadge tone={orderStatusTone(order.status)}>
                        {order.status}
                      </RefBadge>
                    </td>
                    <td className="p-2 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border text-green-500">
                          <Banknote className="size-4" />
                        </span>
                        <span>
                          <span className="block font-medium">
                            {formatReferenceCurrency(order.total)}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="p-2 align-middle">
                      <div>{order.date}</div>
                      <div className="text-xs text-muted-foreground">{order.time}</div>
                    </td>
                  </tr>,
                ])}
              </tbody>
            </table>
          </div>
          {loading ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              جاري تحميل الطلبات...
            </div>
          ) : !visibleOrders.length ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}
        </div>
        <Pagination
          text={`عرض ${pagedOrders.length} من ${visibleOrders.length} نتائج`}
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
    </div>
  );
}

export function CreateOrderPage() {
  const { showSnackbar } = useSnackbar();
  const orderFormRef = useRef<HTMLFormElement>(null);
  const activeSeedItems = useMemo<ItemRow[]>(() => [], []);
  const initialItem = activeSeedItems[0];
  const [savingOrder, setSavingOrder] = useState(false);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [orderProductsOpen, setOrderProductsOpen] = useState(false);
  const [orderProductSearchOpen, setOrderProductSearchOpen] = useState(false);
  const [activeOrderPanel, setActiveOrderPanel] =
    useState<"delivery" | "summary">("delivery");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [note, setNote] = useState("");
  const [orderLines, setOrderLines] = useState<
    Array<{ id: string; itemId: string; quantity: number }>
  >(() =>
    initialItem ? [{ id: `${initialItem.id}-line`, itemId: initialItem.id, quantity: 1 }] : [],
  );
  const inputClass =
    "h-10 w-full rounded-md border border-border bg-input px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

  function itemPrice(item: ItemRow | undefined) {
    if (!item) return 0;
    return itemDisplayPrice(item);
  }

  const productsById = useMemo(
    () => new Map<string, ItemRow>(),
    [],
  );
  const selectedOrderItemIds = orderLines.map((line) => line.itemId);
  const orderProductNames = orderLines
    .map((line) => productsById.get(line.itemId)?.name)
    .filter(Boolean)
    .join("، ");
  const subtotal = orderLines.reduce(
    (total, line) => total + itemPrice(productsById.get(line.itemId)) * line.quantity,
    0,
  );
  const discountRate = Math.min(Math.max(Number.parseFloat(discountPercent) || 0, 0), 100);
  const discount = subtotal * (discountRate / 100);
  const taxableAmount = Math.max(subtotal - discount, 0);
  const vat = taxableAmount * 0.15;
  const deliveryFee = orderLines.length ? 25 : 0;
  const orderTotal = taxableAmount + vat + deliveryFee;
  const summaryProducts = orderLines.flatMap((line) => {
    const item = productsById.get(line.itemId);

    if (!item) return [];

    return [
      {
        id: line.id,
        name: item.name,
        quantity: line.quantity,
        total: formatReferenceCurrency(itemPrice(item) * line.quantity),
      },
    ];
  });
  const summaryRows = [
    ["الخصم", `-${formatReferenceCurrency(discount)}`, "text-red-500"],
    ["رسوم التوصيل", formatReferenceCurrency(deliveryFee), ""],
  ] as const;

  function addOrderProduct(itemId: string) {
    const selectedItem = productsById.get(itemId);

    if (!selectedItem) return;

    setOrderLines((currentLines) => {
      const existingLine = currentLines.find((line) => line.itemId === itemId);

      if (existingLine) {
        return currentLines.map((line) =>
          line.id === existingLine.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [
        ...currentLines,
        { id: `${itemId}-${Date.now()}`, itemId, quantity: 1 },
      ];
    });
    setOrderProductsOpen(true);
    showSnackbar({ message: `تم إضافة ${selectedItem.name} للطلب.` });
  }

  function updateOrderLine(lineId: string, patch: Partial<BundleLine>) {
    setOrderLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              ...patch,
              quantity: Math.max(1, Math.min(99, patch.quantity ?? line.quantity)),
            }
          : line,
      ),
    );
  }

  function removeOrderLine(lineId: string) {
    setOrderLines((currentLines) => currentLines.filter((line) => line.id !== lineId));
  }

  async function saveOrder(resetAfterSave: boolean) {
    if (savingOrder) return;

    const formData = new FormData(orderFormRef.current ?? undefined);
    const submittedCustomer = String(formData.get("customer") ?? customer).trim();
    const submittedPhone = String(formData.get("phone") ?? phone).trim();
    const submittedLines = orderLines.map((line) => {
      const quantity = Number(formData.get(`quantity-${line.id}`));

      return {
        ...line,
        quantity: Math.max(1, Math.min(Number.isFinite(quantity) ? quantity : line.quantity, 99)),
      };
    });
    if (!submittedCustomer || !submittedPhone || !submittedLines.length) {
      showSnackbar({
        message: "اختار عميل مسجل وأضف منتج واحد على الأقل قبل الحفظ.",
        tone: "danger",
      });
      return;
    }

    setSavingOrder(true);
    void resetAfterSave;

    showSnackbar({
      message: "إنشاء الطلبات غير مربوط بالـ backend حاليًا.",
      tone: "danger",
    });
    setSavingOrder(false);
  }

  function selectCustomer(nextCustomer: DashboardUser) {
    setCustomer(nextCustomer.name);
    setPhone(nextCustomer.phone);
    setCustomerPickerOpen(false);
  }

  return (
    <form
      ref={orderFormRef}
      className="px-4 py-5 sm:px-6 lg:px-8"
      onSubmit={(event) => {
        event.preventDefault();
        void saveOrder(false);
      }}
    >
      <Card className="flex flex-col gap-4 overflow-hidden rounded-lg px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-primary">الطلبات</div>
          <h1 className="mt-1 text-2xl font-semibold leading-8">إنشاء طلب جديد</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <RefBadge tone={orderLines.length ? "green" : "yellow"}>
              {orderLines.length} منتجات
            </RefBadge>
            <span dir="ltr" className="font-semibold text-foreground">
              {formatReferenceCurrency(orderTotal)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-10"
            type="button"
            disabled={savingOrder}
            onClick={() => void saveOrder(false)}
            data-testid="save-order-button"
          >
            <CheckCircle2 className="size-4" />
            {savingOrder ? "جاري الحفظ..." : "حفظ الطلب"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            type="button"
            disabled={savingOrder}
            onClick={() => void saveOrder(true)}
          >
            حفظ وإنشاء جديد
          </Button>
          <Link
            href="/orders"
            className="inline-flex size-10 items-center justify-center rounded-md border bg-background shadow-sm transition hover:bg-accent"
            aria-label="الرجوع للطلبات"
          >
            <X className="size-4" />
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </span>
                <h2 className="text-xl font-semibold">بيانات العميل</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setCustomerPickerOpen(true)}
              >
                <Search className="size-4" />
                بحث
              </Button>
            </div>
            <div className="grid gap-4">
              <Field label="اسم العميل">
                <Input
                  name="customer"
                  className="h-10"
                  placeholder="اضغط بحث لاختيار العميل"
                  value={customer}
                  readOnly
                  onClick={() => setCustomerPickerOpen(true)}
                  required
                />
              </Field>
              <input type="hidden" name="phone" value={phone} />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4">
              <button
                type="button"
                aria-expanded={orderProductsOpen}
                onClick={() => setOrderProductsOpen((open) => !open)}
                className="min-w-0 flex-1 rounded-md text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">منتجات الطلب</span>
                  <RefBadge tone="blue">{orderLines.length} منتجات</RefBadge>
                  <RefBadge tone="gray">{formatReferenceCurrency(subtotal)}</RefBadge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {orderProductNames || "اختار المنتجات اللي هتدخل في الطلب."}
                </p>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() => setOrderProductSearchOpen(true)}
                >
                  <Plus className="size-4" />
                  إضافة منتج
                </Button>
                <button
                  type="button"
                  aria-expanded={orderProductsOpen}
                  onClick={() => setOrderProductsOpen((open) => !open)}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold text-primary shadow-sm transition hover:bg-accent"
                >
                  {orderProductsOpen ? "إخفاء المنتجات" : "عرض المنتجات"}
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      orderProductsOpen && "rotate-180",
                    )}
                  />
                </button>
              </div>
            </div>

            {orderProductsOpen ? (
              <div className="grid gap-3 bg-background/30 p-3">
                {orderLines.length ? (
                  orderLines.map((line) => {
                    const item = productsById.get(line.itemId);

                    if (!item) return null;

                    return (
                      <PackageProductCard
                        key={line.id}
                        line={line}
                        item={item}
                        lineTotal={itemPrice(item) * line.quantity}
                        canRemove
                        contextLabel="الطلب"
                        onChange={(patch) => updateOrderLine(line.id, patch)}
                        onRemove={() => removeOrderLine(line.id)}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                      <ShoppingCart className="size-6" />
                    </div>
                    <div className="mt-4 font-semibold">لا توجد منتجات في الطلب</div>
                  </div>
                )}
              </div>
            ) : null}
          </Card>

        </div>

        <Card className="h-fit p-6 xl:sticky xl:top-20">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </span>
            <h2 className="text-xl font-semibold">بيانات الطلب</h2>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {[
                ["delivery", "توصيل", Truck],
                ["summary", "ملخص", Banknote],
              ].map(([value, label, Icon]) => {
                const active = activeOrderPanel === value;
                const OrderIcon = Icon as typeof Truck;

                return (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setActiveOrderPanel(value as "delivery" | "summary")
                    }
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition",
                      active
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                    )}
                  >
                    <OrderIcon className="size-4" />
                    {String(label)}
                  </button>
                );
              })}
            </div>

            {activeOrderPanel === "delivery" ? (
              <>
                <Field label="طريقة الدفع">
                  <input type="hidden" name="payment" value="cash" />
                  <div className="flex h-10 items-center rounded-md border border-border bg-muted/35 px-3 text-sm font-semibold">
                    نقدي
                  </div>
                </Field>

                <Field label="الخصم">
                  <div className="relative">
                    <input
                      name="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(event) => setDiscountPercent(event.target.value)}
                      className={cn(inputClass, "pl-9")}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </Field>
                <div className="border-t" />
                <Field label="ملاحظة الطلب">
                  <textarea
                    name="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-24 rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                    placeholder="اكتب أي ملاحظة للطلب"
                  />
                </Field>
              </>
            ) : (
              <OrderSummaryDetails
                products={summaryProducts}
                rows={summaryRows}
                total={formatReferenceCurrency(orderTotal)}
              />
            )}
          </div>
        </Card>
      </div>
      <CustomerSearchModal
        key={customerPickerOpen ? "customer-picker-open" : "customer-picker-closed"}
        open={customerPickerOpen}
        selectedPhone={phone}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={selectCustomer}
      />
      <PackageProductSearchModal
        open={orderProductSearchOpen}
        selectedItemIds={selectedOrderItemIds}
        title="إضافة منتجات للطلب"
        description="ابحث بالاسم أو الكود، واضغط على أي منتج لإضافته للطلب. تقدر تضيف أكتر من منتج."
        selectedLabel="موجود في الطلب"
        onClose={() => setOrderProductSearchOpen(false)}
        onSelect={addOrderProduct}
      />
    </form>
  );
}

function OrderSummaryDetails({
  products,
  rows,
  total,
}: {
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    total: string;
  }>;
  rows: ReadonlyArray<readonly [string, string, string]>;
  total: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Banknote className="size-5" />
        </span>
        <h3 className="text-lg font-semibold">ملخص الطلب</h3>
      </div>
      <div className="grid gap-2">
        <div className="text-xs font-semibold text-muted-foreground">
          المنتجات المختارة
        </div>
        {products.length ? (
          <div className="grid gap-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-muted/25 px-3"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {product.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  x{product.quantity}
                </span>
                <span dir="ltr" className="shrink-0 text-sm font-semibold">
                  {product.total}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs font-medium text-muted-foreground">
            لا توجد منتجات مختارة
          </div>
        )}
      </div>
      <div className="grid gap-3 text-sm">
        {rows.map(([label, value, tone]) => (
          <div
            key={label}
            className="flex min-h-10 items-center justify-between gap-4 rounded-md bg-muted/25 px-3"
          >
            <span className="text-muted-foreground">{label}</span>
            <span dir="ltr" className={cn("font-medium", tone)}>
              {value}
            </span>
          </div>
        ))}
        <div className="mt-1 flex min-h-12 items-center justify-between gap-4 rounded-md border bg-background px-3 text-base font-semibold">
          <span>الإجمالي</span>
          <span dir="ltr" className="text-green-500">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomerSearchModal({
  open,
  selectedPhone,
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedPhone: string;
  onClose: () => void;
  onSelect: (customer: DashboardUser) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCustomers = useMemo(
    () =>
      dashboardUsers.filter((customer) => {
        if (!normalizedQuery) return true;

        return [customer.name, customer.username]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [normalizedQuery],
  );

  useEffect(() => {
    if (!open) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-foreground/45 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-search-title"
        className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="customer-search-title" className="text-base font-bold">
              اختيار عميل
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              كل العملاء المسجلين عندنا
            </p>
          </div>
          <button
            type="button"
            aria-label="إغلاق اختيار العميل"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b bg-muted/15 p-4">
          <label className="grid gap-2 text-sm font-medium">
            بحث
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث بالاسم أو اليوزر..."
                className="h-10 ps-9"
                autoFocus
              />
            </div>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filteredCustomers.length > 0 ? (
            <div className="grid gap-3">
              {filteredCustomers.map((customer) => {
                const selected = customer.phone === selectedPhone;

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => onSelect(customer)}
                    className={cn(
                      "flex min-h-16 items-center justify-between gap-4 rounded-md border bg-card px-4 py-3 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45",
                      selected && "border-primary/45 bg-primary/10",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {customer.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground" dir="ltr">
                        @{customer.username}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground" dir="ltr">
                      {customer.phone}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/20 px-4 py-10 text-center text-sm font-medium text-muted-foreground">
              مفيش عملاء مطابقين للبحث
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CreateOrderPageLegacy() {
  const { showSnackbar } = useSnackbar();
  const orderFormRef = useRef<HTMLFormElement>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const inputClass =
    "h-10 w-full rounded-md border border-border bg-input px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15";
  const summaryRows = [
    ["الإجمالي الفرعي", "0.00 EGP", ""],
    ["الخصم", "-0.00 EGP", "text-red-500"],
    ["ضريبة القيمة المضافة (15%)", "0.00 EGP", ""],
    ["رسوم التوصيل", "0.00 EGP", ""],
  ] as const;

  async function saveOrder(resetAfterSave: boolean) {
    if (savingOrder) {
      return;
    }

    const form = orderFormRef.current;
    const formData = new FormData(form ?? undefined);
    const inputs = Array.from(form?.querySelectorAll("input") ?? []);
    const rawCustomer = formData.get("customer") ?? inputs[1]?.value;
    const rawPhone = formData.get("phone") ?? inputs[2]?.value;
    const rawType = formData.get("type") ?? "delivery";

    setSavingOrder(true);

    void rawCustomer;
    void rawPhone;
    void rawType;
    void resetAfterSave;
    showSnackbar({
      message: "Order creation is not connected to the backend yet.",
      tone: "danger",
    });
    setSavingOrder(false);
  }

  return (
    <form
      ref={orderFormRef}
      className="px-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        void saveOrder(false);
      }}
    >
      <Card className="flex flex-col gap-4 rounded-lg px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-primary">الطلبات</div>
          <h1 className="mt-1 text-2xl font-semibold leading-8">إنشاء طلب جديد</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-10"
            type="button"
            disabled={savingOrder}
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void saveOrder(false);
            }}
          >
            حفظ الطلب
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            type="button"
            disabled={savingOrder}
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void saveOrder(true);
            }}
          >
            حفظ وإنشاء جديد
          </Button>
          <Link
            href="/orders"
            className="inline-flex size-10 items-center justify-center rounded-md border bg-background shadow-sm transition hover:bg-accent"
            aria-label="الرجوع للطلبات"
          >
            <X className="size-4" />
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </span>
                <h2 className="text-xl font-semibold">بيانات العميل</h2>
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-4" />
                عميل جديد
              </button>
            </div>
            <div className="relative mb-5">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pe-10"
                placeholder="ابحث عن العميل بالاسم أو الموبايل..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم العميل">
                <Input className="h-10" placeholder="اكتب اسم العميل" />
              </Field>
              <Field label="رقم الموبايل">
                <Input className="h-10" placeholder="رقم الموبايل" />
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShoppingCart className="size-5" />
                </span>
                <h2 className="text-xl font-semibold">منتجات الطلب</h2>
              </div>
              <Button type="button" className="h-10">
                <Plus className="size-4" />
                إضافة منتج
              </Button>
            </div>
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                <ShoppingCart className="size-6" />
              </div>
              <div className="mt-4 font-semibold">مفيش منتجات في الطلب ده</div>
              <div className="mt-1 text-sm text-muted-foreground">
                أضف المنتجات عشان يظهر الملخص والإجمالي تلقائيًا.
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Banknote className="size-5" />
              </span>
              <h2 className="text-xl font-semibold">ملخص الطلب</h2>
            </div>
            <div className="grid gap-3 text-sm">
              {summaryRows.map(([label, value, tone]) => (
                <div
                  key={label}
                  className="flex min-h-10 items-center justify-between gap-4 rounded-md bg-muted/25 px-3"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <CurrencyText className={cn("font-medium", tone)}>{value}</CurrencyText>
                </div>
              ))}
              <div className="mt-1 flex min-h-12 items-center justify-between gap-4 rounded-md border bg-background px-3 text-base font-semibold">
                <span>الإجمالي</span>
                <CurrencyText className="text-green-500">0.00 EGP</CurrencyText>
              </div>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-6 xl:sticky xl:top-20">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </span>
            <h2 className="text-xl font-semibold">بيانات الطلب</h2>
          </div>
          <div className="space-y-5">
            <Field label="الخصم">
              <div className="relative">
                <input defaultValue="0" className={cn(inputClass, "pl-9")} />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </Field>
            <div className="border-t" />
            <Field label="ملاحظة الطلب">
              <textarea
                className="min-h-24 rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                placeholder="اكتب أي ملاحظة للطلب"
              />
            </Field>
          </div>
        </Card>
      </div>
    </form>
  );
}

export function AddonsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [addonsLoading, setAddonsLoading] = useState(false);
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
        if (classifications.length) {
          setAddonCategories(
            apiList(classificationsData)
              .map((item) => ({ id: String(item.id ?? ""), name: String(item.name ?? "").trim() }))
              .filter((item) => Boolean(item.id) && Boolean(item.name)),
          );
          setCategoryOptions(classifications);
          setCategoryIds(classificationIds);
          setAddonFormCategory(classifications[0] ?? "");
        }
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
            <Button onClick={() => setModalOpen(true)}>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setCategoryModalOpen(true)}>
                  <Plus className="size-4" />
                  إضافة تصنيف
                </Button>
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

      {modalOpen ? (
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
                          className="inline-flex shrink-0 items-center gap-1 font-semibold text-destructive transition hover:text-destructive/80"
                        >
                          <X className="size-3.5" />
                          حذف
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

const offerTypeOptions = [
  { label: "باكج", icon: Package, accent: "text-sky-400", bg: "bg-sky-500/15", disabled: false },
  { label: "فلاش", icon: Zap, accent: "text-amber-400", bg: "bg-amber-500/15", disabled: false },
  { label: "خصم", icon: Percent, accent: "text-rose-400", bg: "bg-rose-500/15", disabled: false },
  { label: "توصيل", icon: Truck, accent: "text-emerald-400", bg: "bg-emerald-500/15", disabled: false },
  { label: "إعلان", icon: Megaphone, accent: "text-fuchsia-400", bg: "bg-fuchsia-500/15", disabled: false },
] as const satisfies readonly {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  bg: string;
  disabled?: boolean;
}[];

type ArabicOfferType = (typeof offerTypeOptions)[number]["label"];

type OfferCard = {
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
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  iconBg: string;
};

type OfferMarket = {
  id: string;
  name: string;
  scope: OfferScope;
  status: string;
  serviceCityIds: string[];
};

const allOffersFilterValue = "all";
const generalOffersFilterValue = "general";

function translateOfferErrorMessage(message: string) {
  const normalized = message.trim();

  if (/cannot delete offer while orders are using it/i.test(normalized)) {
    return "لا يمكن حذف العرض لأنه مستخدم في طلبات حالية.";
  }

  return message;
}

const offerTypeLabels: Record<OfferType, ArabicOfferType> = {
  package: "باكج",
  flash: "فلاش",
  discount: "خصم",
  announcement: "إعلان",
  delivery: "توصيل",
};

const offerTypeValues: Record<ArabicOfferType, OfferType> = {
  باكج: "package",
  فلاش: "flash",
  خصم: "discount",
  إعلان: "announcement",
  توصيل: "delivery",
};

function offerDateLifecycle(startsAt: string, endsAt: string, now = Date.now()) {
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

function normalizeOfferFilterText(value: string) {
  return value.trim().toLowerCase();
}

function offerMarketFromApi(record: BackendRecord): OfferMarket | null {
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

function offerCardFromApi(record: BackendRecord): OfferCard {
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
  };
}

function getCountdownParts(endsAt: string, now: number | null) {
  if (now === null) {
    return { days: "--", hours: "--", minutes: "--", seconds: "--", expired: false };
  }

  const endTime = new Date(endsAt).getTime();

  if (!Number.isFinite(endTime)) {
    return { days: "--", hours: "--", minutes: "--", seconds: "--", expired: false };
  }

  const diffMs = endTime - now;
  const expired = diffMs <= 0;
  const totalSeconds = Math.max(0, Math.ceil(Math.abs(diffMs) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    expired,
  };
}

function CountdownValue({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-background/80 px-2 py-2 text-center shadow-sm">
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[11px] leading-none text-muted-foreground">{label}</div>
    </div>
  );
}

function OfferCountdown({ endsAt, now }: { endsAt: string; now: number | null }) {
  const countdown = getCountdownParts(endsAt, now);

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3",
        countdown.expired
          ? "border-red-500/20 bg-red-500/10"
          : "border-primary/20 bg-primary/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {countdown.expired ? "انتهى منذ" : "متبقي"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-semibold leading-none",
            countdown.expired
              ? "bg-red-500/15 text-red-200"
              : "bg-primary/15 text-primary",
          )}
        >
          {countdown.expired ? "منتهي" : "ينتهي خلال"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <CountdownValue value={countdown.days} label="أيام" />
        <CountdownValue value={countdown.hours} label="ساعات" />
        <CountdownValue value={countdown.minutes} label="دقائق" />
        <CountdownValue value={countdown.seconds} label="ثواني" />
      </div>
    </div>
  );
}

type OfferVisualData = Pick<OfferCard, "title" | "description" | "type" | "endsAt"> & {
  image?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  iconBg?: string;
};

function offerVisualMeta(type: string) {
  return offerTypeOptions.find((option) => option.label === type) ?? offerTypeOptions[2];
}

function inlineCountdownText(countdown: ReturnType<typeof getCountdownParts>) {
  if (countdown.expired) return "انتهى";
  if (countdown.days !== "0" && countdown.days !== "--") {
    return `${countdown.days}ي ${countdown.hours}:${countdown.minutes}:${countdown.seconds}`;
  }
  return `${countdown.hours}:${countdown.minutes}:${countdown.seconds}`;
}

function OfferVisual({
  offer,
  now,
  className,
}: {
  offer: OfferVisualData;
  now: number | null;
  className?: string;
}) {
  const meta = offerVisualMeta(offer.type);
  const Icon = offer.icon ?? meta.icon;
  const accent = offer.accent ?? meta.accent;
  const iconBg = offer.iconBg ?? meta.bg;
  const countdown = offer.type === "فلاش" ? getCountdownParts(offer.endsAt, now) : null;

  return (
    <div className={cn("relative isolate overflow-hidden rounded-md border bg-muted", className)}>
      {offer.image ? (
        <DashboardImage
          src={offer.image}
          placeholderType="offer"
          alt=""
          width={800}
          height={300}
          sizes="(min-width: 1280px) 360px, 100vw"
          className="absolute inset-0 size-full"
          imageClassName="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <div className="absolute inset-0 z-20 bg-gradient-to-l from-black/75 via-black/35 to-black/20" />
      <div className="relative z-30 flex h-full min-h-[136px] flex-col justify-between p-3 text-white">
        <div className="flex items-start justify-between gap-3">
          {countdown ? (
            <div
              className={cn(
                "rounded-md border px-2.5 py-2 text-center shadow-sm backdrop-blur",
                countdown.expired
                  ? "border-red-300/30 bg-red-500/25"
                  : "border-white/25 bg-black/35",
              )}
            >
              <div className="text-[11px] font-medium leading-none text-white/75">
                {countdown.expired ? "الحالة" : "متبقي"}
              </div>
              <div className="mt-1 font-mono text-sm font-semibold leading-none">
                {inlineCountdownText(countdown)}
              </div>
            </div>
          ) : (
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md bg-white/90", accent)}>
              <Icon className="size-5" />
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold", iconBg, accent)}>
            <Icon className="size-3.5" />
            {offer.type}
          </span>
        </div>

        <div className="max-w-[76%]">
          <h3 className="truncate text-base font-semibold leading-6">{offer.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">
            {offer.description || "بدون وصف"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function OffersPage() {
  const router = useRouter();
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const { cities: availableServiceCities } = useServiceCities();
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offerDeleteTarget, setOfferDeleteTarget] = useState<OfferCard | null>(null);
  const pendingOfferDeletionIdsRef = useRef<Set<string>>(new Set());
  const pendingDispatchIdsRef = useRef<Map<string, string>>(new Map());
  const [sendingOfferIds, setSendingOfferIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<number | null>(null);
  const [offerSearch, setOfferSearch] = useState("");
  const [offerTypeFilter, setOfferTypeFilter] = useState(allOffersFilterValue);
  const [offerCityFilter, setOfferCityFilter] = useState(allOffersFilterValue);
  const [expandedOfferIds, setExpandedOfferIds] = useState<Record<string, boolean>>({});
  const activeOffers = offers.filter(
    (offer) => offer.backendStatus === "active" && offerDateLifecycle(offer.startsAt, offer.endsAt) === "current",
  ).length;
  const scheduledOffers = offers.filter(
    (offer) => offer.backendStatus === "active" && offerDateLifecycle(offer.startsAt, offer.endsAt) === "scheduled",
  ).length;
  const expiredOffers = offers.filter(
    (offer) => offerDateLifecycle(offer.startsAt, offer.endsAt) === "expired",
  ).length;
  const offerCityOptions = useMemo(() => {
    const cityOptions = new Map<string, string>();

    availableServiceCities
      .filter((city) => city.is_active !== false)
      .forEach((city) => {
      cityOptions.set(String(city.id), city.name);
      });

    return [
      { value: allOffersFilterValue, label: "كل المدن" },
      { value: generalOffersFilterValue, label: "عام" },
      ...Array.from(cityOptions, ([value, label]) => ({ value, label })),
    ];
  }, [availableServiceCities]);
  const filteredOffers = useMemo(() => {
    const search = normalizeOfferFilterText(offerSearch);

    return offers.filter((offer) => {
      const matchesSearch =
        !search ||
        [
          offer.id,
          offer.title,
          offer.description,
          offer.type,
          offer.marketName,
          offer.serviceCityName,
          offer.status,
        ].some((value) => normalizeOfferFilterText(value).includes(search));
      const matchesType =
        offerTypeFilter === allOffersFilterValue || offer.apiType === offerTypeFilter;
      const matchesCity =
        offerCityFilter === allOffersFilterValue ||
        (offerCityFilter === generalOffersFilterValue
          ? offer.showInGeneral
          : offer.serviceCityIds.includes(offerCityFilter));
      return matchesSearch && matchesType && matchesCity;
    });
  }, [offers, offerSearch, offerTypeFilter, offerCityFilter]);

  useEffect(() => {
    const updateCountdown = () => setNow(Date.now());
    const timeoutId = window.setTimeout(updateCountdown, 0);
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const reloadOffers = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);

    try {
      const response = await apiFetch(adminApiPaths.offers);
      const data = await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر تحميل العروض من الباك."));
      setOffers(
        apiList(data)
          .map(offerCardFromApi)
          .filter((offer) => !pendingOfferDeletionIdsRef.current.has(offer.id)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل العروض.";
      setOffersError(message);
      showSnackbar({
        message,
        tone: "danger",
      });
    } finally {
      setOffersLoading(false);
    }
  }, [apiFetch, showSnackbar]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reloadOffers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reloadOffers]);

  async function toggleOfferStatus(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer) return;
    const nextStatus = offer.backendStatus === "active" ? "inactive" : "active";

    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offerId)}/`,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );
      const updated = offerCardFromApi(data as BackendRecord);
    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
          offer.id === offerId ? updated : offer,
      ),
    );
      showSnackbar({ message: "تم تحديث حالة العرض.", tone: "success" });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تحديث العرض.",
        tone: "danger",
      });
    }
  }

  async function sendOfferNotification(offer: OfferCard) {
    if (!offer.canSendNotification || sendingOfferIds.has(offer.id)) return;
    if (!window.confirm("سيتم إرسال إشعار جديد للعملاء المستهدفين بهذا العرض. الإشعارات السابقة ستظل محفوظة.")) return;
    const requestId = pendingDispatchIdsRef.current.get(offer.id) ?? crypto.randomUUID();
    pendingDispatchIdsRef.current.set(offer.id, requestId);
    setSendingOfferIds((current) => new Set(current).add(offer.id));
    try {
      const data = await sendAdminJson(apiFetch, `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/send-notification/`, {
        method: "POST",
        body: JSON.stringify({ request_id: requestId }),
      }) as BackendRecord;
      pendingDispatchIdsRef.current.delete(offer.id);
      const count = Number(data.notification_count ?? data.recipient_count ?? 0);
      setOffers((current) => current.map((item) => item.id === offer.id ? {
        ...item,
        lastNotificationSentAt: typeof data.sent_at === "string" ? data.sent_at : item.lastNotificationSentAt,
        notificationSendCount: item.notificationSendCount + 1,
      } : item));
      showSnackbar({ message: `تم إرسال الإشعار إلى ${count} عميل.`, tone: "success" });
    } catch (error) {
      showSnackbar({ message: error instanceof Error ? error.message : "تعذر إرسال الإشعار.", tone: "danger" });
    } finally {
      setSendingOfferIds((current) => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
    }
  }

  function editOffer(offer: OfferCard) {
    showSnackbar({ message: `تم فتح تعديل ${offer.title}.` });
    router.push(`/offers/create?edit=${offer.id}`);
  }

  function toggleOfferCollapsed(offerId: string) {
    setExpandedOfferIds((current) => ({
      ...current,
      [offerId]: !current[offerId],
    }));
  }

  function deleteOffer(offer: OfferCard) {
    const offerIndex = offers.findIndex((currentOffer) => currentOffer.id === offer.id);
    setOfferDeleteTarget(null);
    queueUndoableDelete({
      message: `تم حذف العرض ${offer.title}.`,
      onDelete: () => {
        pendingOfferDeletionIdsRef.current.add(offer.id);
        setOffers((currentOffers) =>
          currentOffers.filter((currentOffer) => currentOffer.id !== offer.id),
        );
      },
      onUndo: () => {
        pendingOfferDeletionIdsRef.current.delete(offer.id);
        setOffers((currentOffers) => {
          if (currentOffers.some((currentOffer) => currentOffer.id === offer.id)) {
            return currentOffers;
          }
          const nextOffers = [...currentOffers];
          nextOffers.splice(Math.max(0, offerIndex), 0, offer);
          return nextOffers;
        });
      },
      onCommit: async () => {
        await sendAdminJson(
          apiFetch,
          `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/`,
          { method: "DELETE" },
        );
      },
      onCommitError: (error) => {
        showSnackbar({
          message:
            error instanceof Error
              ? translateOfferErrorMessage(error.message)
              : "تعذر حذف العرض.",
          tone: "danger",
        });
      },
    });
  }

  return (
    <div className="px-6 py-8">
      <PageTitle
        title="العروض"
        description="إدارة العروض والخصومات لكل الفروع"
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9" onClick={() => void reloadOffers()} disabled={offersLoading}>
              <RefreshCw className={cn("size-4", offersLoading && "animate-spin")} />
              تحديث
            </Button>
            <Link
              href="/offers/create"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <CheckCircle2 className="size-4" />
              إنشاء عرض
            </Link>
          </div>
        }
      />
      <MetricCards
        cards={[
          ["إجمالي العروض", String(offers.length), Tag, "text-primary"],
          ["نشط", String(activeOffers), CheckCircle2, "text-green-500"],
          ["مجدول", String(scheduledOffers), Calendar, "text-orange-500"],
          ["منتهي", String(expiredOffers), XCircle, "text-destructive"],
        ]}
      />
      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={offerSearch}
              onChange={(event) => setOfferSearch(event.target.value)}
              placeholder="ابحث في العروض..."
              className="h-12 pr-9"
            />
          </div>
          <AppSelect
            value={offerTypeFilter}
            onValueChange={setOfferTypeFilter}
            className="h-12"
            ariaLabel="فلترة حسب نوع العرض"
            options={[
              { value: allOffersFilterValue, label: "كل الأنواع" },
              ...offerTypeOptions.map((option) => ({
                value: offerTypeValues[option.label],
                label: option.label,
              })),
            ]}
          />
          <AppSelect
            value={offerCityFilter}
            onValueChange={setOfferCityFilter}
            className="h-12"
            ariaLabel="فلترة حسب المدينة"
            options={offerCityOptions}
          />
        </div>
        <div className="hidden">
          عرض {filteredOffers.length} من {offers.length} عرض
        </div>
      </Card>
      {offersLoading ? (
        <Card className="mt-6 flex min-h-52 items-center justify-center">
          <Clock className="size-6 animate-spin text-primary" />
        </Card>
      ) : offersError ? (
        <Card className="mt-6 border-destructive/30 bg-destructive/10 shadow-none">
          <div role="alert" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertCircle className="size-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">تعذر تحميل العروض</div>
                <p className="mt-1 text-sm text-muted-foreground">{offersError}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void reloadOffers()} className="self-start sm:self-center">
              <RefreshCcw className="size-4" />
              إعادة المحاولة
            </Button>
          </div>
        </Card>
      ) : offers.length === 0 ? (
        <Card className="mt-6 flex min-h-[420px] items-center justify-center bg-card shadow">
          <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Tag className="size-8" />
            </div>
            <h2 className="mt-6 text-xl font-semibold leading-7">لا توجد عروض حتى الآن</h2>
            <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">سيظهر هنا أول عرض تنشئه للعملاء في تطبيق يلا ماركت.</p>
            <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
              <Link href="/offers/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                <Plus className="size-4" />
                إنشاء أول عرض
              </Link>
            </div>
          </div>
        </Card>
      ) : filteredOffers.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          لا توجد عروض مطابقة للفلاتر الحالية.
        </Card>
      ) : (
      <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {filteredOffers.map((offer) => {
          const Icon = offer.icon;
          const productText = offer.productNames.length
            ? offer.productNames.slice(0, 3).join("، ")
            : offer.productIds.length
              ? `${offer.productIds.length} منتجات`
              : "-";
          const isInactive = offer.backendStatus === "inactive";
          const isExpired = offerDateLifecycle(offer.startsAt, offer.endsAt) === "expired";
          const placement = [
            offer.showInGeneral ? "عام" : "",
            offer.serviceCityIds.length ? offer.serviceCityName : "",
          ].filter(Boolean).join(" + ") || "غير محدد";
          const isCollapsed = !expandedOfferIds[offer.id];

          return (
            <Card
              key={offer.id}
              className={cn(
                "overflow-hidden rounded-lg transition hover:border-primary/35 hover:bg-accent/20",
                isInactive && "border-muted-foreground/20 bg-muted/20 opacity-60 grayscale",
                isExpired && "border-destructive/50 bg-destructive/10 hover:border-destructive/70 hover:bg-destructive/15",
              )}
            >
              <div className={cn("flex flex-col p-4", isCollapsed ? "min-h-0" : "min-h-[410px]")}>
                {isCollapsed ? null : <OfferVisual offer={offer} now={now} className="h-36" />}

                <div className={cn("flex items-start justify-between gap-3", isCollapsed ? "mt-0" : "mt-4")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md", offer.iconBg, offer.accent)}>
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">#{offer.id}</div>
                      <h3 className="mt-1 truncate text-base font-semibold">{offer.title}</h3>
                    </div>
                  </div>
                  <MiniIconButton
                    ariaLabel={isCollapsed ? "فتح تفاصيل العرض" : "طي تفاصيل العرض"}
                    onClick={() => toggleOfferCollapsed(offer.id)}
                  >
                    <ChevronDown className={cn("size-4 transition-transform", isCollapsed && "rotate-180")} />
                  </MiniIconButton>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <RefBadge tone="gray">{offer.type}</RefBadge>
                  <RefBadge tone="blue">{placement}</RefBadge>
                  <RefBadge tone={offer.status === "نشط" ? "green" : offer.status === "منتهي" ? "red" : offer.status === "مجدول" ? "orange" : "yellow"}>
                    {offer.status}
                  </RefBadge>
                </div>

                {isCollapsed ? null : (
                <div className="mt-5 grid gap-3 text-sm">
                  <div className="rounded-md bg-muted/25 px-3 py-2">
                    <div className="text-xs text-muted-foreground">الوصف</div>
                    <div className="mt-1 line-clamp-2 font-medium">{offer.description || "-"}</div>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <OfferInfoRow label="السوق" value={offer.marketName} />
                    <OfferInfoRow
                      label="النطاق"
                      value={[
                        offer.showInGeneral ? "عام" : "",
                        offer.serviceCityIds.length ? "مدن خدمة" : "",
                      ].filter(Boolean).join(" + ") || "-"}
                    />
                    {offer.serviceCityIds.length ? (
                      <OfferInfoRow label="مدن الخدمة" value={offer.serviceCityName} />
                    ) : null}
                    <OfferInfoRow label="المنتجات" value={productText} />
                    <OfferInfoRow label="حد الاستخدام" value={offer.useLimits} />
                    <OfferInfoRow label="حد العميل" value={offer.userLimit} />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-3 py-2">
                    <span className="text-muted-foreground">الفترة</span>
                    <span className="text-end font-medium">{offer.period}</span>
                  </div>
                  <OfferCountdown endsAt={offer.endsAt} now={now} />
                  <OfferInfoRow label="آخر إرسال" value={offer.lastNotificationSentAt ? new Date(offer.lastNotificationSentAt).toLocaleString("ar-EG") : "لم يُرسل"} />
                  <OfferInfoRow label="عدد مرات الإرسال" value={String(offer.notificationSendCount)} />
                </div>
                )}

                <div className={cn("flex items-center justify-between border-t pt-4", isCollapsed ? "mt-4" : "mt-auto")}>
                  <span className="text-xs text-muted-foreground">إجراءات العرض</span>
                  <div className="flex items-center gap-1">
                    <MiniIconButton
                      tone="green"
                      ariaLabel={offer.effectiveStatus === "scheduled" ? "يمكن إرسال الإشعار بعد بداية العرض." : offer.effectiveStatus === "expired" ? "عدّل توقيت العرض أولًا." : offer.effectiveStatus === "inactive" ? "فعّل العرض أولًا." : "إرسال إشعار"}
                      disabled={!offer.canSendNotification || sendingOfferIds.has(offer.id)}
                      onClick={() => void sendOfferNotification(offer)}
                    >
                      <Megaphone className={cn("size-4", sendingOfferIds.has(offer.id) && "animate-pulse")} />
                    </MiniIconButton>
                    {offer.backendStatus === "inactive" ? (
                      <MiniIconButton
                        tone="green"
                        ariaLabel="تشغيل العرض"
                        onClick={() => toggleOfferStatus(offer.id)}
                      >
                        <PlayCircle className="size-4" />
                      </MiniIconButton>
                    ) : offer.backendStatus === "active" ? (
                      <MiniIconButton
                        tone="orange"
                        ariaLabel="إيقاف العرض مؤقتا"
                        onClick={() => toggleOfferStatus(offer.id)}
                      >
                        <PauseCircle className="size-4" />
                      </MiniIconButton>
                    ) : null}
                    <MiniIconButton ariaLabel="تعديل العرض" onClick={() => editOffer(offer)}>
                      <Edit className="size-4" />
                    </MiniIconButton>
                    <MiniIconButton tone="red" ariaLabel="حذف العرض" onClick={() => setOfferDeleteTarget(offer)}>
                      <Trash2 className="size-4" />
                    </MiniIconButton>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
      {offerDeleteTarget ? (
        <OfferDeleteModal
          offer={offerDeleteTarget}
          deleting={false}
          onClose={() => setOfferDeleteTarget(null)}
          onConfirm={() => deleteOffer(offerDeleteTarget)}
        />
      ) : null}
    </div>
  );
}

function OfferInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-end font-semibold">{value}</span>
    </div>
  );
}

function OfferDeleteModal({
  offer,
  deleting,
  onClose,
  onConfirm,
}: {
  offer: OfferCard;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-offer-title"
        className="w-full max-w-md overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="border-b px-5 py-4">
          <h2 id="delete-offer-title" className="text-base font-bold">
            حذف العرض
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{offer.title}</p>
        </div>
        <div className="flex justify-end gap-2 p-5">
          <Button type="button" variant="outline" disabled={deleting} onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" disabled={deleting} onClick={onConfirm}>
            {deleting ? "جار الحذف..." : "حذف"}
          </Button>
        </div>
      </div>
    </div>
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
  quantity: number;
};

function parseItemPrice(price: string) {
  const value = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function itemDisplayPrice(item: ItemRow) {
  return typeof item.displayPrice === "number" && Number.isFinite(item.displayPrice)
    ? item.displayPrice
    : parseItemPrice(item.price);
}

function itemPriceLabel(item: ItemRow) {
  return item.displayPriceLabel ?? item.price;
}

function selectedItemFrom(rows: ItemRow[], itemId: string): ItemRow | null {
  return rows.find((item) => item.id === itemId) ?? null;
}

function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function discountedItemPrice(item: ItemRow, discountPercent: number) {
  return itemDisplayPrice(item) * (1 - clampDiscountPercent(discountPercent) / 100);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-foreground/45 px-4 py-6 backdrop-blur-sm">
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
  badgeTone,
  discountPercent,
  contextLabel = "العرض",
}: {
  title: string;
  description: string;
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  badgeTone: "green" | "yellow" | "blue" | "red" | "purple" | "orange" | "gray";
  discountPercent?: number;
  contextLabel?: string;
}) {
  const { products } = useContext(OfferProductsContext);
  const { showSnackbar } = useSnackbar();
  const [productsOpen, setProductsOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const selectedItem = selectedItemId
    ? products.find((item) => item.id === selectedItemId) ?? null
    : null;
  const hasSelectedProduct = Boolean(selectedItem);
  const productTotal =
    selectedItem && typeof discountPercent === "number"
      ? discountedItemPrice(selectedItem, discountPercent) * quantity
      : selectedItem
        ? itemDisplayPrice(selectedItem) * quantity
        : 0;
  const singleLine: BundleLine = {
    id: `single-${selectedItemId || "empty"}`,
    itemId: selectedItemId,
    quantity,
  };

  function selectSingleProduct(itemId: string) {
    onSelectItem(itemId);
    setProductSearchOpen(false);
  }

  function removeSingleProduct() {
    if (selectedItem) {
      showSnackbar({ message: `تم حذف ${selectedItem.name} من ${contextLabel}.`, tone: "danger" });
    }
    onSelectItem("");
    setProductsOpen(false);
    setQuantity(1);
  }

  function updateSingleLine(patch: Partial<BundleLine>) {
    if (patch.itemId) {
      onSelectItem(patch.itemId);
    }

    if (typeof patch.quantity === "number") {
      setQuantity(Math.max(1, Math.min(99, patch.quantity)));
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
              {selectedItem?.name ?? "لم يتم اختيار منتج بعد."}
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
  onChange,
  onRemove,
}: {
  line: BundleLine;
  item: ItemRow;
  lineTotal: number;
  canRemove: boolean;
  contextLabel?: string;
  discountPercent?: number;
  onChange: (patch: Partial<BundleLine>) => void;
  onRemove: () => void;
}) {
  const unitPrice = itemDisplayPrice(item);
  const hasDiscount = typeof discountPercent === "number";
  const discountedPrice = hasDiscount
    ? discountedItemPrice(item, discountPercent)
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
              السعر الأصلي: {formatReferenceCurrency(unitPrice)}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <ProductPicker
            label={`المنتج داخل ${contextLabel}`}
            value={line.itemId}
            onChange={(itemId) => onChange({ itemId })}
          />

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

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatTimeInputValue(date: Date) {
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatLocalIsoDateTime(date: Date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetRemainderMinutes = absoluteOffset % 60;

  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
    `${sign}${padDatePart(offsetHours)}:${padDatePart(offsetRemainderMinutes)}`,
  ].join("");
}

function currentScheduleValues() {
  const now = new Date();

  return {
    date: formatDateInputValue(now),
    time: formatTimeInputValue(now),
  };
}

const calendarWeekDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDateDisplay(value: string) {
  const date = parseDateInputValue(value);

  if (!date) {
    return "اختر التاريخ";
  }

  return `${padDatePart(date.getMonth() + 1)}/${padDatePart(date.getDate())}/${date.getFullYear()}`;
}

function dateInputValueFromDate(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function isSameCalendarDay(left: Date | null, right: Date) {
  return (
    Boolean(left) &&
    left?.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarMonthDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function ScheduleDateField({
  value,
  onChange,
  ariaLabel,
  rangeStart,
  rangeEnd,
  open: controlledOpen,
  onOpenChange,
  popoverClassName,
  popoverAlign = "start",
  compactCalendar = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  rangeStart?: string;
  rangeEnd?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  popoverClassName?: string;
  popoverAlign?: "start" | "end";
  compactCalendar?: boolean;
}) {
  const selectedDate = parseDateInputValue(value);
  const rangeStartDate = parseDateInputValue(rangeStart ?? "");
  const rangeEndDate = parseDateInputValue(rangeEnd ?? "");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const days = useMemo(() => buildCalendarMonthDays(viewDate), [viewDate]);
  const range =
    rangeStartDate && rangeEndDate
      ? rangeStartDate <= rangeEndDate
        ? { start: rangeStartDate, end: rangeEndDate }
        : { start: rangeEndDate, end: rangeStartDate }
      : null;

  function setCalendarOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function moveMonth(direction: -1 | 1) {
    setViewDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(currentDate.getMonth() + direction);
      return nextDate;
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open && selectedDate) {
            setViewDate(selectedDate);
          }

          setCalendarOpen(!open);
        }}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-4 text-start text-base font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span dir="ltr">{formatDateDisplay(value)}</span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          dir="rtl"
          className={cn(
            "absolute top-full z-40 mt-2 w-[min(24rem,calc(100vw-4rem))] max-w-full rounded-lg border border-border/80 bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/25",
            popoverAlign === "start" ? "start-0" : "end-0",
            popoverClassName,
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="الشهر السابق"
              onClick={() => moveMonth(-1)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="text-sm font-bold">
              {viewDate.getFullYear()} {arabicMonthNames[viewDate.getMonth()]}
            </div>
            <button
              type="button"
              aria-label="الشهر التالي"
              onClick={() => moveMonth(1)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {calendarWeekDays.map((day) => (
              <div key={day} className="h-7 truncate leading-7">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const currentMonth = day.getMonth() === viewDate.getMonth();
              const selected = isSameCalendarDay(selectedDate, day);
              const rangeEndpoint =
                isSameCalendarDay(range?.start ?? null, day) ||
                isSameCalendarDay(range?.end ?? null, day);
              const inRange = range
                ? startOfDay(day) >= startOfDay(range.start) &&
                  startOfDay(day) <= startOfDay(range.end)
                : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(dateInputValueFromDate(day));
                    setCalendarOpen(false);
                  }}
                  className={cn(
                    "grid place-items-center rounded-md text-sm font-semibold transition",
                    compactCalendar ? "h-9" : "h-11",
                    currentMonth && !range
                      ? "bg-muted/35 text-primary hover:bg-primary/15 hover:text-primary"
                      : "text-foreground hover:bg-muted/30",
                    currentMonth &&
                      range &&
                      inRange &&
                      !rangeEndpoint &&
                      "bg-muted/35 text-primary hover:bg-primary/15 hover:text-primary",
                    currentMonth && range && !inRange && "text-foreground",
                    !currentMonth && "text-muted-foreground/45 hover:bg-muted/30",
                    (selected || rangeEndpoint) &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTimeDisplay(value: string) {
  const [rawHours, rawMinutes] = value.split(":").map(Number);

  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) {
    return "اختر الوقت";
  }

  const period = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${padDatePart(hours)}:${padDatePart(rawMinutes)} ${period}`;
}

const scheduleHourOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const scheduleMinuteOptions = Array.from({ length: 60 }, (_, index) => index);
const schedulePeriodOptions = ["AM", "PM"] as const;

function parseTimeParts(value: string) {
  const [rawHours, rawMinutes] = value.split(":").map(Number);
  const validHours = Number.isFinite(rawHours) && rawHours >= 0 && rawHours <= 23;
  const validMinutes = Number.isFinite(rawMinutes) && rawMinutes >= 0 && rawMinutes <= 59;
  const hours24 = validHours ? rawHours : 12;
  const minutes = validMinutes ? rawMinutes : 0;
  const period: (typeof schedulePeriodOptions)[number] = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return { hours12, minutes, period };
}

function timeValueFromParts(
  hours12: number,
  minutes: number,
  period: (typeof schedulePeriodOptions)[number],
) {
  const normalizedHours = hours12 === 12 ? 0 : hours12;
  const hours24 = period === "PM" ? normalizedHours + 12 : normalizedHours;

  return `${padDatePart(hours24)}:${padDatePart(minutes)}`;
}

function ScheduleTimeField({
  value,
  onChange,
  ariaLabel,
  open: controlledOpen,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const { hours12, minutes, period } = parseTimeParts(value);

  function setTimeOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function updateTime(
    nextParts: Partial<{
      hours12: number;
      minutes: number;
      period: (typeof schedulePeriodOptions)[number];
    }>,
  ) {
    onChange(
      timeValueFromParts(
        nextParts.hours12 ?? hours12,
        nextParts.minutes ?? minutes,
        nextParts.period ?? period,
      ),
    );
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${formatTimeDisplay(value)}`}
        onClick={() => setTimeOpen(!open)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-4 text-start text-base font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span dir="ltr">{formatTimeDisplay(value)}</span>
        <Clock className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          dir="rtl"
          className="absolute end-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-4rem))] max-w-full overflow-hidden rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-2xl shadow-black/25"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-3 py-3">
            <div>
              <div className="text-sm font-bold">{ariaLabel}</div>
              <div className="mt-1 text-xs text-muted-foreground">اختار الوقت المناسب للعرض</div>
            </div>
            <div className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 font-mono text-sm font-bold text-primary">
              {formatTimeDisplay(value)}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_76px] gap-3 p-3">
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الساعة</div>
              <div className="grid max-h-48 gap-1 overflow-y-auto pe-1">
                {scheduleHourOptions.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => updateTime({ hours12: hour })}
                    className={cn(
                      "h-9 rounded-md text-sm font-semibold transition hover:bg-accent hover:text-foreground",
                      hours12 === hour
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : "bg-muted/25 text-foreground",
                    )}
                  >
                    {padDatePart(hour)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الدقيقة</div>
              <div className="grid max-h-48 gap-1 overflow-y-auto pe-1">
                {scheduleMinuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => updateTime({ minutes: minute })}
                    className={cn(
                      "h-9 rounded-md font-mono text-sm font-semibold transition hover:bg-accent hover:text-foreground",
                      minutes === minute
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : "bg-muted/25 text-foreground",
                    )}
                  >
                    {padDatePart(minute)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الفترة</div>
              <div className="grid gap-2">
                {schedulePeriodOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime({ period: option })}
                    className={cn(
                      "h-12 rounded-md border text-sm font-bold transition hover:border-primary/40 hover:bg-accent",
                      period === option
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTimeOpen(false)}
                className="mt-3 h-10 w-full rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
  const [discountPercent, setDiscountPercent] = useState("20");
  const [flashProductIds, setFlashProductIds] = useState<string[]>([]);
  const [flashDiscountPercent, setFlashDiscountPercent] = useState("30");
  const [deliveryProductId, setDeliveryProductId] = useState("");
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
    return total + (item ? itemDisplayPrice(item) : 0) * line.quantity;
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
    setFlashProductIds([]);
    setDeliveryProductId("");
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
          quantity: 1,
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

  function selectedOfferItems() {
    if (selectedType === "باكج") {
      return bundleItems
        .map((line) => selectedItemFrom(offerProducts, line.itemId))
        .filter((item): item is ItemRow => Boolean(item));
    }
    if (selectedType === "فلاش") {
      return flashProductIds
        .map((itemId) => offerProducts.find((item) => item.id === itemId))
        .filter((item): item is ItemRow => Boolean(item));
    }
    if (selectedType === "توصيل") {
      const item = offerProducts.find((currentItem) => currentItem.id === deliveryProductId);
      return item ? [item] : [];
    }
    if (selectedType === "إعلان") {
      return [];
    }
    const item = offerProducts.find((currentItem) => currentItem.id === discountProductId);
    return item ? [item] : [];
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
    const selectedItems = selectedOfferItems();
    const productIds = Array.from(
      new Set(selectedItems.map((item) => Number(item.id)).filter(Number.isFinite)),
    );
    if (selectedType !== "إعلان" && !productIds.length) {
      showSnackbar({ message: "اختر منتجًا واحدًا على الأقل", tone: "danger" });
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
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

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
      const response = offerImageFile
        ? await apiFetch(offerPath, {
            method,
            body: (() => {
              const formData = new FormData();
              if (selectedType !== "إعلان") formData.append("market_id", String(inferredMarketId));
              formData.append("show_in_general", String(payload.show_in_general));
              formData.append("service_city_ids", JSON.stringify(payload.service_city_ids));
              formData.append("product_ids", JSON.stringify(payload.product_ids));
              formData.append("title", payload.title);
              formData.append("description", payload.description);
              formData.append("type", payload.type);
              formData.append("discount", payload.discount);
              formData.append("start_time", payload.start_time);
              formData.append("end_time", payload.end_time);
              formData.append("active_days", JSON.stringify(payload.active_days));
              formData.append("announcement_url", payload.announcement_url);
              formData.append("announcement_cta_label", payload.announcement_cta_label);
              formData.append("announcement_priority", String(payload.announcement_priority));
              formData.append("announcement_display_seconds", String(payload.announcement_display_seconds));
              formData.append("send_push_notification", String(payload.send_push_notification));
              if (payload.use_limits !== null) formData.append("use_limits", String(payload.use_limits));
              if (payload.user_limit !== null) formData.append("user_limit", String(payload.user_limit));
              formData.append("image", offerImageFile);
              return formData;
            })(),
          })
        : await apiFetch(offerPath, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await readApiData(response);
      if (!response.ok) {
        throw new Error(apiErrorMessage(data, "تعذر حفظ العرض."));
      }
      const savedOffer = offerCardFromApi(data as BackendRecord);
      showSnackbar({
        message:
          formMode === "edit"
            ? "تم حفظ تعديل العرض بنجاح."
            : "تم إنشاء العرض بنجاح.",
        tone: "success",
      });
      if (sendPushNotification) {
        if (!savedOffer.canSendNotification) {
          showSnackbar({ message: "تم حفظ العرض، لكن لا يمكن إرسال الإشعار قبل أن يصبح العرض نشطًا.", tone: "danger" });
        } else {
          const requestId = crypto.randomUUID();
          try {
            const dispatch = await sendAdminJson(
              apiFetch,
              `${adminApiPaths.offers}${encodeURIComponent(savedOffer.id)}/send-notification/`,
              { method: "POST", body: JSON.stringify({ request_id: requestId }) },
            ) as BackendRecord;
            showSnackbar({ message: `تم إرسال الإشعار إلى ${Number(dispatch.notification_count ?? 0)} عميل.`, tone: "success" });
          } catch {
            showSnackbar({ message: "تم حفظ العرض، لكن تعذر إرسال الإشعار.", tone: "danger" });
          }
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
            setFlashProductIds(productIds);
            setFlashDiscountPercent(String(record.discount ?? "0"));
          } else if (card.type === "باكج") {
            setBundleItems(productIds.map((itemId) => ({ id: `bundle-${itemId}`, itemId, quantity: 1 })));
            setPackageDiscountPercent(String(record.discount ?? "0"));
          } else if (card.type === "توصيل") {
            setDeliveryProductId(productIds[0] ?? "");
          } else if (card.type !== "إعلان") {
            setDiscountProductId(productIds[0] ?? "");
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
                        const lineTotal = (item ? itemDisplayPrice(item) : 0) * line.quantity;

                        return (
                          <PackageProductCard
                            key={line.id}
                            line={line}
                            item={item}
                            lineTotal={lineTotal}
                            canRemove
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 px-4 py-6 backdrop-blur-sm">
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
