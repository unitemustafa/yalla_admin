"use client";

import { AnimatedCircularStatCard } from "../animated-circular-stat-card";
import {
  AnimatedNumber,
  AnimatedProgressBar,
} from "../animations";
import { formatPercent } from "../admin-api";
import { useDashboardI18n } from "../i18n";
import { Card, CardHeader, HoverTooltip } from "../primitives";
import { formatMoney, safeNumber } from "../shared/money";
import { cn } from "@/lib/utils";
import { clampedPercent } from "./domain";
import type { DashboardOverview } from "./types";

function MetricTooltip({
  title,
  value,
  detail,
}: {
  title: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="font-semibold">{title}</div>
      <div className="font-bold" dir="ltr">
        {value}
      </div>
      {detail ? <div className="text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function UpdateCadenceLabel({
  children,
  cadence,
}: {
  children: React.ReactNode;
  cadence: React.ReactNode;
}) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-2">
      <span>{children}</span>
      <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-[15px] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
        {cadence}
      </span>
    </span>
  );
}

function OrdersKpiCard({
  orders,
  height = "h-[388px]",
}: {
  orders: DashboardOverview["orders"];
  height?: string;
}) {
  const { numberLocale, t } = useDashboardI18n();
  const completedOrders = safeNumber(orders?.completed);
  const incompleteOrders = safeNumber(orders?.incomplete);
  const totalOrders = safeNumber(orders?.total);
  const completionRate = clampedPercent(orders?.completion_rate);

  return (
    <Card className={cn("flex flex-col shadow", height)}>
      <CardHeader
        title={t("overview.ordersSummary.title")}
        description={
          <UpdateCadenceLabel cadence={t("overview.period.monthly")}>
            {t("overview.ordersSummary.subtitle")}
          </UpdateCadenceLabel>
        }
      />
      <div className="flex flex-1 flex-col justify-center px-6 pb-6 pt-3">
        <HoverTooltip
          content={
            <MetricTooltip
              title={t("overview.ordersSummary.label")}
              value={totalOrders.toLocaleString(numberLocale)}
              detail={`${completedOrders.toLocaleString(numberLocale)} ${t("common.completed")} / ${incompleteOrders.toLocaleString(numberLocale)} ${t("common.incomplete")}`}
            />
          }
          className="mx-auto w-full max-w-[300px] text-center"
        >
          <div className="text-4xl font-bold leading-none text-foreground">
            <AnimatedNumber
              value={totalOrders}
              locale={numberLocale}
              delay={80}
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {t("overview.ordersSummary.label")}
          </div>
        </HoverTooltip>

        <div className="mx-auto mt-8 w-full max-w-[300px] space-y-4">
          <HoverTooltip
            content={
              <MetricTooltip
                title={t("overview.ordersSummary.completionRate")}
                value={`${completionRate.toLocaleString(numberLocale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}%`}
                detail={`${completedOrders.toLocaleString(numberLocale)} ${t("common.completed")} / ${incompleteOrders.toLocaleString(numberLocale)} ${t("common.incomplete")}`}
              />
            }
          >
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {t("overview.ordersSummary.completionRate")}
                </span>
                <span className="font-semibold">
                  <AnimatedNumber
                    value={completionRate}
                    decimals={1}
                    suffix="%"
                    delay={80}
                    locale={numberLocale}
                  />
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <AnimatedProgressBar
                  value={completionRate}
                  className="h-full rounded-full bg-[var(--chart-2)]"
                  delay={80}
                />
              </div>
            </div>
          </HoverTooltip>

          <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
            <HoverTooltip
              content={
                <MetricTooltip
                  title={t("common.completed")}
                  value={completedOrders.toLocaleString(numberLocale)}
                  detail={t("overview.ordersSummary.label")}
                />
              }
            >
              <div className="text-center">
                <div className="font-semibold">
                  <AnimatedNumber
                    value={completedOrders}
                    delay={80}
                    locale={numberLocale}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("common.completed")}
                </div>
              </div>
            </HoverTooltip>
            <HoverTooltip
              content={
                <MetricTooltip
                  title={t("common.incomplete")}
                  value={incompleteOrders.toLocaleString(numberLocale)}
                  detail={t("overview.ordersSummary.label")}
                />
              }
            >
              <div className="text-center">
                <div className="font-semibold">
                  <AnimatedNumber
                    value={incompleteOrders}
                    delay={80}
                    locale={numberLocale}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("common.incomplete")}
                </div>
              </div>
            </HoverTooltip>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function OverviewKpiCards({ data }: { data: DashboardOverview }) {
  const { numberLocale, t } = useDashboardI18n();
  const currency = data.currency?.trim() || "EGP";
  const currencyPrefix = `${currency} `;
  const currencySuffix = "";
  const revenueTotal = safeNumber(data.revenue?.total);
  const revenuePercentage = clampedPercent(data.revenue?.percentage);
  const customersReturnRate = clampedPercent(data.customers?.return_rate);
  const newCustomers = safeNumber(data.customers?.new);
  const returningCustomers = safeNumber(data.customers?.returning);

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-3">
      <AnimatedCircularStatCard
        title={t("overview.totalRevenue.title")}
        subtitle={
          <UpdateCadenceLabel cadence={t("overview.period.monthly")}>
            {t("overview.totalRevenue.subtitle")}
          </UpdateCadenceLabel>
        }
        value={revenueTotal}
        percentage={revenuePercentage}
        label={t("overview.totalRevenue.realizedRate")}
        color="var(--chart-1)"
        decimals={2}
        locale={numberLocale}
        prefix={currencyPrefix}
        suffix={currencySuffix}
        tooltip={
          <MetricTooltip
            title={t("overview.totalRevenue.label")}
            value={formatMoney(revenueTotal, currency)}
            detail={t("overview.totalRevenue.note")}
          />
        }
        footer={
          <>
            <HoverTooltip
              content={
                <MetricTooltip
                  title={t("overview.totalRevenue.realizedRate")}
                  value={formatPercent(revenuePercentage)}
                  detail={formatMoney(revenueTotal, currency)}
                />
              }
            >
              <div className="flex items-center justify-center gap-1 font-medium leading-none">
                {t("overview.totalRevenue.realizedRate")}{" "}
                <AnimatedNumber
                  value={revenuePercentage}
                  decimals={Number.isInteger(revenuePercentage) ? 0 : 1}
                  suffix="%"
                  locale={numberLocale}
                />
              </div>
            </HoverTooltip>
            <div className="text-xs leading-none text-muted-foreground">
              {t("overview.totalRevenue.note")}
            </div>
          </>
        }
      />
      <OrdersKpiCard orders={data.orders} />
      <AnimatedCircularStatCard
        title={t("overview.customerAnalysis.title")}
        subtitle={
          <UpdateCadenceLabel cadence={t("overview.period.monthly")}>
            {t("overview.customerAnalysis.subtitle")}
          </UpdateCadenceLabel>
        }
        value={customersReturnRate}
        percentage={customersReturnRate}
        label={t("overview.customerAnalysis.returnRateLabel")}
        color="var(--chart-1)"
        radius={85}
        strokeWidth={20}
        trackRadius={85}
        trackStrokeWidth={20}
        decimals={1}
        locale={numberLocale}
        suffix="%"
        delay={200}
        footerClassName="gap-2"
        tooltip={
          <MetricTooltip
            title={t("overview.customerAnalysis.returnRateLabel")}
            value={formatPercent(customersReturnRate)}
            detail={`${t("overview.customerAnalysis.newCustomers")} ${newCustomers.toLocaleString(numberLocale)} / ${t("overview.customerAnalysis.returningCustomers")} ${returningCustomers.toLocaleString(numberLocale)}`}
          />
        }
        footer={
          <>
            <HoverTooltip
              content={
                <MetricTooltip
                  title={t("overview.customerAnalysis.returnRate")}
                  value={formatPercent(customersReturnRate)}
                  detail={`${t("overview.customerAnalysis.returningCustomers")} ${returningCustomers.toLocaleString(numberLocale)}`}
                />
              }
            >
              <div className="flex items-center justify-center gap-1 font-medium leading-none">
                {t("overview.customerAnalysis.returnRate")}{" "}
                <AnimatedNumber
                  value={customersReturnRate}
                  decimals={1}
                  suffix="%"
                  delay={200}
                  locale={numberLocale}
                />
              </div>
            </HoverTooltip>
            <div className="text-xs leading-none text-muted-foreground">
              {t("overview.customerAnalysis.newCustomers")}{" "}
              <AnimatedNumber
                value={newCustomers}
                delay={200}
                locale={numberLocale}
              />{" "}
              · {t("overview.customerAnalysis.returningCustomers")}{" "}
              <AnimatedNumber
                value={returningCustomers}
                delay={200}
                locale={numberLocale}
              />
            </div>
          </>
        }
      />
    </div>
  );
}
