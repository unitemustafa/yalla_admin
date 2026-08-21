"use client";

import { Card, CardHeader, PageTitle } from "../primitives";
import { PageLoadError } from "../load-error-card";
import { useDashboardI18n } from "../i18n";
import { ActiveOrdersCard } from "./active-orders-card";
import { OverviewDateActions } from "./date-range-controls";
import { dashboardEmptyState, recordList } from "./domain";
import { OverviewKpiCards } from "./kpi-cards";
import { RevenuePerformanceChart } from "./revenue-performance-chart";
import { TopShopsCard } from "./top-shops-card";
import { useOverview } from "./use-overview";

export function OverviewPage() {
  const { t } = useDashboardI18n();
  const {
    range,
    setRange,
    dashboardData,
    loading,
    error,
    refresh,
  } = useOverview();
  const data = dashboardData ?? dashboardEmptyState;
  const currency = data.currency?.trim() || "EGP";
  const activeOrders = recordList(data.active_orders);
  const topProducts = recordList(data.top_products);
  const topShops = recordList(data.top_shops);

  if (error) {
    return (
      <div className="px-6 py-6">
        <PageLoadError
          className="min-h-[calc(100vh-112px)]"
          onRetry={refresh}
          retrying={loading}
        />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <PageTitle
        title={t("overview.title")}
        description={t("overview.description")}
        actions={
          <OverviewDateActions
            range={range}
            loading={loading}
            onRangeChange={setRange}
            onRefresh={refresh}
          />
        }
      />

      {loading ? (
        <div className="mt-4 rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          جاري تحميل بيانات لوحة التحكم...
        </div>
      ) : null}

      <OverviewKpiCards data={data} />

      <div className="mt-6 flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 xl:w-3/4">
          <Card className="group h-[509px]">
            <CardHeader
              title={t("overview.revenuePerformance.title")}
              description={t("overview.revenuePerformance.description")}
              className="min-h-[65px] border-b"
            />
            <div className="h-[442px] px-6 pb-4 pt-6">
              <RevenuePerformanceChart
                currency={currency}
                products={topProducts}
              />
            </div>
          </Card>
        </div>

        <div className="shrink-0 xl:w-1/4">
          <ActiveOrdersCard currency={currency} orders={activeOrders} />
        </div>
      </div>

      <TopShopsCard currency={currency} shops={topShops} />
    </div>
  );
}
