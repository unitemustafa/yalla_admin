"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Copy, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEgyptPhoneForDisplay, getDashboardOrderTypeLabel, getDeliveryDestination, getManualArea, getManualCity, getMarketCount, isGeneralOrder, isMultiMarket } from "../../order-display";
import { Button, Card } from "../../primitives";
import { statusLabels } from "../constants";
import {
  customerHref,
  customerName,
  dateTime,
  deliveryAreaName,
  deliveryFeeLabel,
  deliveryTypeLabel,
  fulfillmentLabel,
  marketName,
  money,
  multiMarketFeeTitle,
  orderLocationCoordinates,
  orderMapUrl,
  paymentMethodLabel,
  reviewStatusLabel,
  serviceCityName,
} from "../formatters";
import { SummaryRow } from "../summary";
import type { BackendOrder } from "../types";

export function OrderInformationCard({ order, onCopyLocation }: { order: BackendOrder; onCopyLocation: () => void }) {
  const [open, setOpen] = useState(false);
  const coordinates = orderLocationCoordinates(order);
  const mapUrl = orderMapUrl(order);
  return (
    <Card className="p-5 text-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-start font-semibold transition hover:bg-muted/40">
        <span>بيانات الطلب</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="mt-3">
          <SummaryRow label="رقم الطلب" value={String(order.id)} />
          <SummaryRow label="حالة الطلب" value={statusLabels[order.status]} />
          <SummaryRow label="العميل" value={<Link href={customerHref(order)} className="max-w-56 truncate font-semibold text-primary hover:underline">{customerName(order)}</Link>} />
          <SummaryRow label="الهاتف" value={<span dir="ltr" className="[unicode-bidi:plaintext]">{formatEgyptPhoneForDisplay(order.customer?.phone)}</span>} />
          <SummaryRow label="طريقة الدفع" value={paymentMethodLabel(order.payment_method || "cash")} />
          <SummaryRow label="شركة الشحن" value={order.shipping_company?.name?.trim() || "-"} />
          <SummaryRow label="نوع الطلب" value={getDashboardOrderTypeLabel(order)} />
          <SummaryRow label="حالة المراجعة" value={reviewStatusLabel(order.review_status)} />
          <SummaryRow label="محلات الطلب" value={marketName(order)} />
          <SummaryRow label="عدد المحلات" value={String(getMarketCount(order) || "-")} />
          <SummaryRow label="متعدد المحلات" value={isMultiMarket(order) ? "نعم" : "لا"} />
          <SummaryRow label="ملخص المحلات" value={marketName(order)} />
          <SummaryRow label="المدينة" value={isGeneralOrder(order) ? getManualCity(order) : serviceCityName(order)} />
          <SummaryRow label="المنطقة" value={deliveryAreaName(order)} />
          <SummaryRow label="عنوان التوصيل" value={getDeliveryDestination(order)} />
          {coordinates && mapUrl ? (
            <SummaryRow label="موقع الخريطة" value={<div className="flex max-w-60 flex-wrap items-center justify-end gap-2"><span dir="ltr" className="text-xs tabular-nums text-muted-foreground">{coordinates.latitude}, {coordinates.longitude}</span><Button type="button" variant="outline" className="h-8 px-2" onClick={onCopyLocation}><Copy className="size-3.5" />نسخ</Button><a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs font-semibold text-primary transition hover:bg-accent"><ExternalLink className="size-3.5" />فتح الخريطة</a></div>} />
          ) : <SummaryRow label="موقع الخريطة" value="لا توجد إحداثيات محفوظة" />}
          {isGeneralOrder(order) ? <><SummaryRow label="المدينة اليدوية" value={getManualCity(order)} /><SummaryRow label="المنطقة اليدوية" value={getManualArea(order)} /></> : null}
          <SummaryRow label="مسار التنفيذ" value={fulfillmentLabel(order)} />
          <SummaryRow label="نوع التوصيل" value={deliveryTypeLabel(order)} />
          {order.eta_min_minutes != null ? <SummaryRow label="الوقت المتوقع" value={`${order.eta_min_minutes}-${order.eta_max_minutes ?? order.eta_min_minutes} دقيقة`} /> : null}
          <SummaryRow label="إجمالي المنتجات" value={money(order.subtotal_price)} />
          <SummaryRow label="سعر التوصيل" value={deliveryFeeLabel(order)} />
          <SummaryRow label="الخصم" value={money(order.discount)} />
          {isMultiMarket(order) ? <SummaryRow label={multiMarketFeeTitle(order)} value={money(order.multi_market_fee)} /> : null}
          <SummaryRow label="الإجمالي النهائي" value={money(order.total_price)} strong />
          <SummaryRow label="ملاحظات الطلب" value={order.description?.trim() || "-"} />
          <SummaryRow label="ملاحظة التوصيل" value={order.delivery_note?.trim() || "-"} />
          <SummaryRow label="تاريخ الإنشاء" value={dateTime(order.created_at)} />
          <SummaryRow label="آخر تحديث" value={dateTime(order.updated_at)} />
          {order.custom_delivery_area ? <SummaryRow label="منطقة الدليفري" value={order.custom_delivery_area} /> : null}
        </div>
      ) : null}
    </Card>
  );
}
