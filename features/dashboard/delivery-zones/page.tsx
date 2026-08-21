"use client";

import { BadgeCheck, CheckCircle2, DollarSign, MapPin, Plus, RefreshCw, Search, Settings2, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { PageLoadError } from "../load-error-card";
import { AppSelect, Button, Card, CurrencyText, Input, PageTitle, Pagination } from "../primitives";
import { formatDeliveryCurrency } from "./domain";
import { MissingServiceCitiesDialog, ZoneFormDialog } from "./dialogs";
import { useDeliveryZonesPage } from "./use-delivery-zones-page";
import { ZonesTable } from "./zones-table";

export function DeliveryZonesPage({ initialArchived = false }: { initialArchived?: boolean } = {}) {
  const page = useDeliveryZonesPage(initialArchived);
  const metrics = [
    ["إجمالي المناطق", String(page.metrics.count), MapPin, "text-primary"],
    ["أقل سعر", formatDeliveryCurrency(page.metrics.lowestPrice), DollarSign, "text-green-500"],
    ["أعلى سعر", formatDeliveryCurrency(page.metrics.highestPrice), CheckCircle2, "text-blue-500"],
  ] as const;

  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle title={initialArchived ? "مناطق التوصيل المؤرشفة" : "مناطق التوصيل"} description={initialArchived ? "استعراض مناطق التوصيل المؤرشفة واستعادتها عند الحاجة." : "إدارة المناطق وقواعد التسعير وحدود التوصيل من مكان واحد."} size="compact" actions={<div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => void page.loadZones()} disabled={page.loading}><RefreshCw className={cn("size-4", page.loading && "animate-spin")} />تحديث</Button>{!initialArchived ? <Button onClick={page.startCreatingZone} disabled={page.citiesLoading || Boolean(page.citiesError)}><Plus className="size-4" />منطقة جديدة</Button> : null}</div>} />

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {metrics.map(([label, value, Icon, tone]) => <Card key={label} className="h-[75px] rounded-xl"><div className="flex h-full items-center gap-3 px-6"><div className={cn("rounded-full bg-muted/50 p-3", tone)}><Icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><CurrencyText className="block text-xl font-semibold leading-tight">{value}</CurrencyText></div></div></Card>)}
      </div>

      {!initialArchived ? <div className="mt-6 flex flex-wrap gap-2 rounded-lg border bg-card p-2">
        {([[
          "المناطق الحالية",
          Truck,
          false,
        ], [
          "إعدادات التسعير العام",
          Settings2,
          true,
        ], [
          "اختبار سعر التوصيل",
          BadgeCheck,
          true,
        ]] as const satisfies ReadonlyArray<readonly [string, typeof Truck, boolean]>).map(([label, Icon, disabled]) => (
          <button key={label} type="button" aria-disabled={disabled} disabled={disabled} title={disabled ? "غير متاح حالياً" : undefined} className={cn("inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition", disabled ? "cursor-not-allowed text-muted-foreground/45 opacity-60" : "bg-primary text-primary-foreground shadow-sm")}><Icon className="size-4" />{label}</button>
        ))}
      </div> : null}

      <section className="mt-6">
        <div className="grid gap-4 rounded-lg border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(320px,460px)] xl:items-end">
          <div><h2 className="font-semibold">{initialArchived ? "مناطق التوصيل المؤرشفة" : "كل مناطق التوصيل"}</h2><p className="text-xs text-muted-foreground">{initialArchived ? "ابحث في المناطق المؤرشفة واستعد ما تحتاجه." : "ابحث وراجع الحالة والتسعير لكل منطقة."}</p></div>
          <div className="min-w-0"><AppSelect value={page.selectedCityId} onValueChange={(value) => { page.setSelectedCityId(value); page.setCurrentPage(1); }} options={page.cityFilterOptions} ariaLabel="فلتر المدينة" disabled={page.citiesLoading || Boolean(page.citiesError)} className="h-11 bg-background" dir="rtl" />{page.citiesLoading ? <p className="mt-1 text-xs text-muted-foreground">جاري تحميل المدن...</p> : page.citiesError ? <p className="mt-1 text-xs font-medium text-destructive">{page.citiesError}</p> : null}</div>
          <div className="relative w-full min-w-0"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 border-border/70 bg-muted/20 ps-9 placeholder:text-muted-foreground/60" value={page.searchQuery} onChange={(event) => { page.setSearchQuery(event.target.value); page.setCurrentPage(1); }} placeholder="البحث عن منطقة" /></div>
        </div>

        {page.loading ? <div className="mt-4 grid gap-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-md border bg-muted/30" />)}</div> : page.loadError ? <PageLoadError className="mt-4 min-h-70" onRetry={() => void page.loadZones()} /> : <>
          <div className="mt-4"><ZonesTable zones={page.pagedZones} cities={page.cities} startIndex={page.pageStartIndex} archived={initialArchived} changingStatusId={page.changingStatusId} onEdit={page.setEditingZone} onDelete={page.setDeleteZone} onRestore={(zone) => void page.restoreArchivedZone(zone)} onStatusChange={(zone, checked) => void page.changeStatus(zone, checked)} onCreate={page.startCreatingZone} /></div>
          <Pagination text={`عرض ${page.pagedZones.length} من ${page.filteredZones.length} نتيجة`} pages={`${page.currentPage} / ${page.totalPages}`} previousDisabled={page.currentPage === 1} nextDisabled={page.currentPage === page.totalPages} onPrevious={() => page.setCurrentPage((value) => Math.max(1, Math.min(value, page.totalPages) - 1))} onNext={() => page.setCurrentPage((value) => Math.min(page.totalPages, Math.min(value, page.totalPages) + 1))} />
        </>}
      </section>

      {page.creating ? <ZoneFormDialog cities={page.cities} onClose={() => page.setCreating(false)} onSave={(zone) => void page.saveZone(zone)} /> : null}
      {page.editingZone ? <ZoneFormDialog zone={page.editingZone} cities={page.cities} onClose={() => page.setEditingZone(null)} onSave={(zone) => void page.saveZone(zone)} /> : null}
      {page.missingServiceCities ? <MissingServiceCitiesDialog onClose={() => page.setMissingServiceCities(false)} /> : null}
      {page.deleteZone ? <ConfirmDeleteDialog title={page.deleteZone.deletionMode === "archive" ? "أرشفة منطقة التوصيل" : "حذف منطقة التوصيل نهائيًا"} description={page.deleteZone.deletionMode === "archive" ? `منطقة ${page.deleteZone.name} مرتبطة بسجلات سابقة؛ سيتم إخفاؤها وأرشفتها وتعطيلها مع إمكانية استعادتها.` : `هل تريد حذف منطقة التوصيل ${page.deleteZone.name} نهائيًا؟ لا يمكن التراجع بعد تنفيذ الحذف.`} busy={page.deletingZoneId === page.deleteZone.id} action={page.deleteZone.deletionMode === "archive" ? "archive" : "delete"} onCancel={() => page.setDeleteZone(null)} onConfirm={page.confirmDeleteZone} /> : null}
    </div>
  );
}
