import { Search } from "lucide-react";

import { AppSelect, Card, Input } from "../primitives";
import { partnerFilterOptions } from "./domain";
import type { PartnerFilter } from "./types";

export function PartnersFilters({
  search,
  filter,
  onSearchChange,
  onFilterChange,
}: {
  search: string;
  filter: PartnerFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: PartnerFilter) => void;
}) {
  return (
    <Card className="border-border/70 bg-muted/20 p-4 shadow-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ابحث باسم النشاط أو المسؤول أو رقم الهاتف..."
            className="h-11 bg-background/60 pr-11 text-right"
          />
        </div>
        <AppSelect
          value={filter}
          onValueChange={(value) => onFilterChange(value as PartnerFilter)}
          options={partnerFilterOptions}
          ariaLabel="تصفية طلبات الشركاء"
          className="h-11 md:w-52"
        />
      </div>
    </Card>
  );
}
