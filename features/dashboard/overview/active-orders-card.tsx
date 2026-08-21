"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bike } from "lucide-react";

import { AnimatedNumber } from "../animations";
import { useDashboardI18n } from "../i18n";
import { Card, CardHeader } from "../primitives";
import { activeOrderData } from "./domain";
import type { BackendRecord } from "./types";

export function ActiveOrdersCard({
  currency,
  orders,
}: {
  currency: string;
  orders: BackendRecord[];
}) {
  const { direction, numberLocale, t } = useDashboardI18n();
  const MoreArrow = direction === "rtl" ? ArrowLeft : ArrowRight;
  const activeOrders = activeOrderData(orders);
  const currencyPrefix = `${currency} `;
  const currencySuffix = "";

  return (
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
  );
}
