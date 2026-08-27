"use client";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";

import {
  getDeliveryDestination,
  getDeliveryPriceLabel,
  getDeliveryTypeLabel,
  getMarketCount,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  isMultiMarket,
} from "../order-display";
import { Badge, Card, CurrencyText, Input } from "../primitives";
import {
  courierCustomerName,
  courierDateTime,
  courierMoney,
  courierOrderNumber,
  courierOrderStatusLabels,
  courierOrderStatusTone,
} from "./domain";
import type { CourierOrder } from "./types";

export function CourierOrdersTable({ orders, query, onQueryChange }: {
  orders: CourierOrder[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between"><div><div className="font-semibold">كل طلبات الطيار</div><div className="mt-1 text-xs text-muted-foreground">الطلبات النشطة والمسلمة مع العميل والعنوان والتوقيت</div></div><label className="relative w-full md:w-120"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="ابحث برقم الطلب أو العميل..." className="h-10 border-border/70 bg-muted/20 ps-9 placeholder:text-muted-foreground/60" /></label></div>
      {orders.length ? (
        <div className="overflow-x-auto"><table className="w-full min-w-270 text-sm"><thead><tr className="border-b bg-muted/25 text-xs text-muted-foreground"><th className="px-4 py-3 text-start">الطلب</th><th className="w-60 px-4 py-3 text-center">العميل</th><th className="px-4 py-3 text-start">محلات الطلب</th><th className="px-4 py-3 text-start">وجهة التوصيل</th><th className="px-4 py-3 text-start">الحالة</th><th className="px-4 py-3 text-start">الإجمالي</th><th className="px-4 py-3 text-start">الإسناد</th><th className="px-4 py-3 text-start">التسليم</th><th className="px-4 py-3 text-start" /></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20">
            <td className="px-4 py-4"><Link href={`/orders/view/${order.id}`} className="font-semibold text-primary hover:underline" dir="ltr">{courierOrderNumber(order)}</Link><div className="mt-2 flex flex-wrap gap-1"><Badge tone="secondary">{getOrderScopeLabel(order)}</Badge><Badge tone={isMultiMarket(order) ? "green" : "secondary"}>{isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}</Badge></div></td>
            <td className="w-60 px-4 py-4 text-center align-middle"><div className="mx-auto flex min-w-0 max-w-[210px] flex-col items-center gap-1 text-center"><div className="w-full truncate text-center font-bold leading-6 text-foreground">{courierCustomerName(order)}</div><div className="w-full break-all text-center text-xs leading-5 text-muted-foreground" dir="ltr">{order.customer?.phone ?? "-"}</div></div></td>
            <td className="px-4 py-4"><div>{getOrderMarketsSummary(order)}</div><div className="mt-1 text-xs text-muted-foreground">عدد المحلات: {getMarketCount(order) || "-"}</div></td>
            <td className="max-w-56 px-4 py-4"><div>{getDeliveryDestination(order)}</div><div className="mt-1 text-xs text-muted-foreground">{getDeliveryTypeLabel(order)} - {getDeliveryPriceLabel(order)}</div></td>
            <td className="px-4 py-4"><Badge tone={courierOrderStatusTone(order.status)}>{courierOrderStatusLabels[order.status]}</Badge></td>
            <td className="px-4 py-4 font-semibold" dir="ltr"><CurrencyText>{courierMoney(order.total_price)}</CurrencyText></td>
            <td className="px-4 py-4">{courierDateTime(order.assigned_at)}</td><td className="px-4 py-4">{courierDateTime(order.delivered_at)}</td>
            <td className="px-4 py-4 text-end"><Link href={`/orders/view/${order.id}`} className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label={`فتح الطلب ${courierOrderNumber(order)}`} title="فتح الطلب"><ExternalLink className="size-4" /></Link></td>
          </tr>)}
        </tbody></table></div>
      ) : <div className="flex min-h-44 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">لا توجد طلبات مطابقة لهذا الطيار.</div>}
    </Card>
  );
}
