"use client";

import { Edit3, MapPin, MapPinned, Plus, Search, Trash2 } from "lucide-react";

import { PageLoadError, PageLoadingState } from "../load-error-card";
import { Badge, Button, Card, Input, Pagination, Switch } from "../primitives";
import { formatRadius } from "./domain";
import type { ServiceCity } from "./types";

export function CitiesList({
  cities,
  filteredCities,
  pagedCities,
  loading,
  error,
  query,
  currentPage,
  totalPages,
  pageStartIndex,
  busyCityId,
  onQueryChange,
  onPageChange,
  onReload,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
  onOpenAreas,
}: {
  cities: ServiceCity[];
  filteredCities: ServiceCity[];
  pagedCities: ServiceCity[];
  loading: boolean;
  error: string | null;
  query: string;
  currentPage: number;
  totalPages: number;
  pageStartIndex: number;
  busyCityId: number | null;
  onQueryChange: (query: string) => void;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
  onReload: () => void;
  onCreate: () => void;
  onEdit: (city: ServiceCity) => void;
  onDelete: (city: ServiceCity) => void;
  onToggle: (city: ServiceCity, checked: boolean) => void;
  onOpenAreas: (city: ServiceCity) => void;
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="grid gap-4 border-b px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:items-end">
        <div><h2 className="font-semibold">كل المدن</h2><p className="text-xs text-muted-foreground">راجع النطاق الجغرافي والارتباطات وحالة كل مدينة.</p></div>
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="ابحث باسم المدينة..." className="h-11 pr-9" />
        </div>
      </div>

      {loading ? <PageLoadingState /> : error ? <PageLoadError onRetry={onReload} /> : filteredCities.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center">
          <MapPinned className="size-9 text-muted-foreground" />
          <p className="font-semibold">{cities.length ? "لا توجد مدن مطابقة" : "لا توجد مدن حتى الآن"}</p>
          <p className="text-sm text-muted-foreground">{cities.length ? "غيّر عبارة البحث وحاول مرة أخرى." : "أضف أول مدينة لتحديد نطاقات الخدمة والتوصيل."}</p>
          {!cities.length ? <Button type="button" onClick={onCreate} className="mt-1"><Plus className="size-4" />أضف أول مدينة</Button> : null}
        </div>
      ) : (
        <div className="grid gap-3 p-4">
          {pagedCities.map((city, index) => (
            <Card key={city.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_minmax(360px,420px)_minmax(340px,auto)] xl:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{pageStartIndex + index + 1}</span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MapPinned className="size-5" /></span>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{city.name}</h3><Badge tone={city.is_active ? "green" : "red"}>{city.is_active ? "مفعلة" : "معطلة"}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">نصف قطر التغطية {formatRadius(city.radius_km)}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-center text-sm sm:grid-cols-3">
                <div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{city.delivery_area_count}</div><div className="text-xs text-muted-foreground">مناطق التوصيل</div></div>
                <div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{city.market_count}</div><div className="text-xs text-muted-foreground">المحلات</div></div>
                <div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{city.offer_count}</div><div className="text-xs text-muted-foreground">العروض</div></div>
              </div>
              <div className="flex items-center justify-start gap-2 whitespace-nowrap xl:justify-end">
                  <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3"><Switch checked={city.is_active} disabled={busyCityId === city.id} onCheckedChange={(checked) => onToggle(city, checked)} /><span className="text-xs font-semibold">{city.is_active ? "مفعّلة" : "معطلة"}</span></div>
                  <Button type="button" variant="outline" size="sm" className="h-9 px-2.5" onClick={() => onOpenAreas(city)}><MapPin className="size-4" />مناطق التوصيل</Button>
                  <Button size="icon" variant="outline" title="تعديل" onClick={() => onEdit(city)} aria-label={`تعديل ${city.name}`}><Edit3 className="size-4" /></Button>
                  {city.deletionMode === "delete" ? <Button size="icon" variant="outline" title="حذف نهائي" disabled={busyCityId === city.id} onClick={() => onDelete(city)} aria-label={`حذف ${city.name} نهائيًا`} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></Button> : null}
              </div>
            </Card>
          ))}
          <Pagination text={`عرض ${pagedCities.length} من ${filteredCities.length} نتيجة`} pages={`${currentPage} / ${totalPages}`} previousDisabled={currentPage === 1} nextDisabled={currentPage === totalPages} onPrevious={() => onPageChange((page) => Math.max(1, Math.min(page, totalPages) - 1))} onNext={() => onPageChange((page) => Math.min(totalPages, Math.min(page, totalPages) + 1))} />
        </div>
      )}
    </Card>
  );
}
