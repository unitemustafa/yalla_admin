"use client";

import { useEffect, useState } from "react";
import { Edit3, ImagePlus, LoaderCircle, Plus, Trash2, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { DashboardImage } from "../dashboard-image";
import { Button, Input, Switch } from "../primitives";
import {
  deleteStoreSubcategory,
  saveStoreSubcategory,
  type StoreSubcategory,
} from "../store-subcategories-api";

type Draft = {
  id?: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  is_active: boolean;
  image: string | null;
};

const emptyDraft: Draft = {
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  is_active: true,
  image: null,
};

export function StoreSubcategoriesManager({
  items,
  onChange,
  onClose,
}: {
  items: StoreSubcategory[];
  onChange: (items: StoreSubcategory[]) => void;
  onClose: () => void;
}) {
  const { apiFetch } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function edit(item: StoreSubcategory) {
    setDraft(item);
    setImageFile(null);
    setImagePreview(item.image ?? "");
    setError("");
  }

  function reset() {
    setDraft(emptyDraft);
    setImageFile(null);
    setImagePreview("");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name_ar.trim() || !draft.name_en.trim()) {
      setError("الاسم بالعربية والإنجليزية مطلوبان.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveStoreSubcategory(apiFetch, {
        ...draft,
        name_ar: draft.name_ar.trim(),
        name_en: draft.name_en.trim(),
        description_ar: draft.description_ar.trim(),
        description_en: draft.description_en.trim(),
        image: imageFile,
      });
      onChange(
        items.some((item) => item.id === saved.id)
          ? items.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...items],
      );
      reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الفئة.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: StoreSubcategory) {
    if (!window.confirm(`هل تريد حذف فئة «${item.name_ar}»؟`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteStoreSubcategory(apiFetch, item.id);
      onChange(items.filter((candidate) => candidate.id !== item.id));
      if (draft.id === item.id) reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف الفئة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" className="flex h-[min(860px,calc(100dvh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b bg-muted/20 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">إدارة الفئات الداخلية</h2>
            <p className="mt-1 text-sm text-muted-foreground">مكتبة مشتركة للمحلات، مع أعداد المحلات والمنتجات المرتبطة.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border p-2 hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[390px_minmax(0,1fr)]">
          <form onSubmit={submit} className="grid content-start gap-4 border-b p-5 lg:border-b-0 lg:border-e">
            <h3 className="font-bold">{draft.id ? "تعديل الفئة" : "إنشاء فئة جديدة"}</h3>
            <label className="grid gap-2 text-sm font-semibold">الاسم بالعربية *<Input value={draft.name_ar} onChange={(event) => setDraft((value) => ({ ...value, name_ar: event.target.value }))} /></label>
            <label className="grid gap-2 text-sm font-semibold">الاسم بالإنجليزية *<Input dir="ltr" value={draft.name_en} onChange={(event) => setDraft((value) => ({ ...value, name_en: event.target.value }))} /></label>
            <label className="grid gap-2 text-sm font-semibold">الوصف بالعربية<textarea className="min-h-20 rounded-md border bg-input px-3 py-2 text-sm" value={draft.description_ar} onChange={(event) => setDraft((value) => ({ ...value, description_ar: event.target.value }))} /></label>
            <label className="grid gap-2 text-sm font-semibold">الوصف بالإنجليزية<textarea dir="ltr" className="min-h-20 rounded-md border bg-input px-3 py-2 text-sm" value={draft.description_en} onChange={(event) => setDraft((value) => ({ ...value, description_en: event.target.value }))} /></label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold">الفئة نشطة<Switch checked={draft.is_active} onCheckedChange={(checked) => setDraft((value) => ({ ...value, is_active: checked }))} /></label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm">
              {imagePreview ? <DashboardImage src={imagePreview} alt="" width={56} height={56} className="size-14 rounded-md" imageClassName="object-cover" /> : <ImagePlus className="size-6 text-primary" />}
              <span>{imageFile?.name || "اختيار صورة اختيارية"}</span>
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }} />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}حفظ الفئة</Button>
              {draft.id ? <Button type="button" variant="outline" onClick={reset}>إلغاء التعديل</Button> : null}
            </div>
          </form>
          <div className="min-w-0 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
                  <DashboardImage src={item.image} alt="" width={56} height={56} className="size-14 shrink-0 rounded-md bg-muted" imageClassName="object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate font-bold">{item.name_ar}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.is_active ? "نشطة" : "معطلة"}</span></div>
                    <p dir="ltr" className="truncate text-xs text-muted-foreground">{item.name_en}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.market_count} محل · {item.product_count} منتج</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="icon" variant="outline" onClick={() => edit(item)} aria-label="تعديل"><Edit3 className="size-4" /></Button>
                    <Button type="button" size="icon" variant="outline" disabled={busy} onClick={() => void remove(item)} aria-label="حذف"><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </article>
              ))}
              {!items.length ? <p className="text-sm text-muted-foreground">لا توجد فئات داخلية بعد.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
