"use client";

import { Archive, ArchiveRestore, Edit3, Trash2 } from "lucide-react";

import type { ServiceCity } from "../cities/types";
import { DashboardImage } from "../dashboard-image";
import { PageLoadError, PageLoadingState } from "../load-error-card";
import { Badge, DataTable, Switch } from "../primitives";
import { classificationLabel, marketCityNames } from "./domain";
import type { Market } from "./types";

function MarketLocationsCell({ market, serviceCities }: { market: Market; serviceCities: ServiceCity[] }) {
  if (market.scope === "general") return <div className="grid gap-1 text-sm text-muted-foreground"><p><span className="font-semibold text-foreground">المدن: </span>عام</p></div>;
  const names = marketCityNames(market, serviceCities);
  return <div className="grid gap-1 text-sm text-muted-foreground"><p><span className="font-semibold text-foreground">المدن: </span>{names.length ? names.join("، ") : "لا توجد مدن محددة"}</p></div>;
}

function ActionButton({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-accent ${danger ? "border-destructive/35 text-destructive hover:bg-destructive/10" : "border-border text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}

export function MarketsTable({ markets, serviceCities, archived, loading, error, onReload, onEdit, onDelete, onRestore, onToggle }: {
  markets: Market[];
  serviceCities: ServiceCity[];
  archived: boolean;
  loading: boolean;
  error: string;
  onReload: () => void;
  onEdit: (market: Market) => void;
  onDelete: (market: Market) => void;
  onRestore: (market: Market) => void;
  onToggle: (market: Market, active: boolean) => void;
}) {
  if (loading) return <PageLoadingState />;
  if (error) return <PageLoadError onRetry={onReload} />;
  return <DataTable minWidth={1060} columnWidths={[80, 310, 170, 280, 245]} headers={["", "المحل", "الفئة", "المدن", ""]} rows={markets.map((market, index) => [
    <span key="index" className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{index + 1}</span>,
    <div key="name" className="flex min-w-0 items-center gap-2.5 py-1"><DashboardImage src={market.image} placeholderType="store" alt="صورة المتجر" width={52} height={52} sizes="52px" className="size-13 shrink-0 rounded-md border bg-muted/35 shadow-sm" imageClassName="object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{market.name}</p><span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold ${archived ? "border-blue-400/30 bg-blue-500/15 text-blue-700 dark:text-blue-200" : market.status === "active" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>{archived ? "مؤرشف" : market.status === "active" ? "مفعلة" : "معطلة"}</span>{market.is_popular ? <span className="inline-flex rounded-md border border-primary/35 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">شائع</span> : null}</div><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{market.description || "لا يوجد وصف للمحل."}</p></div></div>,
    <Badge key="classification">{classificationLabel(market)}</Badge>,
    <MarketLocationsCell key="locations" market={market} serviceCities={serviceCities} />,
    <div key="actions" className="flex min-w-[225px] items-center justify-end gap-2">{archived ? <button type="button" aria-label={`استعادة ${market.name}`} title={`استعادة ${market.name}`} onClick={() => onRestore(market)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-500/35 px-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/10"><ArchiveRestore className="size-4" />استعادة</button> : <><div className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold"><span>{market.status === "active" ? "مفعلة" : "معطلة"}</span><Switch checked={market.status === "active"} onCheckedChange={(checked) => onToggle(market, checked)} aria-label={`تفعيل المحل ${market.name}`} /></div><ActionButton label={`تعديل ${market.name}`} onClick={() => onEdit(market)}><Edit3 className="size-4" /></ActionButton><ActionButton danger label={market.deletion_mode === "archive" ? `أرشفة ${market.name}` : `حذف ${market.name} نهائيًا`} onClick={() => onDelete(market)}>{market.deletion_mode === "archive" ? <Archive className="size-4" /> : <Trash2 className="size-4" />}</ActionButton></>}</div>,
  ])} />;
}
