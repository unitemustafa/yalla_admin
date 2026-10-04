"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Save, Truck, X } from "lucide-react";

import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
import { isValidEmail, passwordRules } from "../users/account-fields";
import type { ServiceCity } from "../cities/types";
import { Button, Field, Input, Switch } from "../primitives";
import type { ShippingCompany, ShippingCompanyDraft } from "./types";

export function ShippingCompanyFormDialog({ company, onClose, onSave }: {
  company?: ShippingCompany;
  cities: ServiceCity[];
  onClose: () => void;
  onSave: (draft: ShippingCompanyDraft) => Promise<boolean>;
}) {
  const [name, setName] = useState(company?.name ?? "");
  const [email, setEmail] = useState(company?.email ?? "");
  const [password, setPassword] = useState("");
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

  async function selectLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("نوع اللوجو غير مدعوم. استخدم JPG أو PNG أو WEBP.");
      return;
    }
    const dimensionError = await validateImageUpload(selected, mediaSpecs.shippingLogo);
    if (dimensionError) {
      setError(dimensionError);
      return;
    }
    const compressed = selected;
    if (compressed.size > 5 * 1024 * 1024) {
      setError("الصورة الأصلية أكبر من الحد المسموح (5MB). اختر صورة أصغر.");
      return;
    }
    setLogoFile(compressed);
    setRemoveLogo(false);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError("اسم شركة الشحن مطلوب.");
    if (!isValidEmail(email.trim())) return setError("اكتب بريدًا إلكترونيًا صحيحًا لتسجيل الدخول.");
    if ((!company?.courierAccountId || password) && passwordRules(password).some((rule) => !rule.done)) {
      return setError("كلمة المرور 8 أحرف على الأقل وبها حرف كبير ورقم ورمز خاص.");
    }
    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      return setError("حجم اللوجو يجب ألا يتجاوز 5MB.");
    }
    setSaving(true);
    setError(null);
    const saved = await onSave({
      name,
      email,
      password,
      cityIds: [],
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
          <div><h2 className="text-xl font-bold">{company ? "تعديل شركة الشحن" : "إضافة شركة شحن"}</h2><p className="mt-1 text-sm text-muted-foreground">حدد بيانات الشركة وحساب تسجيل الدخول في تطبيق المندوب.</p></div>
          <button type="button" onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-full border"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="flex size-32 items-center justify-center overflow-hidden rounded-xl border bg-muted/25">
                {previewUrl ? <img src={previewUrl} alt="معاينة لوجو شركة الشحن" className="size-full object-contain p-2" /> : <Truck className="size-10 text-muted-foreground" />}
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-accent"><ImagePlus className="size-4" />اختيار لوجو<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectLogo(event)} /></label>
              <p className="text-[10px] leading-4 text-muted-foreground">{mediaSpecHint(mediaSpecs.shippingLogo)}</p>
              {(company?.logoUrl || logoFile) && !removeLogo ? <button type="button" className="block text-xs font-semibold text-destructive" onClick={() => { setLogoFile(null); setRemoveLogo(true); }}>إزالة اللوجو</button> : null}
            </div>
            <div className="space-y-4">
              <Field label="اسم شركة الشحن *"><Input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(null); }} placeholder="مثال: أرامكس" /></Field>
              <Field label="البريد الإلكتروني *"><Input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" /></Field>
              <Field label={company?.courierAccountId ? "كلمة المرور الجديدة" : "كلمة المرور *"}><Input required={!company?.courierAccountId} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" /><p className="mt-1 text-xs text-muted-foreground">{company?.courierAccountId ? "اختياري — اتركه فارغًا للاحتفاظ بكلمة المرور الحالية." : "8 أحرف على الأقل، وحرف كبير ورقم ورمز خاص."}</p></Field>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3"><div><div className="font-semibold">حالة الشركة</div><div className="text-xs text-muted-foreground">الشركات المعطلة لا تظهر للعميل.</div></div><Switch checked={active} onCheckedChange={setActive} /></div>
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
            <div>مدينة التشغيل: <strong>كل المدن</strong></div>
            <div>نوع المركبة: <strong>شركة شحن</strong></div>
            <div>الحد الأقصى للطلبات: <strong>غير محدود</strong></div>
            <div>رقم اللوحة: <strong>شركة شحن</strong></div>
          </div>
          {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : <><Save className="size-4" />حفظ الشركة</>}</Button></div>
        </form>
      </section>
    </div>
  );
}
