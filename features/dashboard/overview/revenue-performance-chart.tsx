"use client";

import type { TooltipContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatedChartWrapper } from "../animations";
import { formatMoney } from "../shared/money";
import { useDashboardI18n } from "../i18n";
import { productChartData } from "./domain";
import type { BackendRecord } from "./types";

const revenueDotColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function RevenueTooltip({
  active,
  label,
  payload,
  currency,
}: TooltipContentProps & { currency: string }) {
  const { numberLocale, t } = useDashboardI18n();

  if (!active || !payload?.length) {
    return null;
  }

  const value = Number(payload[0]?.value ?? 0);
  const item = payload[0]?.payload as
    | { sold?: number; orders?: number }
    | undefined;

  return (
    <div className="grid min-w-36 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{label}</div>
      <div className="font-semibold" dir="ltr">
        {formatMoney(value, currency).replace(" ", "\u00A0")}
      </div>
      {item ? (
        <div className="text-muted-foreground">
          {typeof item.sold === "number"
            ? `${item.sold.toLocaleString(numberLocale)} ${t("overview.topItems.sold")}`
            : null}
          {typeof item.orders === "number"
            ? ` · ${item.orders.toLocaleString(numberLocale)} ${t("common.orders")}`
            : null}
        </div>
      ) : null}
    </div>
  );
}

export function RevenuePerformanceChart({
  currency,
  products,
}: {
  currency: string;
  products: BackendRecord[];
}) {
  const revenueChartData = productChartData(products);

  if (revenueChartData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
        لا توجد بيانات منتجات في هذه الفترة
      </div>
    );
  }

  return (
    <div
      data-chart="chart-revenue-performance"
      className="flex h-full w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-layer]:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60 [&_.recharts-surface]:outline-none"
    >
      <style>
        {`[data-chart=chart-revenue-performance] {
  --color-revenue: var(--chart-1);
}

.dark [data-chart=chart-revenue-performance] {
  --color-revenue: var(--chart-1);
}

@keyframes revenue-bar-rise {
  from {
    opacity: 0;
    transform: scaleY(0.82);
  }

  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

[data-chart=chart-revenue-performance] .recharts-bar-rectangle {
  animation: revenue-bar-rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transform-box: fill-box;
  transform-origin: center bottom;
}

@media (prefers-reduced-motion: reduce) {
  [data-chart=chart-revenue-performance] .recharts-bar-rectangle {
    animation: none;
    opacity: 1;
    transform: none;
  }
}`}
      </style>
      <AnimatedChartWrapper className="h-full w-full">
        {() => (
          <ResponsiveContainer minWidth={0} minHeight={0}>
            <BarChart
              data={revenueChartData}
              barCategoryGap="28%"
              margin={{ top: 18, right: 14, bottom: 0, left: 14 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.72}
              />
              <XAxis
                dataKey="chartName"
                axisLine={false}
                height={36}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickMargin={10}
                tickLine={false}
              />
              <YAxis hide domain={[0, "dataMax + 220"]} tickCount={4} />
              <Tooltip
                content={(props) => (
                  <RevenueTooltip {...props} currency={currency} />
                )}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar
                dataKey="revenue"
                radius={[8, 8, 3, 3]}
                maxBarSize={54}
                isAnimationActive={false}
              >
                {revenueChartData.map((item, index) => (
                  <Cell
                    key={`${item.chartName}-${index}`}
                    fill={revenueDotColors[index % revenueDotColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </AnimatedChartWrapper>
    </div>
  );
}
