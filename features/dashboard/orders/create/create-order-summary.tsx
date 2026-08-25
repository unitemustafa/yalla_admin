"use client";

import { ClipboardList, Loader2, ShoppingCart } from "lucide-react";

import { Button, Card } from "../../primitives";
import { paymentMethodLabel, money } from "../formatters";
import { SummaryRow } from "../summary";
import { marketLabel } from "../create-domain";
import type { useCreateOrder } from "./use-create-order";

type CreateOrderState = ReturnType<typeof useCreateOrder>;

export function CreateOrderSummary({ state }: { state: CreateOrderState }) {
  const address = state.selectedAddressRecord;
  const deliveryType = address
    ? state.isGeneralAddress
      ? "دليفري"
      : address.delivery_area
        ? "مدينة ثابتة"
        : "دليفري"
    : "-";
  const deliveryPrice = address
    ? address.delivery_area
      ? money(address.delivery_price_preview ?? address.delivery_area.delivery_price)
      : "يحدد لاحقاً"
    : "-";
  const marketSummary = state.selectedMarketRecords.map(marketLabel).join("، ");

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center gap-2 font-semibold">
        <ShoppingCart className="size-4 text-primary" />
        ملخص الطلب
      </div>
      <div className="flex flex-1 flex-col">
        <SummaryRow label="عدد المحلات" value={state.selectedMarketRecords.length ? `${state.selectedMarketRecords.length}` : "لم يتم اختيار محلات بعد"} />
        <SummaryRow label="أسماء المحلات" value={marketSummary || "لم يتم اختيار محلات بعد"} />
        <SummaryRow label="إجمالي المنتجات" value={state.selectedProductLines.length ? `${state.selectedProductLines.length}` : "لا توجد منتجات مختارة"} />
        <SummaryRow label="عدد العروض" value={state.selectedOfferLines.length ? `${state.selectedOfferLines.length}` : "لا توجد عروض مختارة"} />
        <SummaryRow label="طريقة الدفع" value={state.paymentMethod ? paymentMethodLabel(state.paymentMethod) : "-"} />
        <SummaryRow label="نوع التوصيل" value={deliveryType} />
        <SummaryRow label="سعر التوصيل" value={deliveryPrice} />
        {state.selectedMarketRecords.length > 1 ? <SummaryRow label={`القيمة الإضافية (${state.multiMarketFeeRate.toLocaleString("en-US")}%)`} value={money(state.multiMarketFee)} /> : null}
        <SummaryRow label="الإجمالي المتوقع" value={money(state.summaryTotal)} strong />
        <div className="mt-auto border-t pt-4" />
      </div>
      <Button type="submit" className="mt-5 w-full" disabled={state.saving || Boolean(state.validationMessage)}>
        {state.saving ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
        حفظ الطلب
      </Button>
      {state.validationMessage ? (
        <div className="mt-3 rounded-md border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">{state.validationMessage}</div>
      ) : null}
    </Card>
  );
}
