import { PackageCheck, Truck } from "lucide-react";

import {
  formatEgyptPhoneForDisplay,
  getDashboardOrderTypeLabel,
  getManualArea,
  getManualCity,
  getMarketCount,
  getMarketSections,
  isGeneralOrder,
  isMultiMarket,
} from "../order-display";
import { Badge, CurrencyText } from "../primitives";
import { recordValue } from "../orders/api";
import {
  customerName,
  dateTimeLabel,
  deliveryDetails,
  marketBranch,
  marketName,
  moneyLabel,
  orderId,
  orderLike,
  serviceCityName,
  textAt,
  textValue,
} from "./domain";
import type { ApiRecord } from "./types";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 min-h-5 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

export function OrderReviewDetails({ order }: { order: ApiRecord }) {
  const typedOrder = orderLike(order);
  const delivery = deliveryDetails(order);
  const sections = getMarketSections(typedOrder);
  const feeRate = Number(recordValue(order, ["multi_market_fee_rate"]) ?? 0);
  const feeRateLabel = Number.isInteger(feeRate)
    ? feeRate.toFixed(0)
    : feeRate.toFixed(2).replace(/\.?0+$/, "");
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="رقم الطلب" value={orderId(order) || "-"} />
        <DetailItem label="العميل" value={customerName(order)} />
        <DetailItem label="هاتف العميل" value={<span dir="ltr" className="[unicode-bidi:plaintext]">{formatEgyptPhoneForDisplay(textAt(order, [["customer", "phone"], ["customer_phone"], ["phone"]]))}</span>} />
        <DetailItem label="نوع الطلب" value={getDashboardOrderTypeLabel(typedOrder)} />
        <DetailItem label="محلات الطلب" value={marketName(order)} />
        <DetailItem label="عدد المحلات" value={String(getMarketCount(typedOrder) || "-")} />
        <DetailItem label="نوع التجميع" value={isMultiMarket(typedOrder) ? "متعدد المحلات" : "محل واحد"} />
        <DetailItem label="مدينة الخدمة" value={isGeneralOrder(typedOrder) ? "-" : serviceCityName(order)} />
        {isGeneralOrder(typedOrder) ? <DetailItem label="المدينة اليدوية" value={getManualCity(typedOrder)} /> : null}
        <DetailItem label={isGeneralOrder(typedOrder) ? "المنطقة اليدوية" : "الفرع"} value={isGeneralOrder(typedOrder) ? getManualArea(typedOrder) : marketBranch(order)} />
        <DetailItem label="عنوان التوصيل" value={delivery.destination} />
        <DetailItem label="الإجمالي" value={<CurrencyText className="tabular-nums text-emerald-700 dark:text-emerald-300">{moneyLabel(recordValue(order, ["total_price"]))}</CurrencyText>} />
        {isMultiMarket(typedOrder) ? <DetailItem label={`القيمة الإضافية (${feeRateLabel}%)`} value={<CurrencyText>{moneyLabel(recordValue(order, ["multi_market_fee"]))}</CurrencyText>} /> : null}
        <DetailItem label="تاريخ الإنشاء" value={dateTimeLabel(recordValue(order, ["created_at"]) ?? recordValue(order, ["createdAt"]))} />
      </div>
      <div className="rounded-md border border-border/70 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2"><Truck className="size-4 text-primary" /><span className="font-bold">بيانات التوصيل</span><Badge tone={delivery.tone}>{delivery.type}</Badge></div>
        <div className="grid gap-2 sm:grid-cols-3"><DetailItem label="المدينة" value={delivery.city} /><DetailItem label="المنطقة" value={delivery.area} /><DetailItem label="سعر التوصيل" value={delivery.price} /></div>
      </div>
      {sections.length > 0 ? (
        <div className="rounded-md border border-border/70 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2"><PackageCheck className="size-4 text-primary" /><span className="font-bold">محلات الطلب</span><Badge tone={sections.length > 1 ? "green" : "secondary"}>{sections.length.toLocaleString("en-US")} {sections.length > 1 ? "محلات" : "محل"}</Badge></div>
          <div className="grid gap-2">
            {sections.map((section, index) => {
              const name = textValue(section.market?.name_ar) || textValue(section.market?.name) || (section.market_id ? `محل #${section.market_id}` : `محل ${index + 1}`);
              return <div key={`${section.id ?? section.market_id ?? index}`} className="rounded-md border bg-muted/20 px-3 py-2 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{name}</span></div><div className="mt-1 text-xs text-muted-foreground">المنتجات: {(section.items?.length ?? 0).toLocaleString("en-US")} - العروض: {(section.offers?.length ?? 0).toLocaleString("en-US")}</div></div>;
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
