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
  numberValue,
  orderOfferTitle,
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
              const items = section.items ?? [];
              const offers = section.offers ?? [];
              return (
                <div key={`${section.id ?? section.market_id ?? index}`} className="rounded-md border bg-muted/20 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{name}</span>
                    {section.market?.branch ? <Badge tone="secondary">{section.market.branch}</Badge> : null}
                  </div>
                  {items.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {items.map((item, itemIndex) => {
                        const productName = textValue(item.product_name) || textValue(item.variant?.product?.name) || textValue(item.product?.name) || "منتج غير مسمى";
                        const quantity = numberValue(item.quantity);
                        const unitPrice = numberValue(item.unit_price);
                        const lineTotal = numberValue(item.subtotal) ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null);
                        return (
                          <div key={`${item.id ?? item.variant_id ?? itemIndex}`} className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
                            <div><div className="font-semibold">{productName}</div>{item.variant_name ? <div className="text-xs text-muted-foreground">{item.variant_name}</div> : null}{item.additions?.length ? <div className="text-xs text-muted-foreground">الإضافات: {item.additions.map((addition) => `${addition.name} (${moneyLabel(addition.price)})`).join("، ")}</div> : null}</div>
                            <div className="text-xs text-muted-foreground">الكمية: {item.quantity ?? "-"} · سعر الوحدة: {moneyLabel(item.unit_price)} · الإجمالي: <span className="font-semibold text-foreground">{moneyLabel(lineTotal)}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {offers.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {offers.map((offer, offerIndex) => (
                        <div key={`${offer.id ?? offer.offer_id ?? offerIndex}`} className="flex flex-wrap justify-between gap-2 rounded-md border bg-background px-3 py-2">
                          <span className="font-semibold">عرض: {orderOfferTitle(offer)}</span>
                          <span className="text-muted-foreground">الخصم: {moneyLabel(offer.discount_amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {items.length === 0 && offers.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">لا توجد منتجات أو عروض لهذا المحل.</p> : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
                    <span>قيمة المنتجات: {moneyLabel(section.subtotal_price)}</span>
                    <span>الخصم: {moneyLabel(section.discount)}</span>
                    <span className="font-semibold text-foreground">إجمالي المحل: {moneyLabel(section.total_price)}</span>
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
