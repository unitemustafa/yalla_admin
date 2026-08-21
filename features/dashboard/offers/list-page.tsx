"use client";

import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  Tag,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, PageTitle } from "../primitives";
import { MetricCards } from "./list-components";
import { OffersFilters } from "./offers-filters";
import { OffersListResults } from "./offers-list-results";
import { useOffersList } from "./use-offers-list";

export function OffersPage({
  initialArchived = false,
}: {
  initialArchived?: boolean;
} = {}) {
  const list = useOffersList(initialArchived);

  return (
    <div className="px-6 py-8">
      <PageTitle
        title={list.showArchived ? "العروض المؤرشفة" : "العروض"}
        description={
          list.showArchived
            ? "استعراض العروض المؤرشفة واستعادتها عند الحاجة"
            : "إدارة العروض والخصومات لكل الفروع"
        }
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => void list.reload()}
              disabled={list.loading}
            >
              <RefreshCw className={cn("size-4", list.loading && "animate-spin")} />
              تحديث
            </Button>
            {!list.showArchived ? (
              <Link
                href="/offers/create"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                <CheckCircle2 className="size-4" />
                إنشاء عرض
              </Link>
            ) : null}
          </div>
        }
      />
      <MetricCards cards={[
        ["إجمالي العروض", String(list.offers.length), Tag, "text-primary"],
        ["نشط", String(list.stats.active), CheckCircle2, "text-green-500"],
        ["مجدول", String(list.stats.scheduled), Calendar, "text-orange-500"],
        ["منتهي", String(list.stats.expired), XCircle, "text-destructive"],
      ]} />
      <OffersFilters list={list} />
      <OffersListResults list={list} />
    </div>
  );
}
