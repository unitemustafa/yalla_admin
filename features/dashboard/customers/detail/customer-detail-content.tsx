import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Eye,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";

import { formatMoney } from "../../admin-api";
import { DashboardImage } from "../../dashboard-image";
import {
  Badge,
  Button,
  Card,
  CurrencyText,
  PageTitle,
  Switch,
} from "../../primitives";
import type { DashboardUser } from "../../users/types";
import { unavailableCustomerValue } from "./domain";
import { CustomerOrdersSection } from "./customer-orders-section";
import type { CustomerRecentOrder } from "./types";

export function CustomerDetailContent({
  user,
  orders,
  activationPending,
  onActivationChange,
  onRefresh,
}: {
  user: DashboardUser;
  orders: CustomerRecentOrder[];
  activationPending: boolean;
  onActivationChange: (checked: boolean) => void;
  onRefresh: () => void;
}) {
  const hasOrderData = orders.length > 0;
  const orderCount = user.orders.toLocaleString("en-US");
  const totalSpentValue =
    user.totalSpent === unavailableCustomerValue
      ? unavailableCustomerValue
      : formatMoney(user.totalSpent);
  const lastOrder = hasOrderData ? orders[0].number : user.lastOrder;
  const active = user.active !== false;
  const hasSignedIn = user.hasSignedIn !== false;
  const statusTone = !hasSignedIn ? "blue" : active ? "green" : "red";

  return (
    <div className="space-y-6 px-6 py-10">
      <PageTitle
        title={user.name}
        description="ملف بيانات الحساب الخاص بعميل تطبيق يلا ماركت"
        size="compact"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={onRefresh}
              aria-label="تحديث بيانات العميل"
              title="تحديث بيانات العميل"
            >
              <RefreshCcw className="size-4" />
              تحديث
            </Button>
            <Link
              href="/customers"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowRight className="size-4" />
              رجوع للعملاء
            </Link>
          </div>
        }
      />

      <Card className="overflow-hidden shadow">
        <div className="flex flex-col gap-5 border-b p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <DashboardImage
              src={user.avatar}
              placeholderType="user"
              alt={user.name}
              width={80}
              height={80}
              priority
              className="size-20 rounded-2xl border"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold leading-8">
                  {user.name}
                </h2>
                <Badge tone={statusTone}>
                  {hasSignedIn ? user.status : "لم يسجل الحساب بعد"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
            title={
              !hasSignedIn
                ? "يتاح التعطيل بعد أول تسجيل دخول للحساب."
                : undefined
            }
          >
            <Switch
              checked={active}
              disabled={activationPending || !hasSignedIn}
              onCheckedChange={onActivationChange}
            />
            <span className="text-sm font-semibold">
              {active ? "مفعّل" : "معطّل"}
            </span>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-3">
          <DetailBlock
            icon={<Mail className="size-4" />}
            label="البريد الإلكتروني"
            value={user.email}
            extraValue={
              user.username === "غير متاح" ? undefined : `@${user.username}`
            }
            dir="ltr"
          />
          <DetailBlock
            icon={<Phone className="size-4" />}
            label="رقم الهاتف"
            value={user.phone}
            dir="ltr"
          />
          <DetailBlock
            icon={<MapPin className="size-4" />}
            label="الموقع"
            value={user.location}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard
          title="نشاط الطلبات"
          icon={<ShoppingCart className="size-4" />}
        >
          <InfoRow
            label="عدد الطلبات"
            href={hasOrderData ? "#user-orders" : undefined}
            value={
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                {orderCount}
                {hasOrderData ? <Eye className="size-4" /> : null}
              </span>
            }
          />
          <InfoRow
            label="إجمالي الإنفاق"
            value={<CurrencyText>{totalSpentValue}</CurrencyText>}
          />
          <InfoRow label="آخر طلب" value={lastOrder} />
        </InfoCard>

        <InfoCard title="التوقيتات" icon={<CalendarClock className="size-4" />}>
          <InfoRow label="تاريخ الانضمام" value={user.joinedAt} />
          <InfoRow label="آخر تسجيل دخول" value={user.lastLogin} />
          <InfoRow
            label="آخر تحديث"
            value={user.updatedAt ?? unavailableCustomerValue}
          />
        </InfoCard>
      </div>

      <CustomerOrdersSection orders={orders} hasOrderData={hasOrderData} />
    </div>
  );
}

function DetailBlock({
  icon,
  label,
  value,
  extraValue,
  dir,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  extraValue?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex min-h-24 items-center gap-3 border-b p-6 md:border-b-0 md:border-e">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className="mt-1 flex min-w-0 flex-wrap items-center gap-2"
          dir={dir}
        >
          <span className="truncate text-sm font-medium">{value}</span>
          {extraValue ? (
            <span className="shrink-0 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {extraValue}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 shadow">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: ReactNode;
  href?: string;
}) {
  const className =
    "flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} rounded-md transition hover:bg-muted/40`}
      >
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </Link>
    );
  }

  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
