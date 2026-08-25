"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Save, Truck, X } from "lucide-react";

import { compressImageUpload } from "@/lib/image-upload";
import type { ServiceCity } from "../cities/types";
import { Button, Field, Input, Switch } from "../primitives";
import type { ShippingCompany, ShippingCompanyDraft } from "./types";

export function ShippingCompanyFormDialog({ company, cities, onClose, onSave }: {
  company?: ShippingCompany;
  cities: ServiceCity[];
  onClose: () => void;
  onSave: (draft: ShippingCompanyDraft) => Promise<boolean>;
}) {
  const [name, setName] = useState(company?.name ?? "");
  const [cityIds, setCityIds] = useState<string[]>(
    company?.cityIds.filter((id) =>
      cities.some((city) => String(city.id) === id && city.is_active !== false),
    ) ?? [],
  );
  const [active, setActive] = useState(company?.status !== "inactive");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewUrl = useMemo(
    () => logoFile ? URL.createObjectURL(logoFile) : removeLogo ? null : company?.logoUrl ?? null,
    [company?.logoUrl, logoFile, removeLogo],
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function toggleCity(id: string) {
    setCityIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
    setError(null);
  }

  async function selectLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("نوع اللوجو غير مدعوم. استخدم JPG أو PNG أو WEBP.");
      return;
    }
    const compressed = await compressImageUpload(selected);
    if (compressed.size > 5 * 1024 * 1024) {
      setError("تعذر ضغط اللوجو إلى الحد المسموح (5MB). اختر صورة أصغر.");
      return;
    }
    setLogoFile(compressed);
    setRemoveLogo(false);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError("اسم شركة الشحن مطلوب.");
    if (!cityIds.length) return setError("اختر مدينة واحدة على الأقل.");
    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      return setError("حجم اللوجو يجب ألا يتجاوز 5MB.");
    }
    setSaving(true);
    setError(null);
    const saved = await onSave({
      name,
      cityIds,
      status: active ? "active" : "inactive",
      logoFile,
      removeLogo,
    });
    setSaving(false);
    if (saved) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" className="w-full max-w-2xl overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5">
          <div><h2 className="text-xl font-bold">{company ? "تعديل شركة الشحن" : "إضافة شركة شحن"}</h2><p className="mt-1 text-sm text-muted-foreground">حدد بيانات الشركة والمدن التي تخدمها.</p></div>
          <button type="button" onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-full border"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="flex size-32 items-center justify-center overflow-hidden rounded-xl border bg-muted/25">
                {previewUrl ? <img src={previewUrl} alt="معاينة لوجو شركة الشحن" className="size-full object-contain p-2" /> : <Truck className="size-10 text-muted-foreground" />}
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-accent"><ImagePlus className="size-4" />اختيار لوجو<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectLogo(event)} /></label>
              {(company?.logoUrl || logoFile) && !removeLogo ? <button type="button" className="block text-xs font-semibold text-destructive" onClick={() => { setLogoFile(null); setRemoveLogo(true); }}>إزالة اللوجو</button> : null}
            </div>
            <div className="space-y-4">
              <Field label="اسم شركة الشحن *"><Input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(null); }} placeholder="مثال: أرامكس" /></Field>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3"><div><div className="font-semibold">حالة الشركة</div><div className="text-xs text-muted-foreground">الشركات المعطلة لا تظهر للعميل.</div></div><Switch checked={active} onCheckedChange={setActive} /></div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-semibold">مدن الخدمة *</div>
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
              {cities.filter((city) => city.is_active !== false).map((city) => {
                const id = String(city.id);
                return <label key={id} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/40"><input type="checkbox" checked={cityIds.includes(id)} onChange={() => toggleCity(id)} className="size-4 accent-primary" /><span className="font-medium">{city.name}</span></label>;
              })}
              {!cities.some((city) => city.is_active !== false) ? <p className="text-sm text-muted-foreground">لا توجد مدن مفعلة. أضف مدينة أولًا.</p> : null}
            </div>
          </div>
          {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : <><Save className="size-4" />حفظ الشركة</>}</Button></div>
        </form>
      </section>
    </div>
  );
}
