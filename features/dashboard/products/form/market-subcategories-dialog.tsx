"use client";

import { ArrowDown, ArrowUp, Layers3, LoaderCircle, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { StoreSubcategoriesManager } from "../../components/store-subcategories-manager";
import { Button } from "../../primitives";
import {
  loadStoreSubcategories,
  saveMarketSubcategories,
  type StoreSubcategory,
} from "../../store-subcategories-api";
import type { CatalogMarket } from "./types";

export function MarketSubcategoriesDialog({ market, onClose, onSaved }: {
  market: CatalogMarket;
  onClose: () => void;
  onSaved: (items: StoreSubcategory[]) => void;
}) {
  const { apiFetch } = useAuth();
  const initialItems = useMemo(
    () => [...market.subcategories].sort(
      (first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0),
    ),
    [market.subcategories],
  );
  const [items, setItems] = useState<StoreSubcategory[]>(initialItems);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialItems.map((item) => item.id));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const loaded = await loadStoreSubcategories(apiFetch);
        if (!active) return;
        const byId = new Map(loaded.map((item) => [item.id, item]));
        for (const item of initialItems) {
          if (!byId.has(item.id)) byId.set(item.id, item);
        }
        setItems(Array.from(byId.values()));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "تعذر تحميل أقسام المنتجات.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [apiFetch, initialItems]);

  const visibleItems = items.filter((item) => item.is_active || selectedIds.includes(item.id));

  function toggle(id: number) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
    setError("");
  }

  function move(id: number, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function handleItemsChange(nextItems: StoreSubcategory[]) {
    const previousIds = new Set(items.map((item) => item.id));
    const created = nextItems.find((item) => !previousIds.has(item.id) && item.is_active);
    const nextIds = new Set(nextItems.map((item) => item.id));
    setItems(nextItems);
    setSelectedIds((current) => {
      const retained = current.filter((id) => nextIds.has(id));
      return created && !retained.includes(created.id) ? [...retained, created.id] : retained;
    });
  }

  async function save() {
    if (!selectedIds.length) return setError("اختر قسمًا واحدًا على الأقل للمحل.");
    setSaving(true);
    setError("");
    try {
      onSaved(await saveMarketSubcategories(apiFetch, market.id, selectedIds));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ أقسام المحل.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="market-subcategories-title" className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b bg-muted/20 px-5 py-4">
          <div><h2 id="market-subcategories-title" className="text-xl font-bold">إعداد أقسام {market.name}</h2><p className="mt-1 text-sm text-muted-foreground">اختر الأقسام التي ستُنظم منتجات هذا المحل ورتب ظهورها.</p></div>
          <button type="button" onClick={onClose} className="rounded-full border p-2 hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold">الأقسام المتاحة</h3><p className="text-xs text-muted-foreground">يمكن استخدام القسم نفسه في أكثر من محل.</p></div>
            <Button type="button" size="sm" variant="outline" onClick={() => setManagerOpen(true)}><Plus className="size-4" />إنشاء أو تعديل قسم</Button>
          </div>

          {loading ? <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />جاري تحميل الأقسام...</div> : visibleItems.length ? (
            <div className="flex flex-wrap gap-2">{visibleItems.map((item) => {
              const selected = selectedIds.includes(item.id);
              return <button key={item.id} type="button" disabled={!item.is_active && !selected} onClick={() => toggle(item.id)} className={cn("rounded-full border px-3 py-2 text-sm font-bold transition", selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent", !item.is_active && "border-dashed text-muted-foreground")}>{item.name_ar}{!item.is_active ? " (معطل)" : ""}</button>;
            })}</div>
          ) : <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center"><Layers3 className="size-8 text-primary" /><p className="mt-3 font-bold">لا توجد أقسام منتجات حتى الآن</p><p className="mt-1 text-sm text-muted-foreground">أنشئ أول قسم مثل وجبات أو مشروبات ثم اربطه بالمحل.</p><Button type="button" size="sm" className="mt-4" onClick={() => setManagerOpen(true)}><Plus className="size-4" />إنشاء أول قسم</Button></div>}

          {selectedIds.length ? <div className="mt-5 grid gap-2"><h3 className="text-sm font-bold">ترتيب الأقسام داخل المحل</h3>{selectedIds.map((id, index) => {
            const item = items.find((candidate) => candidate.id === id);
            if (!item) return null;
            return <div key={id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"><span className="font-bold">{index + 1}. {item.name_ar}</span><span className="flex gap-1"><Button type="button" size="icon" variant="outline" disabled={index === 0} onClick={() => move(id, -1)} aria-label="تحريك لأعلى"><ArrowUp className="size-3.5" /></Button><Button type="button" size="icon" variant="outline" disabled={index === selectedIds.length - 1} onClick={() => move(id, 1)} aria-label="تحريك لأسفل"><ArrowDown className="size-3.5" /></Button></span></div>;
          })}</div> : null}

          {error ? <p className="mt-4 whitespace-pre-line text-sm text-destructive">{error}</p> : null}
        </div>

        <footer className="flex justify-end gap-2 border-t bg-background px-5 py-3"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" disabled={loading || saving || !selectedIds.length} onClick={() => void save()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Layers3 className="size-4" />}{saving ? "جاري الحفظ..." : "حفظ أقسام المحل"}</Button></footer>
      </section>
    </div>
    {managerOpen ? <StoreSubcategoriesManager items={items} onChange={handleItemsChange} onClose={() => setManagerOpen(false)} /> : null}
  </>;
}
