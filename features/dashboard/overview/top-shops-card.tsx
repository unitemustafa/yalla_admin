"use client";

import { AnimatedNumber, AnimatedProgressBar } from "../animations";
import { useDashboardI18n } from "../i18n";
import { Card } from "../primitives";
import { cn } from "@/lib/utils";
import { topShopData } from "./domain";
import type { BackendRecord } from "./types";

export function TopShopsCard({
  currency,
  shops,
}: {
  currency: string;
  shops: BackendRecord[];
}) {
  const { direction, numberLocale, t } = useDashboardI18n();
  const displayItems = topShopData(shops);
  const totalRevenue = displayItems.reduce((total, item) => total + item.revenue, 0);
  const currencyPrefix = `${currency} `;
  const currencySuffix = "";
  const progressColorClass = "bg-cyan-500";
  const rankBadgeClass =
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200";
  const zoneBadgeClass =
    "rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-[15px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200";
  const shopMeta = (item: (typeof displayItems)[number]) => {
    const parts = [
      `${item.orders.toLocaleString(numberLocale)} ${t("common.orders")}`,
    ];

    if (item.orders > 0) {
      const average = item.average.toLocaleString(numberLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      parts.push(
        `${t("overview.topItems.averageItems")} ${average} / ${t("common.order")}`,
      );
    }

    return parts.join(" · ");
  };
  const maxValue = Math.max(...displayItems.map((item) => item.revenue), 0);
  const zoneLabel = (zone: string) =>
    zone.trim().toLowerCase() === "general market"
      ? t("overview.topItems.generalMarket")
      : zone;

  return (
    <Card className="mt-6 border-border bg-card text-card-foreground shadow-sm">
      <div
        className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between"
        dir={direction}
      >
        <div className="text-start">
          <div className="text-base font-bold leading-5 text-card-foreground">
            {t("overview.topItems.title")}
          </div>
          <div className="mt-1 text-sm leading-5 text-muted-foreground">
            {t("overview.topItems.revenueTab")}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-6" dir={direction}>
        <div className="text-start">
          <div className="text-sm leading-5 text-muted-foreground">
            {t("overview.topItems.totalRevenue")}
          </div>
          <div className="mt-1 text-3xl font-bold leading-9 text-card-foreground">
            <AnimatedNumber
              value={totalRevenue}
              decimals={2}
              locale={numberLocale}
              prefix={currencyPrefix}
              suffix={currencySuffix}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3.5">
          {displayItems.length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              لا توجد بيانات محلات في هذه الفترة
            </div>
          ) : null}
          {displayItems.map((item, index) => {
            const progress = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0;
            const delay = 120 + index * 70;

            return (
              <div key={item.key}>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        rankBadgeClass,
                      )}
                    >
                      {item.rank}
                    </div>
                    <div className="min-w-0 text-start">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-base font-semibold leading-5 text-card-foreground">
                          {item.name}
                        </span>
                        {item.zone ? (
                          <span className={zoneBadgeClass}>{zoneLabel(item.zone)}</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                        {shopMeta(item)}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 pb-1 text-left text-sm font-bold leading-5 text-card-foreground">
                    <AnimatedNumber
                      value={item.revenue}
                      decimals={2}
                      delay={delay}
                      locale={numberLocale}
                      prefix={currencyPrefix}
                      suffix={currencySuffix}
                    />
                  </div>
                </div>
                <div
                  className="flex h-2 w-full justify-end overflow-hidden rounded-full bg-muted"
                  dir="ltr"
                >
                  <AnimatedProgressBar
                    value={progress}
                    className={cn("h-full rounded-full", progressColorClass)}
                    delay={delay}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
