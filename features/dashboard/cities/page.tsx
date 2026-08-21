"use client";

import { Building2, MapPin, MapPinned, Plus, RefreshCw, Tag } from "lucide-react";

import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { Button, Card, PageTitle } from "../primitives";
import { CitiesList } from "./cities-list";
import { CityDialog } from "./city-dialog";
import { DeliveryAreasDialog } from "./delivery-areas-dialog";
import { useCitiesPage } from "./use-cities-page";

export function CitiesPage({ initialArchived = false }: { initialArchived?: boolean } = {}) {
  const page = useCitiesPage(initialArchived);
  const metrics = [
    ["المدن النشطة", String(page.metrics.activeCount), MapPinned, "text-primary"],
    ["مناطق التوصيل", String(page.metrics.deliveryAreaTotal), MapPin, "text-sky-500"],
    ["ارتباطات المحلات", String(page.metrics.linkedMarkets), Building2, "text-emerald-500"],
    ["ارتباطات العروض", String(page.metrics.linkedOffers), Tag, "text-amber-500"],
  ] as const;

  return (
    <div dir="rtl" className="px-6 py-6">
      <PageTitle
        title={initialArchived ? "المدن المؤرشفة" : "المدن"}
        description={initialArchived ? "استعراض المدن المؤرشفة واستعادتها عند الحاجة." : "إدارة المدن التي تحدد ظهور المحلات والمنتجات والعروض داخل تطبيق العميل."}
        actions={<div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void page.reload()} disabled={page.loading} className="h-9 px-4 text-sm"><RefreshCw className="size-4" />تحديث</Button>
          {!initialArchived ? <Button onClick={() => page.setEditingCity(null)} className="h-9 px-4 text-sm"><Plus className="size-4" />إضافة مدينة</Button> : null}
        </div>}
      />

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {metrics.map(([label, value, Icon, tone]) => (
          <Card key={label} className="h-[82px]"><div className="flex h-full items-center gap-3 px-5"><span className={`rounded-full bg-muted p-3 ${tone}`}><Icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div></div></Card>
        ))}
      </div>

      <CitiesList
        archived={initialArchived}
        cities={page.cities}
        filteredCities={page.filteredCities}
        pagedCities={page.pagedCities}
        loading={page.loading}
        error={page.error}
        query={page.query}
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        pageStartIndex={page.pageStartIndex}
        busyCityId={page.busyCityId}
        onQueryChange={(query) => { page.setQuery(query); page.setCurrentPage(1); }}
        onPageChange={page.setCurrentPage}
        onReload={() => void page.reload()}
        onCreate={() => page.setEditingCity(null)}
        onEdit={page.setEditingCity}
        onDelete={page.setDeleteCity}
        onRestore={(city) => void page.restoreArchivedCity(city)}
        onToggle={(city, checked) => void page.toggleCity(city, checked)}
        onOpenAreas={page.openDeliveryAreas}
      />

      {page.editingCity !== undefined ? <CityDialog city={page.editingCity ?? undefined} onClose={() => page.setEditingCity(undefined)} onSaved={page.saveCityToList} /> : null}
      {page.deleteCity ? <ConfirmDeleteDialog title={page.deleteCity.deletionMode === "archive" ? "أرشفة المدينة" : "حذف المدينة نهائيًا"} description={page.deleteCity.deletionMode === "archive" ? `المدينة ${page.deleteCity.name} مرتبطة ببيانات مستخدمة؛ سيتم إخفاؤها وأرشفتها وتعطيلها مع إمكانية استعادتها.` : `هل تريد حذف المدينة ${page.deleteCity.name} نهائيًا؟ لا يمكن التراجع بعد تنفيذ الحذف.`} busy={page.busyCityId === page.deleteCity.id} action={page.deleteCity.deletionMode === "archive" ? "archive" : "delete"} onCancel={() => page.setDeleteCity(null)} onConfirm={page.confirmDeleteCity} /> : null}
      {page.selectedCityForAreas ? <DeliveryAreasDialog city={page.selectedCityForAreas} areas={page.deliveryAreas} loading={page.areasLoading} loadError={page.areasError} onClose={page.closeDeliveryAreas} onReload={page.reloadSelectedAreas} /> : null}
    </div>
  );
}
