"use client";

import { useEffect } from "react";
import { AlertCircle, LoaderCircle, MapPin, Plus, RefreshCw, X } from "lucide-react";

import { Badge, Button } from "../primitives";
import { formatCityMoney } from "./domain";
import type { DeliveryArea, ServiceCity } from "./types";

export function DeliveryAreasDialog({ city, areas, loading, loadError, onClose, onReload }: {
  city: ServiceCity;
  areas: DeliveryArea[];
  loading: boolean;
  loadError: string | null;
  onClose: () => void;
  onReload: () => void;
}) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="delivery-areas-dialog-title" className="max-h-[88vh] w-full max-w-235 overflow-y-auto rounded-xl border bg-background shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-background px-6 py-5">
          <div><h2 id="delivery-areas-dialog-title" className="text-xl font-bold">مناطق التوصيل - {city.name}</h2><p className="mt-1 text-sm text-muted-foreground">إدارة المناطق والأسعار الثابتة داخل هذه المدينة فقط.</p></div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onReload} disabled={loading}><RefreshCw className="size-4" />تحديث</Button>
            <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full border p-2 hover:bg-accent"><X className="size-4" /></button>
          </div>
        </div>
        <div className="grid gap-4 p-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border bg-muted/10 text-sm text-muted-foreground"><LoaderCircle className="me-2 size-5 animate-spin" />جاري تحميل مناطق التوصيل...</div>
          ) : loadError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border px-6 text-center"><AlertCircle className="size-8 text-destructive" /><p className="text-sm">{loadError}</p><Button type="button" variant="outline" onClick={onReload}>إعادة المحاولة</Button></div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-170 text-sm">
                <colgroup><col className="w-55" /><col className="w-45" /><col className="w-30" /></colgroup>
                <thead><tr className="border-b bg-muted/35 text-xs text-muted-foreground"><th className="px-4 py-3 text-start">اسم المنطقة</th><th className="px-4 py-3 text-start">سعر التوصيل</th><th className="px-4 py-3 text-start">الحالة</th></tr></thead>
                <tbody>
                  {areas.length === 0 ? (
                    <tr><td colSpan={3} className="p-0"><div className="flex min-h-48 flex-col items-center justify-center gap-2 bg-muted/10 px-4 text-center"><MapPin className="size-8 text-muted-foreground" /><p className="font-semibold">لا توجد مناطق توصيل لهذه المدينة</p><p className="text-sm text-muted-foreground">أضف منطقة توصيل ثابتة السعر.</p><Button type="button" className="mt-1" onClick={() => { window.location.href = "/delivery-zone"; }}><Plus className="size-4" />أضف أول منطقة توصيل</Button></div></td></tr>
                  ) : areas.map((area) => (
                    <tr key={area.id} className="border-b last:border-0"><td className="px-4 py-4 font-semibold">{area.name}</td><td className="px-4 py-4">{formatCityMoney(area.delivery_price)}</td><td className="px-4 py-4"><Badge tone={area.is_active ? "green" : "red"}>{area.is_active ? "مفعلة" : "معطلة"}</Badge></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
