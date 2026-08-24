"use client";

import { Layers3, MapPin, Plus, RefreshCw, Search, Store } from "lucide-react";

import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { Button, Card, Input, PageTitle } from "../primitives";
import { marketServiceCityIds } from "./domain";
import { MarketDialog } from "./market-dialog";
import { MarketsTable } from "./markets-table";
import { MissingClassificationsDialog } from "./missing-classifications-dialog";
import { useMarketsPage } from "./use-markets-page";

export function ShopsPage({ initialArchived = false }: { initialArchived?: boolean } = {}) {
  const page = useMarketsPage(initialArchived);
  const hasActiveSubcategory = page.subcategories.some((item) => item.is_active);
  const metrics = [
    ["إجمالي المحلات", page.markets.length, Store],
    ["المحلات النشطة", page.markets.filter((item) => item.status === "active").length, Store],
    ["مدن الظهور", new Set(page.markets.flatMap(marketServiceCityIds)).size, MapPin],
  ] as const;

  return (
    <div className="px-6 py-6">
      <PageTitle title={initialArchived ? "المحلات المؤرشفة" : "المحلات"} description={initialArchived ? "استعراض المحلات المؤرشفة واستعادتها عند الحاجة." : "إدارة المحلات وربط ظهور منتجاتها بالمدن."} actions={<div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" className="h-9 px-4 text-sm" onClick={() => void page.load()} disabled={page.loading}><RefreshCw className={`size-4 ${page.loading ? "animate-spin" : ""}`} />تحديث</Button>{!initialArchived ? <Button className="h-9 px-4 text-sm" onClick={() => page.setDialogMarket(null)} disabled={!hasActiveSubcategory}><Plus className="size-4" />إضافة محل</Button> : null}</div>} />
      <div className="mt-6 grid gap-3 md:grid-cols-3">{metrics.map(([label, value, Icon]) => <Card key={label} className="h-20"><div className="flex h-full items-center gap-3 px-5"><span className="rounded-full bg-primary/10 p-3 text-primary"><Icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div></div></Card>)}</div>

      {!page.loading && !page.error && page.markets.length === 0 ? (
        <Card className="mt-6 flex min-h-105 items-center justify-center bg-card shadow">
          <div className="mx-auto flex w-full max-w-130 flex-col items-center px-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"><Store className="size-8" /></div>
            <h2 className="mt-6 text-xl font-semibold leading-7">{initialArchived ? "لا توجد محلات مؤرشفة" : "لا توجد محلات حتى الآن"}</h2>
            <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">{initialArchived ? "المحلات التي تتم أرشفتها ستظهر هنا ويمكن استعادتها." : "سيظهر هنا أول محل تنشئه وتربطه بمدن الظهور."}</p>
            {!initialArchived ? <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row"><Button type="button" className="h-10 px-4" onClick={() => page.setDialogMarket(null)} disabled={!hasActiveSubcategory}>{hasActiveSubcategory ? <Plus className="size-4" /> : <Layers3 className="size-4" />}{hasActiveSubcategory ? "إنشاء أول محل" : "أنشئ أقسام المنتجات من قسم المنتجات أولًا"}</Button></div> : null}
          </div>
        </Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">كل المحلات</h2><p className="text-xs text-muted-foreground">المنتجات ترث نطاق الظهور من المحل.</p></div><div className="relative w-full sm:w-175"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={page.query} onChange={(event) => page.setQuery(event.target.value)} className="h-11 ps-9" placeholder="ابحث عن محل..." /></div></div>
          <MarketsTable markets={page.filteredMarkets} serviceCities={page.serviceCities} archived={initialArchived} loading={page.loading} error={page.error} onReload={() => void page.load()} onEdit={page.setDialogMarket} onDelete={page.setDeleteCandidate} onRestore={(market) => void page.restoreArchivedMarket(market)} onToggle={(market, active) => void page.toggleMarketActive(market, active)} />
        </Card>
      )}

      {page.deleteCandidate ? <ConfirmDeleteDialog title={page.deleteCandidate.deletion_mode === "archive" ? "أرشفة المحل" : "حذف المحل نهائيًا"} description={page.deleteCandidate.deletion_mode === "archive" ? `المحل ${page.deleteCandidate.name} مرتبط بسجلات سابقة؛ سيتم إخفاؤه وأرشفته وتعطيله مع إمكانية استعادته.` : `هل تريد حذف المحل ${page.deleteCandidate.name} نهائيًا؟ لا يمكن التراجع بعد تنفيذ الحذف.`} busy={false} action={page.deleteCandidate.deletion_mode === "archive" ? "archive" : "delete"} onCancel={() => page.setDeleteCandidate(null)} onConfirm={() => { if (page.deleteCandidate) page.remove(page.deleteCandidate); }} /> : null}
      {page.dialogMarket !== undefined ? page.classifications.length ? <MarketDialog market={page.dialogMarket ?? undefined} serviceCities={page.serviceCities} serviceCitiesLoading={page.serviceCitiesLoading} serviceCitiesError={page.serviceCitiesError} classifications={page.classifications} subcategories={page.subcategories} marketTypes={page.marketTypes} onReloadServiceCities={() => void page.loadServiceCityOptions()} onClose={() => page.setDialogMarket(undefined)} onSaved={page.savedMarket} /> : <MissingClassificationsDialog onClose={() => page.setDialogMarket(undefined)} /> : null}
    </div>
  );
}
