"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Mail, MapPin, PackageCheck, Phone, RefreshCw, Truck, UserRound } from "lucide-react";

import { DashboardImage } from "../dashboard-image";
import { getDeliveryDestination, getOrderMarketsSummary, getOrderScopeLabel, isMultiMarket } from "../order-display";
import { Badge, Button, Card, CurrencyText } from "../primitives";
import { displayLocalPhone } from "../users/account-fields";
import { fullNameFromBackendUser, type BackendDashboardUser } from "../users/api-users";
import {
  courierCustomerName,
  courierDateTime,
  courierMoney,
  courierOrderNumber,
  courierOrderStatusLabels,
  courierOrderStatusTone,
} from "./domain";
import type { CourierOrder } from "./types";

function SummaryMetric({ title, value, icon, detail }: { title: string; value: string | number; icon: React.ReactNode; detail: string }) {
  return <Card className="p-4"><div className="flex items-center justify-between gap-4"><div><div className="text-xs font-semibold text-muted-foreground">{title}</div><CurrencyText className="mt-2 block text-2xl font-extrabold">{value}</CurrencyText><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span></div></Card>;
}

function InfoRow({ label, value, dir }: { label: string; value: React.ReactNode; dir?: "ltr" | "rtl" }) {
  return <div className="flex min-h-11 items-center justify-between gap-4 border-b py-2 text-sm last:border-0"><span className="shrink-0 text-muted-foreground">{label}</span><span dir={dir} className="min-w-0 break-words text-start font-semibold">{value || "غير محدد"}</span></div>;
}

function FeaturedOrder({ title, description, order, emptyText }: { title: string; description: string; order?: CourierOrder; emptyText: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b bg-muted/25 px-5 py-4"><div><div className="font-semibold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{description}</div></div><PackageCheck className="size-5 shrink-0 text-primary" /></div>
      {order ? <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/orders/view/${order.id}`} dir="ltr" className="font-bold text-primary hover:underline">{courierOrderNumber(order)}</Link><div className="mt-1 text-sm font-semibold">{courierCustomerName(order)}</div><div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone="secondary">{getOrderScopeLabel(order)}</Badge><Badge tone={isMultiMarket(order) ? "green" : "secondary"}>{isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}</Badge></div><div className="mt-2 text-xs text-muted-foreground">{getOrderMarketsSummary(order)} - {getDeliveryDestination(order)}</div></div><Badge tone={courierOrderStatusTone(order.status)}>{courierOrderStatusLabels[order.status]}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm"><div><div className="text-xs text-muted-foreground">الإجمالي</div><CurrencyText className="mt-1 block font-bold">{courierMoney(order.total_price)}</CurrencyText></div><div><div className="text-xs text-muted-foreground">{order.status === "delivered" ? "وقت التسليم" : "وقت الإسناد"}</div><div className="mt-1 font-bold">{courierDateTime(order.delivered_at ?? order.assigned_at)}</div></div></div>{order.delivery_note ? <div className="mt-4 rounded-md border bg-muted/25 px-3 py-2 text-sm"><span className="text-muted-foreground">ملاحظة التسليم: </span>{order.delivery_note}</div> : null}</div> : <div className="flex min-h-40 items-center justify-center px-5 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>}
    </Card>
  );
}

export function CourierDetailSummary({ courier, orders, activeOrders, deliveredOrders, deliveredTotal, onReload }: {
  courier: BackendDashboardUser;
  orders: CourierOrder[];
  activeOrders: CourierOrder[];
  deliveredOrders: CourierOrder[];
  deliveredTotal: number;
  onReload: () => void;
}) {
  const profile = courier.courier_profile;
  const hasSignedIn = courier.last_login != null;
  const isAvailable = courier.is_active !== false && profile?.is_available !== false;
  const maxActiveOrders = profile?.max_active_orders ?? 0;
  return <>
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex min-w-0 items-center gap-4"><DashboardImage src={courier.avatar_url} placeholderType="courier" alt={fullNameFromBackendUser(courier)} width={72} height={72} className="size-18 shrink-0 overflow-hidden rounded-full border bg-muted" imageClassName="object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-semibold">{fullNameFromBackendUser(courier)}</h1><Badge tone={!hasSignedIn ? "blue" : isAvailable ? "green" : "red"}>{!hasSignedIn ? "لم يسجل الحساب بعد" : isAvailable ? "متاح" : "غير متاح"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">ملف الطيار والطلبات الحالية والسابقة</p></div></div><div className="flex shrink-0 flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={onReload}><RefreshCw className="size-4" />تحديث</Button><Link href="/delivery/couriers" className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-accent"><ArrowRight className="size-4" />الرجوع للطيارين</Link></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryMetric title="الطلبات المسندة" value={orders.length} detail="إجمالي سجل الطيار" icon={<Truck className="size-5" />} /><SummaryMetric title="جاري التسليم" value={activeOrders.length} detail={`${maxActiveOrders || "-"} الحد الأقصى النشط`} icon={<Clock3 className="size-5" />} /><SummaryMetric title="تم التسليم" value={deliveredOrders.length} detail="طلبات تم تسليمها" icon={<CheckCircle2 className="size-5" />} /><SummaryMetric title="قيمة الطلبات المسلمة" value={courierMoney(deliveredTotal)} detail="إجمالي قيمة الطلبات" icon={<CalendarDays className="size-5" />} /></div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]"><div className="grid content-start gap-5"><Card className="overflow-hidden"><div className="flex items-center gap-2 border-b bg-muted/25 px-5 py-4 font-semibold"><UserRound className="size-4 text-primary" />بيانات الطيار</div><div className="px-5 py-2"><InfoRow label="اسم المستخدم" value={courier.username} /><InfoRow label="الهاتف" value={courier.phone ? <a href={`tel:${courier.phone}`} className="text-primary hover:underline"><Phone className="me-1 inline size-3.5" />{displayLocalPhone(courier.phone)}</a> : null} dir="ltr" /><InfoRow label="البريد" value={courier.email ? <a href={`mailto:${courier.email}`} className="text-primary hover:underline"><Mail className="me-1 inline size-3.5" />{courier.email}</a> : null} dir="ltr" /><InfoRow label="المركبة" value={profile?.vehicle_type} /><InfoRow label="رقم اللوحة" value={profile?.plate_number} dir="ltr" /><InfoRow label="مدينة التشغيل" value={<><MapPin className="me-1 inline size-3.5 text-primary" />{profile?.service_city_name}</>} /><InfoRow label="التوفر" value={profile?.is_available === false ? "غير متاح" : "متاح"} /><InfoRow label="السعة النشطة" value={`${activeOrders.length} من ${maxActiveOrders || "-"}`} /><InfoRow label="تاريخ الانضمام" value={courierDateTime(courier.created_at)} /></div></Card></div><div className="grid gap-5 md:grid-cols-2"><FeaturedOrder title="الطلب الجاري تسليمه" description="أحدث طلب نشط ومسند للطيار" order={activeOrders[0]} emptyText="لا يوجد طلب قيد التسليم الآن." /><FeaturedOrder title="آخر طلب تم تسليمه" description="أحدث عملية تم تسليمها" order={deliveredOrders[0]} emptyText="لم يسلم الطيار أي طلب حتى الآن." /></div></div>
  </>;
}
