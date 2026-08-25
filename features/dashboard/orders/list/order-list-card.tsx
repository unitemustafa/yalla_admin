"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatEgyptPhoneForDisplay,
  getDeliveryDestination,
  getDashboardOrderOfferTitles,
  getMarketCount,
  isMultiMarket,
} from "../../order-display";
import { Badge, CurrencyText } from "../../primitives";
import { useSnackbar } from "../../snackbar";
import {
  customerHref,
  customerName,
  dateTime,
  deliveryFeeLabel,
  isDeliveryOrder,
  marketName,
  money,
  multiMarketFeeTitle,
  orderLocationCoordinates,
  orderMapUrl,
  orderNumber,
  reviewStatusLabel,
  reviewStatusTone,
  statusTone,
} from "../formatters";
import { DeliveryTypeBadge, OrderDeliveryIcon } from "../order-badges";
import { statusLabels } from "../constants";
import type { BackendOrder } from "../types";

function orderCopyText(order: BackendOrder) {
  const coordinates = orderLocationCoordinates(order);
  return [
    orderNumber(order),
    customerName(order),
    order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`,
    getDeliveryDestination(order),
    ...(coordinates
      ? [
          `${coordinates.latitude},${coordinates.longitude}`,
          orderMapUrl(order) ?? "",
        ]
      : []),
  ].join("\n");
}

export function OrderListCard({ order, index }: { order: BackendOrder; index: number }) {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const deliveryOrder = isDeliveryOrder(order);

  async function copyOrder() {
    try {
      await navigator.clipboard.writeText(orderCopyText(order));
      showSnackbar({ message: `تم نسخ بيانات الطلب ${orderNumber(order)}.` });
    } catch {
      showSnackbar({ message: "تعذر نسخ بيانات الطلب.", tone: "danger" });
    }
  }

  const openOrder = () => router.push(`/orders/view/${order.id}`);
  const offerTitles = getDashboardOrderOfferTitles(order);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openOrder}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openOrder();
        }
      }}
      className={cn(
        "grid cursor-pointer gap-4 rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/35 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.1fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)_minmax(180px,0.8fr)_minmax(190px,0.9fr)] xl:items-center",
        deliveryOrder && "border-red-400/40 bg-red-500/5 hover:border-red-400/60 hover:bg-red-500/10",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
          {index}
        </span>
        <OrderDeliveryIcon order={order} />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span dir="ltr" className={cn("truncate font-bold text-primary", deliveryOrder && "text-red-600 dark:text-red-300")}>
              {orderNumber(order)}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void copyOrder();
              }}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label={`نسخ بيانات الطلب ${orderNumber(order)}`}
              title="نسخ بيانات الطلب"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
            <Badge tone={reviewStatusTone(order.review_status)}>{reviewStatusLabel(order.review_status)}</Badge>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <Link href={customerHref(order)} onClick={(event) => event.stopPropagation()} className="inline-grid max-w-full gap-0.5 font-semibold text-primary hover:underline">
          <span className="truncate">{customerName(order)}</span>
          <span className="truncate text-start text-xs font-normal text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">
            {formatEgyptPhoneForDisplay(order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`)}
          </span>
        </Link>
      </div>

      <div className="min-w-0">
        <div className="text-xs font-bold text-muted-foreground">محلات الطلب</div>
        <div className="mt-1 truncate font-semibold">{marketName(order)}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {getMarketCount(order).toLocaleString("en-US")} {getMarketCount(order) > 1 ? "محلات" : "محل"}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-xs font-bold text-muted-foreground">نوع الطلب</div>
        <div className="mt-1"><DeliveryTypeBadge order={order} /></div>
        {offerTitles.length > 0 ? (
          <div className="mt-2 line-clamp-2 text-xs font-medium text-emerald-700 dark:text-emerald-300" title={offerTitles.join("، ")}>
            {offerTitles.length === 1 ? "العرض" : "العروض"}: {offerTitles.join("، ")}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 text-xs">
        <div className="grid gap-1.5">
          <PriceRow label="المنتجات" value={money(order.subtotal_price)} />
          <PriceRow label="التوصيل" value={deliveryFeeLabel(order)} />
          <PriceRow label="الخصم" value={money(order.discount)} />
          {isMultiMarket(order) ? <PriceRow label={multiMarketFeeTitle(order)} value={money(order.multi_market_fee)} /> : null}
          <div className="flex justify-between gap-2 border-t pt-1">
            <span className="font-bold">الإجمالي</span>
            <CurrencyText className="font-extrabold tabular-nums">{money(order.total_price)}</CurrencyText>
          </div>
          <div className="truncate pt-1 text-muted-foreground">{dateTime(order.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <CurrencyText className="font-semibold tabular-nums">{value}</CurrencyText>
    </div>
  );
}
