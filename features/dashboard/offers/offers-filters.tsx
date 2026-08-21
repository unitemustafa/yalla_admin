"use client";

import { Search } from "lucide-react";

import { AppSelect, Card, Input } from "../primitives";
import { offerTypeOptions, offerTypeValues } from "./domain";
import { allOffersFilterValue } from "./list-domain";
import type { OffersListController } from "./use-offers-list";

export function OffersFilters({ list }: { list: OffersListController }) {
  return (
    <Card className="mt-6 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder="ابحث في العروض..."
            className="h-12 pr-9"
          />
        </div>
        <AppSelect
          value={list.typeFilter}
          onValueChange={list.setTypeFilter}
          className="h-12"
          ariaLabel="فلترة حسب نوع العرض"
          options={[
            { value: allOffersFilterValue, label: "كل الأنواع" },
            ...offerTypeOptions.map((option) => ({
              value: offerTypeValues[option.label],
              label: option.label,
            })),
          ]}
        />
        <AppSelect
          value={list.cityFilter}
          onValueChange={list.setCityFilter}
          className="h-12"
          ariaLabel="فلترة حسب المدينة"
          options={list.cityOptions}
        />
      </div>
      <div className="hidden">
        عرض {list.filteredOffers.length} من {list.offers.length} عرض
      </div>
    </Card>
  );
}
